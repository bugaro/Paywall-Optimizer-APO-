import type { User, CohortOverlap } from '../../domain/entities.ts';

export interface UserRepository {
  getById(id: string): Promise<User | null>;
  getOverlapUsers(): Promise<CohortOverlap[]>;
  updateSubscription(userId: string, appId: string, subscribed: boolean): Promise<void>;
}
