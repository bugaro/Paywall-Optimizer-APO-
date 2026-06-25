import type { TelemetryEvent, MetricsSeries } from '../../domain/entities.ts';

export interface TelemetryRepository {
  save(event: TelemetryEvent): Promise<void>;
  saveBatch(events: TelemetryEvent[]): Promise<void>;
  getAggregatedMetrics(appId: string, since: Date): Promise<MetricsSeries[]>;
}
