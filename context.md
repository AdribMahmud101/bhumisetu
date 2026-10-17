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

Limits: 5 MB / 3 pages per upload; handwriting accuracy not established; camera QR scanning and voice deferred; the interface now supports full Bangla/English switching. QR links work. Auth sessions last one hour; sign in again after expiry. Complex legal ownership/partition/inheritance/dag mapping is outside the implemented prototype.

User still needs the team/mentor details, ≤3-page concept PDF, ≤90-second recording and final platform submission. `docs/DEMO_SCRIPT.md` provides the timed script. `TODO.md`, `BUILD_PLAN.md` and README document actual status and setup. Architecture reference is `architecture_&_ui_ux.pdf`; actual master file is `master_instructions.md` (`master_prompt.md` is absent).

## Citizen and officer access update

User requested separate citizen Login, Registration, and Administrative entries plus one-click judge access. Implemented and deployed `/login` (citizen), `/register` (citizen sign-up), and `/admin/login` (officer). Both login pages offer one-click demo and normal email/password login. Dedicated confirmed Supabase demo users carry server-controlled `app_metadata.role` and `demo`; credentials are only in ignored `.local/demo-accounts.json`, `.env.local`, and Worker secrets. `scripts/setup-demo.ts` provisions them. Citizen self-registration accepts name/email/password and never grants officer privileges. Supabase registration is enabled and email confirmation remains required; email delivery depends on the project's provider settings.

Seven live regression workflows passed: citizen/officer one-click access, citizen/officer normal password access, registration validation and blocked officer self-registration, anonymous access restrictions, and existing audited correction/idempotent mutation/blocked approval. Lint/typecheck and Cloudflare production build passed. Mobile registration screenshot checked in `.local/registration-mobile.png`. Shared officer demo access is intentionally public for judges working with fictional data only. Do not put demo passwords in browser code or Git.

Email-confirmation redirects now use the live Workers site; localhost login remains an allowed development redirect. Only those two auth URL properties were updated, and email confirmation remains enabled.


## Bangla / English localization update

Implemented and deployed persistent bn/en switching across the interface, including auth, navigation, citizen evidence/history/document reports, officer forms/dialogs, status labels, known validation/server errors and print layouts. `src/i18n/bn.json` and `en.json` hold 371 reviewed messages. `core.ts` provides typed keys/interpolation/known-message aliases and Intl date formatting; `provider.tsx` holds the shared React context and switch. No external translation service/dependency or DOM text rewriting is used. The `bs-locale` cookie is read in the root server layout (default bn) and updated immediately on switch; HTML lang stays correct on reload/navigation. Root routes render dynamically to respect the locale cookie.

Names, official IDs, numeric evidence, uploaded source files, user inputs and audit reasons are not translated or mutated. Known engine signals retain their original IDs/points/evidence; `evidence.ts` renders localized explanations using those references. Mutation API responses now include already-loaded source documents for the officer explanation. Unknown provider/source text remains original rather than being guessed. Both create and review dialogs have their own language control, preserving open form state.

Validation: 17 unit tests passed; `bun run i18n:check` verifies complete catalogs, matching placeholders, valid aliases and no untranslated JSX copy. Lint/typecheck and the Cloudflare production build passed. All **15 live Playwright browser workflows passed** in 48.6 seconds, including language persistence/server HTML, preserved form values/localized errors, English desktop/mobile/print reports, officer dialog switching, all previous authentication flows and actual DeepInfra extraction/document comparison. Screenshots: `.local/report-en-desktop.png` and `.local/report-en-mobile.png`. Live URL remains unchanged.

## Upload-first digitization update

User approved replacing mandatory manual parcel creation with upload-first intake. Implemented `CreateLandDialog`: choose category/subtype, save original privately, run actual vision extraction, confirm parcel metadata with source/reason, then open Documents for existing pending review. Manual parcel-first entry remains optional. New shared catalog messages cover both languages; changing locale preserves entered values. JL and khatian identifiers may remain empty when unavailable; mandatory district/upazila/mouza/dag/positive baseline area require officer confirmation.

Applied migration `20261017000400_document_intake.sql` to linked Supabase. `document_intakes` is service-role-only, owner-scoped via authenticated server routes. Confirmation RPC locks the intake, creates master+pending document atomically, retains original/extraction metadata, audits parcel corrections, and returns the same IDs on repeat confirmation. Neither verification nor publication happens automatically. AI never substitutes a deed/mutation transfer area for baseline entitlement. Retry/manual continuation retain the stored original; the browser session remembers an unfinished intake. Polling resumes running extraction; a two-minute stale lock can recover after a terminated worker.

Reference distinction: this is an internal digitization draft, not the official mutation draft khatian. Official application and subsequent verification/proposal guidance: https://mutation.land.gov.bd/nirdeshika and https://mutation.land.gov.bd/namjari-steps.

Local validation: 20 unit tests, typecheck, lint, 389-message catalog check, and 6 targeted Firefox workflows passed, including real PDF/DeepInfra extraction, private pending draft, idempotent confirmation, correction audit, source access, invalid extraction/manual continuation and locale preservation. Final live deployment/regression status recorded below.

Final outcome: deployed to the existing Worker (version `87ec859e-54f6-4c96-b08f-1911d2bb985b`). All **17 live Firefox workflows passed** in 1.1 minutes, including real intake extraction, citizen/other-officer intake access rejection, idempotent confirmation, audit and existing auth/verification/comparison regressions. Production/OpenNext build passed. No credentials are committed.

Deed subtype update: added `OTHER` to the shared DEED type list. Existing bn/en catalogs render it as অন্যান্য / Other. The intake and existing-document upload selectors and server validation all use this same list.

Extraction robustness fix: an uploaded deed returned `based_on_deed: false`, causing strict schema rejection. Model boolean values now become null (unknown) for document and parcel fields before validation; valid extracted fields and actual reference strings remain intact. Objects/other malformed values still fail validation. The model prompt explicitly defines references as strings/null, never yes/no flags. Regression tests cover this exact failure and retained valid data.

The real `demo assets/saf_kabla.jpg` live test also exposed unsupported model date formats. Extraction now normalizes Bangla digits in ISO dates and leaves unsupported/ambiguous/impossible dates null instead of guessing or rejecting otherwise valid extraction. Strict manual review validation is unchanged. Added date regression coverage (23 unit tests pass).
