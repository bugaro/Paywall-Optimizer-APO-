import type { TelemetryMetrics, SplitConfig, ReasoningChunk } from '../domain/types.ts';

export interface TelemetryClient {
  fetchMetrics(appId: string): Promise<TelemetryMetrics>;
  initiateExperiment(config: SplitConfig): Promise<boolean>;
  resetSimulation(): Promise<boolean>;
}

export interface ReasoningClient {
  generateMutationStream(appId: string, currentMetrics: TelemetryMetrics, signal?: AbortSignal): Promise<ReadableStream<ReasoningChunk>>;
}

export type ReasoningPort = ReasoningClient;
