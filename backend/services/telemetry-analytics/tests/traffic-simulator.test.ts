import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TrafficSimulator } from '../src/infrastructure/simulator/traffic-simulator';
import type { UserRepository } from '../src/application/ports/user-repository';
import type { ABTestRepository } from '../src/application/ports/ab-test-repository';
import type { MetricsAggregator } from '../src/application/use-cases/metrics-aggregator';
import type { CohortOverlap } from '../src/domain/entities';
import { TELEMETRY_EVENT_TYPES, VARIANTS } from '../src/domain/entities';
import { APP_IDS } from '../src/domain/constants';

describe('RxJS Traffic Simulator Engine Specification', () => {
  let simulator: TrafficSimulator;
  let mockUserRepository: UserRepository;
  let mockABTestRepository: ABTestRepository;
  let mockMetricsAggregator: { pushEvent: ReturnType<typeof vi.fn> };
  let loggedMessages: string[] = [];

  const mockLogger = {
    info: (msg: string) => loggedMessages.push(msg),
    error: (msg: string) => loggedMessages.push(msg),
    warn: (msg: string) => loggedMessages.push(msg),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    loggedMessages = [];

    const mockUsers: CohortOverlap[] = [];

    for (let i = 1; i <= 900; i++) {
      mockUsers.push({ userId: `user-a-${i}`, appId: APP_IDS.PREMIUM_CALENDAR, appASubscribed: false, appBSubscribed: false });
    }
    for (let i = 1; i <= 900; i++) {
      mockUsers.push({ userId: `user-b-${i}`, appId: APP_IDS.FITNESS_TRACKER, appASubscribed: false, appBSubscribed: false });
    }
    for (let i = 1; i <= 200; i++) {
      mockUsers.push({ userId: `user-overlap-${i}`, appId: APP_IDS.PREMIUM_CALENDAR, appASubscribed: false, appBSubscribed: false });
      mockUsers.push({ userId: `user-overlap-${i}`, appId: APP_IDS.FITNESS_TRACKER, appASubscribed: false, appBSubscribed: false });
    }

    mockUserRepository = {
      getById: vi.fn(),
      getOverlapUsers: vi.fn().mockResolvedValue(mockUsers),
      updateSubscription: vi.fn().mockResolvedValue(undefined),
    };

    mockABTestRepository = {
      createActive: vi.fn(),
      getActiveByAppId: vi.fn().mockImplementation(async (appId: string) => {
        if (appId === APP_IDS.FITNESS_TRACKER) {
          return {
            id: 'ab-test-b',
            appId: APP_IDS.FITNESS_TRACKER,
            name: 'App B Minimalist test',
            sampleSizePercent: 10,
            isActive: true,
            status: 'running',
            createdAt: new Date(),
          };
        }
        return null;
      }),
    };

    mockMetricsAggregator = {
      pushEvent: vi.fn(),
    };

    simulator = new TrafficSimulator(
      mockUserRepository,
      mockABTestRepository,
      mockMetricsAggregator as unknown as MetricsAggregator,
      mockLogger
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Simulation Loop & Event Generation', () => {
    it('should load user cohort on initialization and generate actions periodically', async () => {
      await simulator.initialize();
      expect(mockUserRepository.getOverlapUsers).toHaveBeenCalledTimes(1);

      simulator.start();

      await vi.advanceTimersByTimeAsync(100);

      expect(mockMetricsAggregator.pushEvent).toHaveBeenCalled();
      const call = mockMetricsAggregator.pushEvent.mock.calls[0][0];
      expect(call.userId).toBeDefined();
      expect(call.appId).toBeDefined();
      expect(call.eventType).toMatch(/impression|click|purchase/);
      expect(call.variant).toMatch(/A|B/);

      expect(loggedMessages).toContain('Traffic simulator started with 2000 virtual users');
    });
  });

  describe('Probability Matrix & Cross-App Overlap Behavior', () => {
    it('should apply A/B test Variant B boost of +15% to conversion rates in App B', async () => {
      await simulator.initialize();

      const probA = simulator.calculateActionProbability('user-b-1', APP_IDS.FITNESS_TRACKER, TELEMETRY_EVENT_TYPES.PURCHASE, VARIANTS.A);
      const probB = simulator.calculateActionProbability('user-b-2', APP_IDS.FITNESS_TRACKER, TELEMETRY_EVENT_TYPES.PURCHASE, VARIANTS.B);

      expect(probB).toBeCloseTo(probA * 1.15, 5);
    });

    it('should apply +25% App A subscription boost to App B conversion rates for overlap users', async () => {
      await simulator.initialize();

      const userId = 'user-overlap-1';

      simulator.updateUserSubscriptionInCache(userId, APP_IDS.PREMIUM_CALENDAR, true);

      const probNoBoost = simulator.calculateActionProbability(userId, APP_IDS.FITNESS_TRACKER, TELEMETRY_EVENT_TYPES.CLICK, VARIANTS.A, false);
      const probWithBoost = simulator.calculateActionProbability(userId, APP_IDS.FITNESS_TRACKER, TELEMETRY_EVENT_TYPES.CLICK, VARIANTS.A, true);

      expect(probWithBoost).toBeCloseTo(probNoBoost * 1.25, 5);
    });

    it('should dynamically update subscription status in DB when user purchases App A', async () => {
      await simulator.initialize();

      const userId = 'user-overlap-5';

      await simulator.handleUserPurchase(userId, APP_IDS.PREMIUM_CALENDAR);

      expect(mockUserRepository.updateSubscription).toHaveBeenCalledWith(userId, APP_IDS.PREMIUM_CALENDAR, true);

      const probCached = simulator.calculateActionProbability(userId, APP_IDS.FITNESS_TRACKER, TELEMETRY_EVENT_TYPES.CLICK, VARIANTS.A);
      const probBaseline = simulator.calculateActionProbability('user-b-1', APP_IDS.FITNESS_TRACKER, TELEMETRY_EVENT_TYPES.CLICK, VARIANTS.A);
      expect(probCached).toBeCloseTo(probBaseline * 1.25, 5);
    });
  });
});
