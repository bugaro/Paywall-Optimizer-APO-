---
depends_on: ["01-package-json"]
---

# Issue: Configure TypeScript compiler options

## Context
A proper `tsconfig.json` configuration is required to compile Node 24 native ES modules with proper paths, decorator metadata support (if required by Mastra), and target strict configurations.

## Technical Requirements
- Create `services/mastra-ai/tsconfig.json` with settings:
  - Target: `ES2022` or `ESNext`
  - Module: `NodeNext` or `ESNext`
  - Module Resolution: `NodeNext` or `Bundler`
  - Strict: `true`
  - SkipLibCheck: `true`
  - EsModuleInterop: `true`
  - ResolveJsonModule: `true`
  - OutDir: `"dist"`
  - Include: `["src/**/*"]`

## QA & Validation
- **Unit/Integration**: Verify compilation compatibility using a test script.
- **Manual/Automated Step**: Run `npx tsc --noEmit` and check that it completes cleanly.
- **Negative Test**: Create a dummy file with dynamic imports or type mismatches and ensure `tsc` flags it correctly.
- **Boundary Check**: Verify compiler handles import paths correctly when imports end with `.ts` or `.js` extension (matching Hono/tsx native behavior).

## Observability Check
- N/A
