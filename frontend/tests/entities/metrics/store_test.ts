import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMetricsStore } from '../../../../src/entities/metrics/model/store';
import { fetchClient } from '../../../../src/shared/api/client';
import { logger } from '../../../../src/shared/lib/logger';

// Mock the API client
vi.mock('../../../../src/shared/api/client', () => ({
  fetchClient: vi.fn(),
}));

// Mock the logger
vi.mock('../../../../src/shared/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useMetricsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Reset Zustand store to initial state
    useMetricsStore.setState({
      metrics: [],
      isPolling: false,
      isFetching: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Real-time Polling & Fetching ---
  it('should successfully fetch metrics from API and store them', async () => {
    // Given
    const mockData = [
      { timestamp: '2026-06-23T18:00:00Z', conversionRate: 1.8, impressions: 100, purchases: 2, variant: 'A' }
    ];
    vi.mocked(fetchClient).mockResolvedValue(mockData);

    // When
    const promise = useMetricsStore.getState().fetchMetrics('00000000-0000-0000-0000-000000000002');
    
    expect(useMetricsStore.getState().isFetching).toBe(true);
    await promise;

    // Then
    expect(fetchClient).toHaveBeenCalledWith('/api/metrics?appId=00000000-0000-0000-0000-000000000002');
    expect(useMetricsStore.getState().isFetching).toBe(false);
    expect(useMetricsStore.getState().metrics).toEqual(mockData);
    expect(useMetricsStore.getState().error).toBeNull();
  });

  it('should start polling loop every 5000ms when startPolling is invoked', async () => {
    // Given
    vi.mocked(fetchClient).mockResolvedValue([]);
    const appId = '00000000-0000-0000-0000-000000000002';

    // When
    useMetricsStore.getState().startPolling(appId);

    // Then
    expect(useMetricsStore.getState().isPolling).toBe(true);
    expect(fetchClient).toHaveBeenCalledTimes(1); // Immediate fetch on start

    // Fast-forward time to next polling interval (5 seconds)
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchClient).toHaveBeenCalledTimes(2);

    // Fast-forward another 5 seconds
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchClient).toHaveBeenCalledTimes(3);
  });

  it('should halt polling loop when stopPolling is called', async () => {
    // Given
    vi.mocked(fetchClient).mockResolvedValue([]);
    const appId = '00000000-0000-0000-0000-000000000002';

    useMetricsStore.getState().startPolling(appId);
    expect(useMetricsStore.getState().isPolling).toBe(true);
    expect(fetchClient).toHaveBeenCalledTimes(1);

    // When
    useMetricsStore.getState().stopPolling();

    // Then
    expect(useMetricsStore.getState().isPolling).toBe(false);

    // Fast-forward time and assert no further API calls are made
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchClient).toHaveBeenCalledTimes(1);
  });

  // --- Observability Assertions ---
  it('should log metrics ingestion event on successful fetch', async () => {
    // Given
    const mockData = [
      { timestamp: '2026-06-23T18:00:00Z', conversionRate: 2.1, impressions: 50, purchases: 1, variant: 'A' },
      { timestamp: '2026-06-23T18:00:00Z', conversionRate: 4.5, impressions: 50, purchases: 2, variant: 'B' }
    ];
    vi.mocked(fetchClient).mockResolvedValue(mockData);

    // When
    await useMetricsStore.getState().fetchMetrics('00000000-0000-0000-0000-000000000002');

    // Then
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('[Metrics Poll] Ingested 5s tumbling window'),
      expect.objectContaining({
        appId: '00000000-0000-0000-0000-000000000002',
        recordsCount: 2,
      })
    );
  });

  // --- Robust Error Handling & Stability ---
  it('should handle API failure by setting error state and keeping previous metrics', async () => {
    // Given
    const initialMetrics = [
      { timestamp: '2026-06-23T18:00:00Z', conversionRate: 3.5, impressions: 200, purchases: 7, variant: 'A' }
    ];
    useMetricsStore.setState({ metrics: initialMetrics });
    vi.mocked(fetchClient).mockRejectedValue(new Error('Network Failure'));

    // When
    await useMetricsStore.getState().fetchMetrics('00000000-0000-0000-0000-000000000002');

    // Then
    expect(useMetricsStore.getState().isFetching).toBe(false);
    expect(useMetricsStore.getState().error).toBe('Network Failure');
    // Maintain old state as fallback (Stale data mode)
    expect(useMetricsStore.getState().metrics).toEqual(initialMetrics);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('[Metrics Poll] Ingestion failed'),
      expect.objectContaining({ error: 'Network Failure' })
    );
  });

  // --- Edge Cases & Boundaries ---
  describe('Boundary & Tab Visibility Cases', () => {
    it('should halt polling when browser tab becomes hidden and restart when visible', async () => {
      // Given
      vi.mocked(fetchClient).mockResolvedValue([]);
      const appId = '00000000-0000-0000-0000-000000000002';
      useMetricsStore.getState().startPolling(appId);
      expect(fetchClient).toHaveBeenCalledTimes(1);

      // Simulate tab going background (hidden)
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // When: time passes while hidden
      await vi.advanceTimersByTimeAsync(5000);

      // Then: no API call made
      expect(fetchClient).toHaveBeenCalledTimes(1);

      // When: tab returns to foreground (visible)
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // Then: immediate fetch on wakeup
      expect(fetchClient).toHaveBeenCalledTimes(2);

      // And polling loop continues
      await vi.advanceTimersByTimeAsync(5000);
      expect(fetchClient).toHaveBeenCalledTimes(3);
    });
  });
});
