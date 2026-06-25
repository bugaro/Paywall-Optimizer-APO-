# Multi-Asset Autonomous Paywall Optimizer (APO) — API Reference

This document provides the technical specification and usage examples for the microservices in the APO backend.

---

## 1. Telemetry & Analytics Engine API

The Telemetry & Analytics Engine (`apo-telemetry-analytics`) is responsible for event stream ingestion, real-time metrics aggregation, and deterministic user segmentation.

### Base URL
By default, the service runs on port `4003` (internally and externally).
- Local Development: `http://localhost:4003`
- Docker Network: `http://apo-telemetry-analytics:4003`

### Global Headers

| Header | Type | Description |
| :--- | :--- | :--- |
| `Content-Type` | `string` | Must be `application/json` for `POST` requests. |
| `X-Correlation-ID` | `string` | *Optional*. Used to track request flow across microservices and databases. If not provided, a random UUID is generated. |

### Endpoints

#### 1.1 Submit Telemetry Event
Submit user interaction events (impression, click, purchase) to the event stream. The engine evaluates user/cohort variant assignments and records metrics.

- **HTTP Method**: `POST`
- **Path**: `/api/events`
- **Expected Response Code**: `202 Accepted`

##### Request Body Schema
```json
{
  "userId": "string (UUID)",
  "appId": "string (UUID)",
  "eventType": "string (impression | click | purchase)"
}
```

##### Response Body Schema
```json
{
  "success": true,
  "variant": "string (A | B)"
}
```

> [!NOTE]
> - `variant` is dynamically assigned based on deterministic FNV-1a hashing of `userId + testName` and the current test's `sampleSizePercent`.
> - If `eventType` is `purchase`, the user's subscription status is updated to `true` in the database.

##### Example cURL
```bash
curl -X POST http://localhost:4003/api/events \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: 123e4567-e89b-12d3-a456-426614174000" \
  -d '{
    "userId": "d3b07384-d113-4956-b51b-252f840f4e3c",
    "appId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "eventType": "impression"
  }'
```

---

#### 1.2 Retrieve Aggregated Metrics
Retrieve real-time metrics aggregated in 5-second tumbling windows for a specific app.

- **HTTP Method**: `GET`
- **Path**: `/api/metrics`
- **Expected Response Code**: `200 OK`

##### Query Parameters
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `appId` | `string (UUID)` | **Yes** | N/A | The unique identifier of the app. |
| `since` | `string (ISO-8601)` | No | 1 hour ago | Exclude metrics recorded before this timestamp. |

##### Response Body Schema
```json
[
  {
    "timestamp": "string (ISO-8601)",
    "variant": "string (A | B)",
    "impressions": 105,
    "clicks": 42,
    "purchases": 5,
    "conversionRate": 0.047619047619047616
  }
}
```

##### Example cURL
```bash
curl "http://localhost:4003/api/metrics?appId=a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d&since=2026-06-18T10:00:00.000Z"
```

---

#### 1.3 Create A/B Isolation Test Experiment
Create and initiate a new active A/B split testing configuration.

- **HTTP Method**: `POST`
- **Path**: `/api/experiments`
- **Expected Response Code**: `201 Created`

##### Request Body Schema
```json
{
  "appId": "string (UUID)",
  "name": "string (experiment-name)",
  "sampleSizePercent": "number (0 to 100)"
}
```

##### Response Body Schema
```json
{
  "id": "string (UUID)",
  "appId": "string (UUID)",
  "name": "string",
  "sampleSizePercent": 10,
  "status": "running",
  "isActive": true,
  "createdAt": "string (ISO-8601)",
  "updatedAt": "string (ISO-8601)"
}
```

##### Example cURL
```bash
curl -X POST http://localhost:4003/api/experiments \
  -H "Content-Type: application/json" \
  -d '{
    "appId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "name": "Experiment-AppB-v1",
    "sampleSizePercent": 10
  }'
```

---

#### 1.4 Prometheus Metrics Scraping
Internal endpoint exposing service/HTTP performance metrics.

- **HTTP Method**: `GET`
- **Path**: `/metrics`
- **Expected Response Code**: `200 OK`
- **Response Format**: `text/plain`

---
---

## 2. Copilot Gateway (Bridge) API

The Copilot Gateway (`copilot-bridge`) relays frontend requests to the AI components, exposing the CopilotKit chat endpoint and orchestration tools.

### Base URL
By default, the service runs on port `4005` (internally and externally).
- Local Development: `http://localhost:4005`
- Docker Network: `http://copilot-bridge:4005`

### Endpoints

#### 2.1 CopilotKit Chat Endpoint
Direct endpoint utilized by the CopilotKit client wrapper to interact with backend agent instances.

- **HTTP Method**: `POST`
- **Path**: `/copilot/chat`
- **Expected Response Code**: `200 OK`

---

#### 2.2 Prometheus Metrics Scraping
Internal scraping endpoint for Hono and runtime metrics.

- **HTTP Method**: `GET`
- **Path**: `/metrics`
- **Expected Response Code**: `200 OK`
- **Response Format**: `text/plain`

---

### Copilot Agent Tools

The `copilot-bridge` registers the following tools for the BuiltInAgent:

#### 2.3 `initiateAbExperiment`
Initiates a new A/B test with a paywall mutation on the Telemetry & Analytics Engine.

##### Parameters
```json
{
  "appId": "string (UUID)",
  "sampleSizePercent": "number (0 to 100)",
  "mutation": {
    "price": "string (e.g. $7.99)",
    "theme": "string (light | dark-slate)",
    "ctaCopy": "string"
  }
}
```

##### Returns
```json
{
  "success": true
}
```

---

#### 2.4 `remediateBreach`
Audits performance statistics for a specific app and requests a paywall layout optimization proposal.

##### Parameters
```json
{
  "appId": "string (UUID)"
}
```

##### Returns
```json
{
  "metrics": {
    "impressions": 200,
    "clicks": 22,
    "conversions": 3,
    "conversionRate": 0.015
  },
  "mutation": {
    "price": "$7.99",
    "theme": "dark-slate",
    "ctaCopy": "Commit to your fitness today. Get 20% off forever."
  },
  "cardType": "PaywallExperimentCard"
}
```

---
---

## 3. Mastra AI Reasoning & Optimization Service API

The Mastra AI service (`apo-mastra-ai`) orchestrates pgvector similarity checks on historical data and runs local LLM (Qwen2.5:3b) reasoning pipelines to generate targeted paywall mutation proposals.

### Base URL
By default, the service runs on port `4006` (internally and externally).
- Local Development: `http://localhost:4006`
- Docker Network: `http://apo-mastra-ai:4006`

### Endpoints

#### 3.1 Generate Remediation Proposal
Generate a paywall layout mutation proposal (including price, color theme, and copywriting) utilizing RAG from historical database mutation records.

- **HTTP Method**: `POST`
- **Path**: `/api/reasoning/mutate`
- **Expected Response Code**: `200 OK`

##### Request Body Schema
```json
{
  "appId": "string (UUID)",
  "metrics": {
    "impressions": "number",
    "clicks": "number",
    "conversions": "number",
    "conversionRate": "number"
  }
}
```

##### Response Body Schema
```json
{
  "reasoning": "string (Explanation of why this variant is proposed)",
  "proposedUi": {
    "pricePoint": "number",
    "backgroundColor": "string (light | dark-slate)",
    "titleText": "string",
    "ctaText": "string"
  },
  "price": "string (formatted price, e.g. \"$7.99\")",
  "theme": "string (light | dark-slate)",
  "ctaCopy": "string (concatenated title and CTA text)"
}
```

##### Example cURL
```bash
curl -X POST http://localhost:4006/api/reasoning/mutate \
  -H "Content-Type: application/json" \
  -d '{
    "appId": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    "metrics": {
      "impressions": 1000,
      "clicks": 15,
      "conversions": 2,
      "conversionRate": 0.002
    }
  }'
```

---

#### 3.2 Prometheus Metrics Scraping
Internal scraper endpoint exposing Go/Node runtime statistics and custom proposal histograms.

- **HTTP Method**: `GET`
- **Path**: `/metrics`
- **Expected Response Code**: `200 OK`
- **Response Format**: `text/plain`

---

#### 3.3 Health Check
Verify the operational health of the Mastra reasoning service container.

- **HTTP Method**: `GET`
- **Path**: `/health`
- **Expected Response Code**: `200 OK`

##### Response Body Schema
```json
{
  "status": "ok",
  "service": "mastra-ai"
}
```

---

#### 3.4 OpenAI-Compatible Ollama Proxy
Proxies standard OpenAI SDK requests (e.g. Chat Completions or Embeddings) downstream to the local Ollama daemon.

- **HTTP Method**: `ALL` (GET, POST, PUT, DELETE, etc.)
- **Path**: `/api/reasoning/openai/*` (e.g., `/api/reasoning/openai/chat/completions`)
- **Expected Response Code**: Dynamic (returns downstream status, or `503 Service Unavailable` on downstream network failure)

##### Features
- Preserves incoming headers (except `Host`), method, query parameters, and request body.
- Appends `X-Correlation-ID` from the async context propagation store if available.
- Increments the `downstream_failures_total` Prometheus counter on HTTP errors or proxy failures.

---
---

## Error Codes & Handling

All routes map validation and domain errors to appropriate HTTP status codes:

| Status Code | Error Message Context | Description |
| :--- | :--- | :--- |
| `400 Bad Request` | `Invalid payload` \| `sampleSizePercent must be between 0 and 100` | Missing fields, invalid payload structures, or values out of bounds. |
| `403 Forbidden` | `AuthorizationError` | Permission denied to access or modify resources. |
| `404 Not Found` | `NotFoundError` | The requested resource (e.g., app, user) does not exist. |
| `409 Conflict` | `ConflictError` | Request conflicts with current database state. |
| `503 Service Unavailable` | `DomainError` (Copilot Bridge only) | Relayed downstream connection failure or timeout to `telemetry-analytics`. |
| `500 Internal Error`| `Internal Server Error` | Unhandled system exception. |

### Error Payload Format
```json
{
  "error": "Detailed error message string"
}
```
