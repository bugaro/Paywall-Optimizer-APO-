---
depends_on: ["FE-09"]
---

# Issue: FE-10: Create Multi-Stage Dockerfile for Nginx Static Hosting

## Context
The frontend service needs to be built and containerized into a production-ready web server.

## Technical Requirements
* Create `frontend/Dockerfile` with two stages:
  1. Build Stage: Use Node 24 image to install dependencies and run `npm run build`.
  2. Production Stage: Use Nginx alpine image to copy the build dist and serve files on port 80.
* Configure `frontend/nginx.conf` to handle SPA path routing redirecting fallback requests to `index.html`.

## QA & Validation
* **Manual Step**: Run `docker build -t apo-frontend .` locally, run the container, and verify the page loads on localhost port 80.

## Observability Check
* Nginx access logs mapped to standard container stdout/stderr.
