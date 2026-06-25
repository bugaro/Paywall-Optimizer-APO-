import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';

// ---------------------------------------------------------------------------
// OpenTelemetry SDK Bootstrap
//
// This file MUST be imported as the very first side-effect in the entry point
// (server.ts) before any Mastra, Hono, or pino imports, so that the global
// OTel tracer provider is registered before instrumentation libraries patch
// built-ins (http, fetch).
//
// Configuration via environment variables:
//   OTEL_EXPORTER_OTLP_ENDPOINT — gRPC endpoint for Grafana Alloy (default: http://alloy:4317)
//   SERVICE_NAME                — overrides service.name resource attribute
// ---------------------------------------------------------------------------

const OTEL_ENDPOINT =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://alloy:4317';

const serviceName = process.env.SERVICE_NAME ?? 'mastra-ai';

const traceExporter = new OTLPTraceExporter({ url: OTEL_ENDPOINT });

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
  }),
  spanProcessors: [new BatchSpanProcessor(traceExporter)],
  instrumentations: [new HttpInstrumentation()],
});

sdk.start();

// Graceful shutdown — flush buffered spans before process exits
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .finally(() => process.exit(0));
});

process.on('SIGINT', () => {
  sdk
    .shutdown()
    .finally(() => process.exit(0));
});
