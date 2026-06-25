export const TELEMETRY_EVENT_TYPES = {
  IMPRESSION: 'impression',
  CLICK: 'click',
  PURCHASE: 'purchase',
} as const;

export type TelemetryEventType = typeof TELEMETRY_EVENT_TYPES[keyof typeof TELEMETRY_EVENT_TYPES];

export const VARIANTS = {
  A: 'A',
  B: 'B',
} as const;

export type Variant = typeof VARIANTS[keyof typeof VARIANTS];

export type ABTestStatus = 'draft' | 'running' | 'completed';

export interface Application {
  id: string;
  name: string;
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  createdAt: Date;
}

export interface ABTest {
  id: string;
  appId: string;
  name: string;
  sampleSizePercent: number; // 0 - 100
  isActive: boolean;
  status: ABTestStatus;
  createdAt: Date;
}

export interface TelemetryEvent {
  userId: string;
  appId: string;
  eventType: TelemetryEventType;
  variant: Variant;
  timestamp: Date;
}

export interface CohortOverlap {
  userId: string;
  appId: string;
  appASubscribed: boolean;
  appBSubscribed: boolean;
}

export interface MetricsSeries {
  timestamp: string; // ISO string of window start
  variant: Variant;
  impressions: number;
  clicks: number;
  purchases: number;
  conversionRate: number; // purchases / impressions (safe division)
}
