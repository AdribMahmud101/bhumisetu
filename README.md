# BhumiSetu · LandArchive BD

LandTech 2026 prototype for digital land records and evidence-based verification in Bangladesh.

## Development

Requires Node.js 20.9+ and Bun 1.4+.

```bash
bun install --frozen-lockfile
cp .env.example .env.local
bun run dev
```

Open http://localhost:3000. The landing page and `/api/health` work without API credentials. Set Supabase and DeepInfra credentials in `.env.local` before implementing connected workflows. Never expose the service-role key in browser code.

```bash
bun run lint
bun run typecheck
bun run build
bunx playwright install chromium
bun run test:e2e
```

Dependencies are locked in `bun.lock`. Use `bun install --frozen-lockfile` for reproducible installs.

## Stack and structure

Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, shadcn-compatible UI configuration, Lucide, Supabase, OpenAI SDK for DeepInfra, PDF.js, pdf-lib, QR tools, and Playwright.

- `src/app`: routes, layouts, and health endpoint.
- `src/components/ui`: shared UI components.
- `src/lib`: server-only API client factories and shared utilities.
- `supabase/migrations`: versioned database migrations.
- `tests`: Playwright smoke coverage.
- `master_instructions.md`: supplied architecture and sprint brief.
- `Hackathon_Overview.md`: supplied competition overview.

## Current scope

Initial development scaffold only. OCR, database schema, verification, authentication, mutation review, and citizen reports are not implemented. Client factories use real services when configured; no simulated service responses are included. The health endpoint reports application availability, not external service connectivity.

The source brief contains inconsistent example risk scores (60/65/85) and naming conventions; resolve these against explicit rule fixtures before implementing the verification engine.

## Data and AI disclosure

No citizen data or credentials are included. Only clearly labelled synthetic data or organizer-approved samples may be used. The supplied reference PDFs are planning material, not live government integration or verified production datasets.

OpenAI Codex assisted with repository scaffolding and documentation. Planned application AI: DeepInfra vision extraction and reasoning via the OpenAI-compatible SDK. Students must review and understand submitted code.
