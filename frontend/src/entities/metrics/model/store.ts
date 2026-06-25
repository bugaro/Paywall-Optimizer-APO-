import { create } from 'zustand';
import { fetchClient } from '../../../shared/api/client';
import { logger } from '../../../shared/lib/logger';
import { useAppStore } from '../../../entities/application/model/store';
import type { TelemetryMetric } from '@/entities/metrics/model/types';

interface MetricsStore {
  metricsByApp: Record<string, TelemetryMetric[]>;
  activeExperiments: Record<string, { sampleSizePercent: number } | null>;
  isPolling: boolean;
  isFetching: boolean;
  error: string | null;
  fetchMetrics: (appId: string) => Promise<void>;
  fetchActiveExperiment: (appId: string) => Promise<void>;
  startPollingAll: (appIds: string[]) => void;
  stopPolling: () => void;
  resetMetrics: () => void;
}

let intervalId: any = null;
let currentAppIds: string[] = [];
let consecutiveErrors = 0;
let inflightCount = 0;

const getBackoffInterval = (): number => {
  if (consecutiveErrors <= 1) return 5000;
  if (consecutiveErrors <= 2) return 10000;
  if (consecutiveErrors <= 4) return 20000;
  return 30000;
};

const tick = () => {
  if (document.visibilityState === 'visible') {
    const store = useMetricsStore.getState();
    currentAppIds.forEach((id) => {
      store.fetchMetrics(id);
      store.fetchActiveExperiment(id);
    });
  }
};

const startInterval = () => {
  if (intervalId) {
    clearInterval(intervalId);
  }
  const interval = getBackoffInterval();
  intervalId = setInterval(tick, interval);
};

const stopInterval = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};

export const useMetricsStore = create<MetricsStore>((set, get) => ({
  metricsByApp: {},
  activeExperiments: {},
  isPolling: false,
  isFetching: false,
  error: null,

  fetchActiveExperiment: async (appId: string) => {
    try {
      const data = await fetchClient(`/api/experiments/active?appId=${appId}`);
      set((state) => ({
        activeExperiments: { ...state.activeExperiments, [appId]: data },
      }));
    } catch {
      // non-critical, silently ignore
    }
  },

  fetchMetrics: async (appId: string) => {
    inflightCount++;
    set({ isFetching: true });
    try {
      const data = await fetchClient(`/api/metrics?appId=${appId}`);
      consecutiveErrors = 0;
      set((state) => ({
        metricsByApp: { ...state.metricsByApp, [appId]: data },
        error: null,
      }));

      if (data && data.length > 0) {
        const totalPurchases = (data as TelemetryMetric[]).reduce((sum, m) => sum + m.purchases, 0);
        const totalImpressions = (data as TelemetryMetric[]).reduce((sum, m) => sum + m.impressions, 0);
        if (totalImpressions > 0) {
          const overallCr = Number(((totalPurchases / totalImpressions) * 100).toFixed(1));
          useAppStore.getState().updateAppMetrics(appId, overallCr);
        }
      }

      logger.info(`[Metrics Poll] Ingested 5s tumbling window: ${appId}`, {
        appId,
        recordsCount: data ? data.length : 0,
      });
    } catch (err: any) {
      consecutiveErrors++;
      const errMsg = err instanceof Error ? err.message : String(err);
      set({ error: errMsg });

      logger.error(`[Metrics Poll] Ingestion failed: ${appId}`, {
        appId,
        error: errMsg,
        consecutiveErrors,
      });
    } finally {
      inflightCount--;
      if (inflightCount === 0) {
        set({ isFetching: false });
      }
    }
  },

  startPollingAll: (appIds: string[]) => {
    currentAppIds = appIds;
    consecutiveErrors = 0;
    set({ isPolling: true });

    // Immediate fetch for all apps
    appIds.forEach((id) => get().fetchMetrics(id));

    // Start interval
    if (document.visibilityState === 'visible') {
      startInterval();
    }
  },

  stopPolling: () => {
    currentAppIds = [];
    consecutiveErrors = 0;
    inflightCount = 0;
    set({ isPolling: false, isFetching: false });
    stopInterval();
  },

  resetMetrics: () => {
    set({ metricsByApp: {}, activeExperiments: {}, error: null, isFetching: false });
  },
}));

// Tab visibility change handler
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    const store = useMetricsStore.getState();
    if (store.isPolling && currentAppIds.length > 0) {
      if (document.visibilityState === 'visible') {
        // Immediate fetch on wakeup for all apps
        currentAppIds.forEach((id) => store.fetchMetrics(id));
        // Restart interval
        startInterval();
      } else {
        // Stop interval when tab goes to background
        stopInterval();
      }
    }
  });
}
