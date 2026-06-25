import type { TelemetryClient } from '../../application/ports.ts';
import type { TelemetryMetrics, SplitConfig } from '../../domain/types.ts';
import { DEFAULT_TELEMETRY_ANALYTICS_URL, TELEMETRY_ENDPOINTS } from '../../domain/constants.ts';
import { httpFetch } from '../http-client.ts';

export class HttpTelemetryAdapter implements TelemetryClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.TELEMETRY_ANALYTICS_URL || DEFAULT_TELEMETRY_ANALYTICS_URL;
  }

  async fetchMetrics(appId: string): Promise<TelemetryMetrics> {
    const data = await httpFetch<{ impressions: number; clicks: number; purchases: number }[]>(
      `${this.baseUrl}${TELEMETRY_ENDPOINTS.METRICS}?appId=${appId}`,
      { method: 'GET' }
    );

    let impressions = 0;
    let clicks = 0;
    let conversions = 0;

    if (Array.isArray(data)) {
      for (const window of data) {
        impressions += window.impressions || 0;
        clicks += window.clicks || 0;
        conversions += window.purchases || 0;
      }
    }

    const conversionRate = impressions > 0 ? conversions / impressions : 0;

    return {
      impressions,
      clicks,
      conversions,
      conversionRate,
    };
  }

  async initiateExperiment(config: SplitConfig): Promise<boolean> {
    const payload = {
      appId: config.appId,
      name: `Experiment-${config.mutation.price}-${config.mutation.theme}-${Date.now()}`,
      sampleSizePercent: config.sampleSizePercent,
    };

    await httpFetch<unknown>(`${this.baseUrl}${TELEMETRY_ENDPOINTS.EXPERIMENTS}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return true;
  }

  async resetSimulation(): Promise<boolean> {
    await httpFetch<unknown>(`${this.baseUrl}${TELEMETRY_ENDPOINTS.RESET}`, {
      method: 'POST',
    });
    return true;
  }
}

