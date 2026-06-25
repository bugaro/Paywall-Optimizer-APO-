export interface TelemetryMetric {
  timestamp: string;
  conversionRate: number;
  impressions: number;
  purchases: number;
  clicks?: number;
  variant: 'A' | 'B';
}
