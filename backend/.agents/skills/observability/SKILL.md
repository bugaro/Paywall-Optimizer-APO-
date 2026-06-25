---
name: observability
description: Ensures services implement standard observability: structured logging, metrics, and correlation-id tracing.
---

# Observability Standardizer

Use this skill to audit or implement the observability stack in a microservice.

## Core Requirements

### 1. Structured Logging (Pino)
- **Library**: Use `pino`.
- **Format**: Logs must be emitted in structured JSON to `stdout`.
- **Context**: Every log entry must include the `correlationId` if available in the current context.
- **Redaction**: Ensure sensitive data (passwords, tokens) are redacted using Pino's `redact` option.

### 2. Distributed Tracing (Correlation ID)
- **Header**: Use `x-correlation-id`.
- **Propagation**: 
  - **Inbound**: Extract from incoming HTTP requests or RabbitMQ message headers.
  - **Outbound**: Inject into outgoing HTTP requests (via `Hono` middleware or `fetch`) and RabbitMQ message headers.
- **Storage**: Use Node.js `AsyncLocalStorage` to maintain the correlation ID across the request/event lifecycle without manual prop drilling.

### 3. Metrics (Prometheus)
- **Library**: Use `prom-client`.
- **Endpoint**: Expose a GET `/metrics` endpoint.
- **Standard Metrics**:
  - HTTP Request Duration (Histogram).
  - HTTP Request Errors (Counter).
  - Default Node.js process/runtime metrics.
- **Labeling**: Use consistent labels (e.g., `method`, `route`, `status_code`).

### 4. Integration
- **Hono Middleware**: Implement or audit the presence of observability middleware that:
  - Initializes the Correlation ID.
  - Logs request start/end.
  - Records request metrics.
- **RabbitMQ Integration**: Ensure consumers wrap their logic in a context that captures the Correlation ID from message headers.

## Audit Checklist
1. [ ] Does `package.json` include `pino` and `prom-client`?
2. [ ] Is there an `AsyncLocalStorage` instance for correlation IDs?
3. [ ] Does the logger automatically pick up the `correlationId`?
4. [ ] Is the `/metrics` endpoint active and returning Prometheus-formatted data?
5. [ ] Are all outgoing calls (HTTP/AMQP) carrying the `x-correlation-id` header?
