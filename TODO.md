# BhumiSetu — sprint tracker

Strategy, contracts and acceptance criteria: [BUILD_PLAN.md](BUILD_PLAN.md).
Primary track: **P3 — Catch Fraud & Double-Selling**. Target: **30 minutes after service setup**.
Mark complete only after the listed behavior is verified. Add actual check results as work proceeds.

## Done

- [x] Publish and validate the initial scaffold.
- [x] Review architecture/UX PDF, master brief and original hackathon rules.
- [x] Lock stack and P3 focus; derive canonical fixture score as 60/100.
- [x] Document architecture, demo story, build order and acceptance gates.

## Implement in order

1. [x] **0–6 min · Foundation:** domain schemas; Supabase migration/RLS/private files; fictional sample PDFs and seed; officer authentication.
2. [x] **6–10 min · Core:** shared rule engine + meaningful tests; SHA-256 and field comparison.
3. [x] **10–17 min · Experience:** workspace, real search, four categories, evidence comparison, quota overflow, history, QR and printable report.
4. [x] **17–25 min · Full loop:** upload → actual AI extraction → source review → audited correction → verification → mutation hearing/review → publication.
5. [x] **25–30 min · Prove:** lint/typecheck/build/unit tests + browser workflows; update README; commit/push; deploy if account access is ready.
6. [ ] **Submission package:** ≤90-second recording, ≤3-page concept PDF, team details and final platform submission.

## Required external setup

- [x] Supabase URL + service-role key in `.env.local`.
- [x] Apply migration; create officer account and server-verified role.
- [x] DeepInfra key and working configurable vision model.
- [x] Connected hosting account for a live deployment.

## Acceptance before calling the prototype ready

- [x] Conflicting fixture computes **40 + 20 = 60**, cites both deeds and mutation.
- [x] Clean and incomplete fixtures display honest coverage; missing data never implies clearance.
- [x] Real correction survives reload with old value, new value, reason and actor.
- [x] Verify twice → one mutation case; conflict blocks approval on the server.
- [x] Anonymous users cannot write records or view unpublished/private documents.
- [x] Actual source files open; hashes are computed from stored bytes.
- [x] AI errors stay visible/retryable; no fabricated extraction or API success.
- [x] Desktop/mobile demo path and production build pass.

## Current status

Core implementation complete. Supabase schema/fixtures/officer account are configured. Eleven unit tests, lint, typecheck, production build and five local browser workflows passed. Live Worker: https://bhumisetu.adribmahmud.workers.dev. All six browser workflows passed against the live Worker, including actual AI extraction and the altered-copy 12-versus-25 field mismatch. Camera scanning is deferred; QR links are functional. No keys or officer passwords are committed.

## Recorded implementation details

- Next.js upgraded to 15.5.28 for the supported Cloudflare OpenNext adapter.
- Supabase session is checked on the server; session cookie is HttpOnly and Secure over HTTPS.
- Private generated sources and tampered test sample are under `.local/fixtures/`; officer credentials are in `.local/officer.json`.
- AI extraction was tested against actual uploaded PDFs. Workers runtime fetch compatibility and identifier normalization are fixed and live-tested.
- Timed recording script: `docs/DEMO_SCRIPT.md`. Final video, concept PDF, team details and platform submission remain pending.

## Final verification

- 11 unit tests passed; lint/typecheck and production/OpenNext build passed.
- 6/6 live Firefox workflows passed (32.6 seconds).
- Direct anonymous Supabase table read rejected (401).
- Cloudflare address retained per user preference; no account/domain changes.

## Judge access update

- [x] Header entries: citizen login, citizen registration and administrative login.
- [x] One-click citizen and officer demo sessions with dedicated synthetic accounts.
- [x] Preserve normal email/password login for both roles and citizen registration.
- [x] Enforce officer role on server; reject citizen privilege escalation.
- [x] Deploy and pass 7 live authentication/regression browser workflows.

## Bangla / English interface

- [x] Shared typed catalogs and one language provider; no runtime translation service.
- [x] Persistent language cookie, server-rendered language and accessible switch.
- [x] Localized navigation, forms, officer dialogs, validation messages, statuses and reports.
- [x] Preserve entered values, record identities, evidence and authentication during switching.
- [x] Local unit checks and desktop/mobile/print browser checks.
- [x] Final live regression: all 15 browser workflows passed on the deployed Worker; catalogs and production build pass.

## Upload-first digitization

- [x] Save private source/intake before requiring parcel metadata.
- [x] Extract document fields and nullable parcel metadata; preserve unknown values.
- [x] Officer confirmation with source/reason and parcel correction audit.
- [x] Transactional, idempotent attachment into a pending private land record.
- [x] Keep manual entry, original preview, retry and session resume.
- [x] Open Documents tab after confirmation; separate review/publication.
- [x] Shared Bangla/English messages; preserve entered fields during switching.
- [x] Final deployed browser regression: all 17 live workflows passed.
