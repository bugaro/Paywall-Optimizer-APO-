import { interval, Subscription } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import type { CohortOverlap, TelemetryEventType, Variant } from '../../domain/entities.ts';
import { TELEMETRY_EVENT_TYPES, VARIANTS } from '../../domain/entities.ts';
import { APP_IDS } from '../../domain/constants.ts';
import type { Logger } from '../../domain/types.ts';
import type { MetricsAggregator } from '../../application/use-cases/metrics-aggregator.ts';
import type { UserRepository } from '../../application/ports/user-repository.ts';
import type { ABTestRepository } from '../../application/ports/ab-test-repository.ts';
import { evaluateSegment } from '../../domain/segmentation.ts';
import client from 'prom-client';

const EVENT_LOOP_LAG_CHECK_INTERVAL_MS = 1000;
const TICK_INTERVAL_MS = 100;
const SIMULATION_CONCURRENCY_LIMIT = 5;

const BASE_DEFAULT_PROB = 0.1;
const BASE_IMPRESSION_PROB = 1.0;
const BASE_CLICK_PROB = 0.2;
const BASE_PURCHASE_PROB = 0.05;

const VARIANT_B_BOOST = 1.15;
const APP_A_SUBSCRIBED_BOOST = 1.25;
const APP_B_PURCHASE_DECAY = 0.4;

const generatedEventsCounter = new client.Counter({
  name: 'simulator_events_generated_total',
  help: 'Track generated telemetry events count',
  labelNames: ['app_id', 'event_type'],
});

const droppedEventsCounter = new client.Counter({
  name: 'simulator_events_dropped_total',
  help: 'Track telemetry events dropped due to downstream failure',
  labelNames: ['app_id', 'event_type'],
});

const eventLoopLagGauge = new client.Gauge({
  name: 'simulator_event_loop_lag_ms',
  help: 'Track simulator event-loop lag in milliseconds',
});

function fisherYatesShuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export class TrafficSimulator {
  private tickerSubscription?: Subscription;
  private running = false;
  private users: CohortOverlap[] = [];
  private userSubscriptions = new Map<string, Map<string, boolean>>();
  private userRepository: UserRepository;
  private abTestRepository: ABTestRepository;
  private metricsAggregator: MetricsAggregator;
  private logger: Logger;

  constructor(
    userRepository: UserRepository,
    abTestRepository: ABTestRepository,
    metricsAggregator: MetricsAggregator,
    logger: Logger = console
  ) {
    this.userRepository = userRepository;
    this.abTestRepository = abTestRepository;
    this.metricsAggregator = metricsAggregator;
    this.logger = logger;
  }

  public async initialize(): Promise<void> {
    this.users = await this.userRepository.getOverlapUsers();
    this.userSubscriptions.clear();
    for (const user of this.users) {
      if (!this.userSubscriptions.has(user.userId)) {
        this.userSubscriptions.set(user.userId, new Map<string, boolean>());
      }
      this.userSubscriptions.get(user.userId)!.set(user.appId, user.appASubscribed);
    }
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.logger.info(`Traffic simulator started with 2000 virtual users`);

    let lastTime = process.hrtime();
    const lagInterval = setInterval(() => {
      if (!this.running) {
        clearInterval(lagInterval);
        return;
      }
      const diff = process.hrtime(lastTime);
      const lagMs = (diff[0] * 1e9 + diff[1]) / 1e6 - EVENT_LOOP_LAG_CHECK_INTERVAL_MS;
      eventLoopLagGauge.set(Math.max(0, lagMs));
      lastTime = process.hrtime();
    }, EVENT_LOOP_LAG_CHECK_INTERVAL_MS);

    this.tickerSubscription = interval(TICK_INTERVAL_MS)
      .pipe(
        mergeMap(() => {
          const subset = this.getRandomSubset(1);
          const user = subset[0];
          return user ? this.simulateUserActions(user) : [];
        }, SIMULATION_CONCURRENCY_LIMIT)
      )
      .subscribe({
        error: (err) => {
          this.logger.error(`Simulator loop error: ${err instanceof Error ? err.message : String(err)}`);
        },
      });
  }

  public isRunning(): boolean {
    return this.running;
  }

  public stop(): void {
    if (this.tickerSubscription) {
      this.tickerSubscription.unsubscribe();
    }
    this.running = false;
  }

  public updateUserSubscriptionInCache(userId: string, appId: string, subscribed: boolean): void {
    if (!this.userSubscriptions.has(userId)) {
      this.userSubscriptions.set(userId, new Map<string, boolean>());
    }
    this.userSubscriptions.get(userId)!.set(appId, subscribed);

    const userMapping = this.users.find((u) => u.userId === userId && u.appId === appId);
    if (userMapping) {
      if (appId === APP_IDS.PREMIUM_CALENDAR) {
        userMapping.appASubscribed = subscribed;
      } else if (appId === APP_IDS.FITNESS_TRACKER) {
        userMapping.appBSubscribed = subscribed;
      }
    }
  }

  public calculateActionProbability(
    userId: string,
    appId: string,
    eventType: TelemetryEventType,
    variant: Variant,
    appASubscribedOverride?: boolean
  ): number {
    let prob = BASE_DEFAULT_PROB;
    if (eventType === TELEMETRY_EVENT_TYPES.IMPRESSION) prob = BASE_IMPRESSION_PROB;
    else if (eventType === TELEMETRY_EVENT_TYPES.CLICK) prob = BASE_CLICK_PROB;
    else if (eventType === TELEMETRY_EVENT_TYPES.PURCHASE) prob = BASE_PURCHASE_PROB;

    if (appId === APP_IDS.FITNESS_TRACKER && eventType === TELEMETRY_EVENT_TYPES.PURCHASE) {
      prob *= APP_B_PURCHASE_DECAY;
    }

    if (appId === APP_IDS.FITNESS_TRACKER && variant === VARIANTS.B) {
      prob *= VARIANT_B_BOOST;
    }

    if (appId === APP_IDS.FITNESS_TRACKER) {
      const isSubscribed = appASubscribedOverride !== undefined
        ? appASubscribedOverride
        : this.isUserSubscribedToAppA(userId);

      if (isSubscribed) {
        prob *= APP_A_SUBSCRIBED_BOOST;
      }
    }

    return prob;
  }

  public async handleUserPurchase(userId: string, appId: string): Promise<void> {
    if (appId === APP_IDS.PREMIUM_CALENDAR) {
      this.updateUserSubscriptionInCache(userId, APP_IDS.PREMIUM_CALENDAR, true);
      await this.userRepository.updateSubscription(userId, APP_IDS.PREMIUM_CALENDAR, true);
    }
  }

  private isUserSubscribedToAppA(userId: string): boolean {
    const appSubscriptions = this.userSubscriptions.get(userId);
    return appSubscriptions?.get(APP_IDS.PREMIUM_CALENDAR) || false;
  }

  private getRandomSubset(size: number): CohortOverlap[] {
    if (this.users.length === 0) return [];
    return fisherYatesShuffle(this.users).slice(0, size);
  }

  private async simulateUserActions(user: CohortOverlap): Promise<void> {
    const { userId, appId } = user;

    try {
      const test = await this.abTestRepository.getActiveByAppId(appId);
      let variant: Variant = VARIANTS.A;
      if (test && test.isActive && test.status === 'running') {
        variant = evaluateSegment(userId, test.name || test.id, test.sampleSizePercent);
      }

      const purchaseProb = this.calculateActionProbability(userId, appId, TELEMETRY_EVENT_TYPES.PURCHASE, variant);
      const clickProb = this.calculateActionProbability(userId, appId, TELEMETRY_EVENT_TYPES.CLICK, variant);

      const r = Math.random();
      let eventType: TelemetryEventType = TELEMETRY_EVENT_TYPES.IMPRESSION;

      if (r < purchaseProb) {
        eventType = TELEMETRY_EVENT_TYPES.PURCHASE;
      } else if (r < clickProb) {
        eventType = TELEMETRY_EVENT_TYPES.CLICK;
      }

      this.metricsAggregator.pushEvent({
        userId,
        appId,
        eventType,
        variant,
        timestamp: new Date(),
      });
      generatedEventsCounter.inc({ app_id: appId, event_type: eventType });

      if (eventType === TELEMETRY_EVENT_TYPES.PURCHASE) {
        await this.handleUserPurchase(userId, appId);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error simulating actions for user ${userId}: ${errorMsg}`);
      if (appId) {
        droppedEventsCounter.inc({ app_id: appId, event_type: 'unknown' });
      }
    }
  }
}
