import { Subject, Subscription, from, EMPTY } from 'rxjs';
import { bufferTime, concatMap } from 'rxjs/operators';
import type { TelemetryEvent } from '../../domain/entities.ts';
import type { TelemetryRepository } from '../ports/telemetry-repository.ts';
import type { Logger } from '../../domain/types.ts';
import client from 'prom-client';

const eventsIngestedCounter = new client.Counter({
  name: 'telemetry_events_ingested_total',
  help: 'Count of total events aggregated',
  labelNames: ['app_id'],
});

const dbBatchesWrittenCounter = new client.Counter({
  name: 'telemetry_db_batches_written_total',
  help: 'Count of database batches written',
});

const dbWriteFailuresCounter = new client.Counter({
  name: 'telemetry_db_write_failures_total',
  help: 'Count of database write failures',
});

const BATCH_FLUSH_INTERVAL_MS = 5000;
const MAX_FLUSH_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 500;

export class MetricsAggregator {
  private eventSubject = new Subject<TelemetryEvent>();
  private subscription: Subscription;
  private bufferedEvents: TelemetryEvent[] = [];
  private repository: TelemetryRepository;
  private logger: Logger;

  constructor(
    repository: TelemetryRepository,
    logger: Logger = console
  ) {
    this.repository = repository;
    this.logger = logger;
    this.subscription = this.eventSubject
      .pipe(
        bufferTime(BATCH_FLUSH_INTERVAL_MS),
        concatMap((batch) => {
          if (batch.length === 0) return EMPTY;
          this.bufferedEvents = this.bufferedEvents.filter((e) => !batch.includes(e));
          return from(this.flushBatch(batch));
        })
      )
      .subscribe({
        error: (err) => {
          this.logger.error(`Aggregator stream error: ${err instanceof Error ? err.message : String(err)}`);
        },
      });
  }

  public pushEvent(event: TelemetryEvent): void {
    if (this.subscription.closed) {
      return;
    }

    this.bufferedEvents.push(event);
    eventsIngestedCounter.inc({ app_id: event.appId });
    this.eventSubject.next(event);
  }

  private async flushBatch(batch: TelemetryEvent[]): Promise<void> {
    this.logger.info(`Flushing telemetry batch to database. Size: ${batch.length}`);

    let attempt = 0;
    let delay = INITIAL_RETRY_DELAY_MS;

    while (attempt < MAX_FLUSH_ATTEMPTS) {
      try {
        await this.repository.saveBatch(batch);
        dbBatchesWrittenCounter.inc();
        return;
      } catch (err) {
        attempt++;
        dbWriteFailuresCounter.inc();
        if (attempt < MAX_FLUSH_ATTEMPTS) {
          this.logger.warn(`Database insert failed. Retrying batch save (Attempt ${attempt} of ${MAX_FLUSH_ATTEMPTS})...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        }
      }
    }

    this.logger.error(`CRITICAL: Failed to flush telemetry batch after ${MAX_FLUSH_ATTEMPTS} attempts. Data lost.`);
  }

  public async shutdown(): Promise<void> {
    this.eventSubject.complete();

    if (this.bufferedEvents.length > 0) {
      const batchToFlush = [...this.bufferedEvents];
      this.bufferedEvents = [];
      await this.flushBatch(batchToFlush);
    }
  }
}
