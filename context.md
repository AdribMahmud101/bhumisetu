# BhumiSetu session handoff

## Current objective and completed outcome

User requested a competitive, functional LandTech 2026 Round 1 prototype using the supplied architecture/UX PDF and master brief, plus public GitHub and a live Cloudflare Workers deployment. The core system is implemented and live.

- Live: https://bhumisetu.adribmahmud.workers.dev
- Repository: https://github.com/AdribMahmud101/bhumisetu
- Supabase project: `bhumishetu`, ref `xbjlzsmkhyayogjigpaq`, linked locally.
- User explicitly accepted the current workers.dev address and requested no domain complexity. Do not rename the Worker or account subdomain.
- Design: modern Bangla-first Bangladesh government portal style, inspired by land.gov.bd; clearly a synthetic-data hackathon prototype, without claims of government affiliation.

## Implemented

Next.js 15.5.28 / React 18 / TypeScript / Tailwind / Bun. Upgraded from 14 to satisfy current Cloudflare OpenNext support. Supabase Postgres + private Storage + Auth, DeepInfra vision via the OpenAI SDK, PDF.js local worker, SHA-256, QR-linked citizen reports and browser-print dossier.

Citizen search, four document categories with multiple uploads per subtype, source-linked history, deterministic evidence report, 20-versus-24 quota overflow, exact-copy hashing and extracted field comparison all work. Officer login, draft creation, real PDF/image upload, actual AI extraction, source/extracted review, correction audit, verification, separate publication and mutation queue/decisions work. All service-role access stays server-side. Direct anonymous table reads fail. Drafts and unverified documents are private. Review changes invalidate publication. Mutation decisions verify current revision; conflicting cases cannot be approved. Audit edits store old/new values, actor and reason in the same transaction.

The canonical fictional fixture computes **60/100 = 40 sale conflict + 20 deed–mutation conflict**, not 65 or 85. Source PDFs, hashes and data are actually stored in Supabase. There are clean and incomplete/private fixtures as well. Live extraction browser tests create additional private synthetic parcels; those are real test records, not a simulated success.

## Configuration and credentials

User supplied a DeepInfra key; saved in ignored, permission-restricted `.env.local` and uploaded as a Cloudflare Worker secret. Do not repeat it in chat, documentation, logs or Git. Supabase credentials are also in `.env.local` and Worker secrets. Vision model: `Qwen/Qwen3-VL-30B-A3B-Instruct` (confirmed available and live-tested).

Prototype officer credentials: ignored `.local/officer.json`. Synthetic original PDFs and altered comparison sample: `.local/fixtures/`. Secret bulk deployment input: ignored `.local/worker-secrets.json`. Never commit these files. Supabase CLI and Wrangler account authentication work.

OpenAI SDK initially failed in Workers due to Node fetch; fixed with `openai/shims/web` and explicit global fetch. Model identifier numbers are normalized to strings before field validation. Both fixes are deployed and tested.

## Validation

- 11 Bun engine unit tests passed.
- Lint, TypeScript and production/OpenNext build passed.
- All **6 Playwright Firefox browser workflows passed against the live URL**: citizen search/evidence/history/source; unauthorized access; clean/mobile view; persisted audited correction + idempotent cases + blocked approval; real PDF upload/DeepInfra extraction; exact-hash match + altered PDF area mismatch (stored 12 vs uploaded 25).
- Screenshots: ignored `.local/record-desktop.png` and `.local/record-mobile.png`.
- Database migrations applied and registered in Supabase migration history.

Run `bun run test:unit`, `bun run lint`, `bun run typecheck`, `bun run build`. Live browser suite: `TEST_BASE_URL=https://bhumisetu.adribmahmud.workers.dev bun run test:e2e`. It calls DeepInfra and writes synthetic review records. Deploy: `bun run deploy`.

## Scope and remaining human deliverables

Primary competition problem is P3 (rulebook says choose one), with digitization, integrity checks, citizen reports and mutation review supporting it. All data is fictional; no government scraping/integration. Court/khas/acquisition coverage remains explicitly unavailable. Scores are indicators, not fraud probabilities; printed reports and decisions are not official certificates/orders.

Limits: 5 MB / 3 pages per upload; handwriting accuracy not established; camera QR scanning, voice and full language translation deferred. QR links work. Auth sessions last one hour; sign in again after expiry. Complex legal ownership/partition/inheritance/dag mapping is outside the implemented prototype.

User still needs the team/mentor details, ≤3-page concept PDF, ≤90-second recording and final platform submission. `docs/DEMO_SCRIPT.md` provides the timed script. `TODO.md`, `BUILD_PLAN.md` and README document actual status and setup. Architecture reference is `architecture_&_ui_ux.pdf`; actual master file is `master_instructions.md` (`master_prompt.md` is absent).

## Citizen and officer access update

User requested separate citizen Login, Registration, and Administrative entries plus one-click judge access. Implemented and deployed `/login` (citizen), `/register` (citizen sign-up), and `/admin/login` (officer). Both login pages offer one-click demo and normal email/password login. Dedicated confirmed Supabase demo users carry server-controlled `app_metadata.role` and `demo`; credentials are only in ignored `.local/demo-accounts.json`, `.env.local`, and Worker secrets. `scripts/setup-demo.ts` provisions them. Citizen self-registration accepts name/email/password and never grants officer privileges. Supabase registration is enabled and email confirmation remains required; email delivery depends on the project's provider settings.

Seven live regression workflows passed: citizen/officer one-click access, citizen/officer normal password access, registration validation and blocked officer self-registration, anonymous access restrictions, and existing audited correction/idempotent mutation/blocked approval. Lint/typecheck and Cloudflare production build passed. Mobile registration screenshot checked in `.local/registration-mobile.png`. Shared officer demo access is intentionally public for judges working with fictional data only. Do not put demo passwords in browser code or Git.
