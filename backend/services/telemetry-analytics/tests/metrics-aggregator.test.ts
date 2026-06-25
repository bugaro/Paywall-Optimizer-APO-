import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MetricsAggregator } from '../src/application/use-cases/metrics-aggregator';
import { TelemetryRepository } from '../src/application/ports/telemetry-repository';
import { TelemetryEvent } from '../src/domain/entities';

describe('Tumbling Window Metrics Aggregator Specification', () => {
  let aggregator: MetricsAggregator;
  let mockRepository: TelemetryRepository;
  let loggedMessages: string[] = [];

  // Structured Logging Mock helper
  const mockLogger = {
    info: (msg: string) => loggedMessages.push(msg),
    error: (msg: string) => loggedMessages.push(msg),
    warn: (msg: string) => loggedMessages.push(msg),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    loggedMessages = [];

    // Given
    mockRepository = {
      save: vi.fn(),
      saveBatch: vi.fn().mockResolvedValue(undefined),
      getAggregatedMetrics: vi.fn(),
    };

    // Instantiate aggregator with mock dependencies
    aggregator = new MetricsAggregator(mockRepository, mockLogger);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ==========================================
  // In-Memory Buffering (bufferTime)
  // ==========================================
  describe('In-Memory Buffering & Batching', () => {
    it('should buffer events for 5 seconds and invoke saveBatch once with all accumulated events', async () => {
      // Given
      const event1: TelemetryEvent = {
        userId: 'u1',
        appId: 'a1',
        eventType: 'impression',
        variant: 'A',
        timestamp: new Date(),
      };
      const event2: TelemetryEvent = {
        userId: 'u2',
        appId: 'a1',
        eventType: 'click',
        variant: 'B',
        timestamp: new Date(),
      };

      // When
      aggregator.pushEvent(event1);
      aggregator.pushEvent(event2);

      // Verify saveBatch hasn't been called immediately (buffering state)
      expect(mockRepository.saveBatch).not.toHaveBeenCalled();

      // Advance timer by 4.9 seconds (just before the window closes)
      await vi.advanceTimersByTimeAsync(4900);
      expect(mockRepository.saveBatch).not.toHaveBeenCalled();

      // Advance timer to cross the 5-second boundary (5.0 seconds)
      await vi.advanceTimersByTimeAsync(100);

      // Then
      expect(mockRepository.saveBatch).toHaveBeenCalledTimes(1);
      expect(mockRepository.saveBatch).toHaveBeenCalledWith([event1, event2]);
      expect(loggedMessages).toContain('Flushing telemetry batch to database. Size: 2');
    });

    it('should not invoke saveBatch if no events were pushed during the window', async () => {
      // When
      await vi.advanceTimersByTimeAsync(5000);

      // Then
      expect(mockRepository.saveBatch).not.toHaveBeenCalled();
    });

    it('should create separate, non-overlapping tumbling windows', async () => {
      // Given
      const event1: TelemetryEvent = { userId: 'u1', appId: 'a1', eventType: 'impression', variant: 'A', timestamp: new Date() };
      const event2: TelemetryEvent = { userId: 'u2', appId: 'a1', eventType: 'click', variant: 'B', timestamp: new Date() };

      // When
      aggregator.pushEvent(event1);
      await vi.advanceTimersByTimeAsync(5000); // 1st window flushes

      aggregator.pushEvent(event2);
      await vi.advanceTimersByTimeAsync(5000); // 2nd window flushes

      // Then
      expect(mockRepository.saveBatch).toHaveBeenCalledTimes(2);
      expect(mockRepository.saveBatch).toHaveBeenNthCalledWith(1, [event1]);
      expect(mockRepository.saveBatch).toHaveBeenNthCalledWith(2, [event2]);
    });
  });

  // ==========================================
  // Resiliency & Retry Logic
  // ==========================================
  describe('Resiliency & Retry Logic', () => {
    it('should retry database batch save up to 3 times with exponential backoff on transient errors and succeed', async () => {
      // Given
      // Mock saveBatch to fail twice with database errors, then succeed on 3rd attempt
      mockRepository.saveBatch = vi.fn()
        .mockRejectedValueOnce(new Error('Transient DB timeout'))
        .mockRejectedValueOnce(new Error('Transient DB lock wait timeout'))
        .mockResolvedValueOnce(undefined);

      const event: TelemetryEvent = {
        userId: 'u1',
        appId: 'a1',
        eventType: 'impression',
        variant: 'A',
        timestamp: new Date(),
      };

      // When
      aggregator.pushEvent(event);

      // Trigger the 5-second tumbling window
      await vi.advanceTimersByTimeAsync(5000);

      // Check first attempt execution
      expect(mockRepository.saveBatch).toHaveBeenCalledTimes(1);
      expect(loggedMessages).toContain('Database insert failed. Retrying batch save (Attempt 1 of 3)...');

      // First retry delay: 500ms
      await vi.advanceTimersByTimeAsync(500);
      expect(mockRepository.saveBatch).toHaveBeenCalledTimes(2);
      expect(loggedMessages).toContain('Database insert failed. Retrying batch save (Attempt 2 of 3)...');

      // Second retry delay: 1000ms (doubled backoff)
      await vi.advanceTimersByTimeAsync(1000);

      // Then
      expect(mockRepository.saveBatch).toHaveBeenCalledTimes(3);
      // Verify successful persistence on 3rd attempt (no subsequent logs of failure)
      expect(loggedMessages).not.toContain('Database insert failed. Retrying batch save (Attempt 3 of 3)...');
    });

    it('should log a critical error, report metrics, and discard the batch after 3 failed retries (No Process Crash)', async () => {
      // Given
      // Mock saveBatch to fail permanently
      mockRepository.saveBatch = vi.fn().mockRejectedValue(new Error('Fatal DB Connection Down'));

      const event: TelemetryEvent = {
        userId: 'u1',
        appId: 'a1',
        eventType: 'purchase',
        variant: 'B',
        timestamp: new Date(),
      };

      // When
      aggregator.pushEvent(event);
      await vi.advanceTimersByTimeAsync(5000); // Trigger flush (1st attempt)

      // Advance through all retries (500ms delay + 1000ms delay)
      await vi.advanceTimersByTimeAsync(500);  // 2nd attempt
      await vi.advanceTimersByTimeAsync(1000); // 3rd attempt

      // Then
      expect(mockRepository.saveBatch).toHaveBeenCalledTimes(3);
      expect(loggedMessages).toContain('CRITICAL: Failed to flush telemetry batch after 3 attempts. Data lost.');
      // The promise rejection must be handled internally to prevent crashing the Node process.
    });
  });

  // ==========================================
  // Graceful Shutdown
  // ==========================================
  describe('Graceful Shutdown', () => {
    it('should flush any remaining buffered events immediately on shutdown before completing subscription', async () => {
      // Given
      const event: TelemetryEvent = {
        userId: 'u_flush',
        appId: 'a_flush',
        eventType: 'impression',
        variant: 'A',
        timestamp: new Date(),
      };

      // When
      aggregator.pushEvent(event);

      // Call shutdown immediately before the 5-second tumbling window naturally expires
      await aggregator.shutdown();

      // Then
      // The buffered event should be flushed immediately
      expect(mockRepository.saveBatch).toHaveBeenCalledTimes(1);
      expect(mockRepository.saveBatch).toHaveBeenCalledWith([event]);

      // Verify subsequent event pushes are ignored or do not trigger further flushes
      aggregator.pushEvent(event);
      await vi.advanceTimersByTimeAsync(5000);
      expect(mockRepository.saveBatch).toHaveBeenCalledTimes(1); // Still 1 from shutdown flush
    });
  });
});
