import type { ABTest } from '../../domain/entities.ts';

export interface ABTestRepository {
  getActiveByAppId(appId: string): Promise<ABTest | null>;
  createActive(appId: string, name: string, sampleSizePercent: number): Promise<ABTest>;
}
