export interface Application {
  id: string;
  name: string;
  currentCr: number | null;
  targetCr: number;
  lastChangeDescription: string;
  lastChangeTimestamp?: number;
}
