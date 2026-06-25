# Coding Standards

This document defines the mandatory technical standards for all services in the SMMPRO ecosystem. These rules are enforced by the development agent during the implementation, refactoring, and QA phases.

## 1. Strict Typing
- **No `any`**: Use of the `any` type is strictly prohibited in both production and test code.
- **`unknown` & Narrowing**: Use `unknown` for data from external sources (e.g., API responses, message payloads, catch blocks). Use type guards or Zod/Valibot schemas to narrow them to explicit interfaces.
- **Explicit Interfaces**: All DTOs, message payloads, and domain entities must have explicit TypeScript interfaces.

## 2. Domain Error Handling
- **Typed Errors**: Always use domain-specific error subclasses rooted in `DomainError`. 
    - `ValidationError`: Input fails domain invariants.
    - `NotFoundError`: Requested entity does not exist.
    - `ConflictError`: Uniqueness constraint violation.
    - `AuthorizationError`: Permission issues.
    - `InvalidOperationError`: State-based logic violations.
- **No Raw Errors**: Never throw a raw `Error` object.
- **Boundary Responsibility**: Error formatting and translation (e.g., to HTTP status codes/JSON responses or AMQP ACK/NACK) must happen only at the boundary layers (Controllers, Handlers, Consumers).

## 3. Clean Code & Idiomatic Quality
- **Dead Code**: No unused imports, variables, or unreachable code.
- **Magic Values**: Replace hardcoded strings and numbers with centralized **Enums** or **Constants**.
- **Compiler Safety**: The project must always compile with `npx tsc --noEmit` without errors.

## 4. Observability
- **Structured Logging**: Use `pino` for JSON logging to `stdout`, propagating the `correlationId` from the context.
- **Correlation ID Tracking**: Propagate `x-correlation-id` through `AsyncLocalStorage` across async lifecycles and HTTP/messaging headers.
- **Distributed Tracing (OpenTelemetry)**: All microservices must bootstrap distributed tracing using the `@opentelemetry/sdk-node` NodeSDK. The `otel` bootstrapper must be imported as the first side-effect in the server entry point (e.g., `server.ts`). It must export spans to the Grafana Alloy gRPC collector (using the `OTLPTraceExporter` pointing to `OTEL_EXPORTER_OTLP_ENDPOINT`, defaulting to `http://alloy:4317`) and instrument standard transports (`HttpInstrumentation`).
- **Metrics**: Expose a `/metrics` endpoint using `prom-client` to report application and runtime metrics.
