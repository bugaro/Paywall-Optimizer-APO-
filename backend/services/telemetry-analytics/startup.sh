#!/bin/sh
set -e

echo "Syncing database schema..."
npx drizzle-kit push --config=drizzle.config.ts

echo "Starting server..."
node --experimental-strip-types src/infrastructure/http/server.ts
