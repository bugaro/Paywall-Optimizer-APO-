import { vi } from 'vitest';

export const abTestRepository = {
  getActiveByAppId: vi.fn().mockResolvedValue(null),
  createActive: vi.fn().mockResolvedValue({
    id: 'mock-experiment-id',
    appId: '',
    name: '',
    sampleSizePercent: 10,
    isActive: true,
    status: 'running',
    createdAt: new Date(),
  }),
};

export const telemetryRepository = {
  getAggregatedMetrics: vi.fn().mockResolvedValue([]),
  save: vi.fn(),
  saveBatch: vi.fn(),
};

export const userRepository = {
  getById: vi.fn().mockResolvedValue(null),
  getOverlapUsers: vi.fn().mockResolvedValue([]),
  updateSubscription: vi.fn(),
};

export const db = {
  select: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn(),
  rollback: vi.fn(),
};
