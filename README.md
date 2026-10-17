# BhumiSetu · ভূমিসেতু

**Live:** https://bhumisetu.adribmahmud.workers.dev

A working LandTech 2026 prototype focused on **P3: Catch Fraud & Double-Selling**. It connects reviewed Khatian, Porcha, deeds and mutation records, explains conflicts with source evidence, and supports officer review before a mutation decision.

## What works

- Published land-ID search, four document categories, source-linked history and QR-linked records.
- One deterministic engine shared by citizen reports and mutation review. The canonical fictional parcel computes **60/100 = 40 excess/overlapping sale + 20 deed–mutation conflict**.
- Visual quota overflow: **20 decimals recorded, 24 sold**, with both competing deeds displayed.
- Officer authentication through Supabase Auth, server-verified role checks, private document storage and RLS-enabled database tables.
- Multi-file PDF/image uploads, actual DeepInfra vision extraction, structured validation, source/extracted review, retryable provider failures and transactional correction audit history.
- Verifying a sale deed creates one mutation case; repeat verification cannot duplicate it. Conflicting/incomplete cases cannot be approved through the server API. Decisions check the land revision to reject stale analyses.
- Separate publication after review. Document changes return the parcel to draft until reviewed and published again.
- SHA-256 copy integrity check and AI-extracted field comparison: Matched / Mismatch found / Further verification required.
- Printable evidence dossier with QR, rule version, coverage and legal limitations; responsive Bangla-first interface.

## Run locally

Requires Node.js 20.9+ and Bun 1.4+.

```bash
bun install --frozen-lockfile
cp .env.example .env.local
# Set Supabase URL, anon key, server-only service-role key and DeepInfra key.
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
bun run seed
bun run dev
```

## Citizen and officer access

- `/login`: citizen email/password login and one-click citizen demo.
- `/register`: normal citizen registration with password confirmation; Supabase email confirmation applies when enabled.
- `/admin/login`: officer email/password login and one-click officer demo.

Judges can enter either demo without a password. These use dedicated, confirmed Supabase accounts with real HttpOnly sessions. Citizen demo accounts cannot call officer APIs. Public registration never assigns officer privileges; normal officer accounts must be provisioned by an administrator. Demo officer access is intentionally public for this synthetic-data hackathon environment.

Run `bun run scripts/setup-demo.ts` to provision/update demo accounts and store their credentials in ignored `.local/demo-accounts.json` and `.env.local`. Upload the generated private `.local/demo-worker-secrets.json` with `bunx wrangler secret bulk .local/demo-worker-secrets.json --name bhumisetu`. Never put demo passwords in client code or Git. Normal email registration needs Supabase's email delivery configuration; confirmation errors are shown rather than bypassed.

The seed script generates fictional PDFs, stores the actual files and SHA-256 hashes in private Supabase Storage, and creates a confirmed prototype officer account. Its randomly generated credentials are stored only in ignored `.local/officer.json`. Open `/login` and use that file. Sessions expire after one hour; sign in again when needed. No passwords or API keys belong in Git.

`bun run seed` does not overwrite existing document records. It publishes the reviewed canonical and clean fixtures and leaves the incomplete draft private. The generated original PDFs and an altered sample are available in ignored `.local/fixtures/` for live upload/comparison demonstrations.

## Validate

```bash
bun run lint
bun run typecheck
bun run test:unit
bun run build
bunx playwright install firefox
bun run test:e2e
```

Browser tests use the seeded project and perform real writes, restore canonical document fields, republish the canonical fixture and create an additional private parcel for the live extraction check. They call DeepInfra and require a funded key. Test artifacts stay under ignored `.local/` and `test-results/`. To run against a deployed instance: `TEST_BASE_URL=https://YOUR_WORKER.workers.dev bun run test:e2e`.

## Cloudflare Workers

Next.js 15.5, React 18, TypeScript, Tailwind, Supabase, DeepInfra's OpenAI-compatible SDK, PDF.js, QR tools and Playwright. OpenNext packages Next.js for the Node-compatible Workers runtime.

```bash
bunx wrangler login
# Configure your account_id/name in wrangler.jsonc.
# Upload required environment variables with wrangler secret bulk from a PRIVATE JSON file.
bun run deploy
```

The Worker requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DEEPINFRA_API_KEY`, and optionally `DEEPINFRA_VISION_MODEL`. Never commit the secret JSON. The PDF.js worker is served locally from `public/pdf.worker.min.mjs` (upstream pdfjs-dist license applies).

## Data, interpretation and limitations

All sample names, land records, share identifiers and PDFs are invented. No real citizen records, NIDs, phone numbers or government datasets are used. No government portals are scraped or queried. Bangladesh's land portal informed the visual direction; this prototype is not a government website or an official service.

The score is a **rule-based indicator, not a probability of fraud**. Court litigation, khas land and acquisition checks explicitly show **Not Checked / Data Unavailable**. The latest recorded party is not a declaration of legal title. A matching hash confirms a copy of an enrolled file, not the authenticity of a government record. Mutation decisions and printed dossiers are prototype review aids, not official orders or DCRs.

Uploads are limited to **5 MB and 3 PDF pages** per file. OCR can be wrong, especially for handwriting; extracted fields require human review. No calibrated confidence percentages are fabricated. Inconsistent/missing parcel or ownership history requires further verification. Application roles cannot alter audit rows; a privileged database administrator retains database-level control.

The visual quota meter shows recorded sales for the parcel; the rule engine groups same-seller evidence and avoids adding Khatian/Porcha entitlements twice. Complex inheritance, partition, mortgages, historical dag mapping and authoritative legal chain adjudication need further domain work. Camera QR scanning, full language translation and voice assistance are outside the implemented core.

## AI disclosure and project documents

OpenAI Codex assisted with planning, implementation, synthetic fixture generation and tests. Application document extraction uses DeepInfra vision via the OpenAI SDK; risk calculation is deterministic TypeScript. The students must understand and explain the submitted implementation.

- [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md): timed Round 1 recording script.
- [BUILD_PLAN.md](BUILD_PLAN.md): architecture, contracts and demo narrative.
- [TODO.md](TODO.md): implementation and validation status.
- [architecture_&_ui_ux.pdf](architecture_%26_ui_ux.pdf): supplied design reference.
- [master_instructions.md](master_instructions.md): supplied master brief.
- [Hackathon_Overview.md](Hackathon_Overview.md): supplied competition overview.

Round 1 requires the public repository, a concept PDF of at most three pages, and a demo video of at most 90 seconds. A live deployment is recommended. Recording and final submission are separate from application deployment.
