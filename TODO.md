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

1. [ ] **0–6 min · Foundation:** domain schemas; Supabase migration/RLS/private files; fictional sample PDFs and seed; officer authentication.
2. [ ] **6–10 min · Core:** shared rule engine + meaningful tests; SHA-256 and field comparison.
3. [ ] **10–17 min · Experience:** workspace, real search, four categories, evidence comparison, quota overflow, history, QR and printable report.
4. [ ] **17–25 min · Full loop:** upload → actual AI extraction → source review → audited correction → verification → mutation hearing/review → publication.
5. [ ] **25–30 min · Prove:** lint/typecheck/build/unit tests + browser workflows; update README; commit/push; deploy if account access is ready.
6. [ ] **Submission package:** ≤90-second recording, ≤3-page concept PDF, team details and final platform submission.

## Required external setup

- [ ] Supabase URL + service-role key in `.env.local`.
- [ ] Apply migration; create officer account and server-verified role.
- [ ] DeepInfra key and working configurable vision model.
- [ ] Connected hosting account for a live deployment.

## Acceptance before calling the prototype ready

- [ ] Conflicting fixture computes **40 + 20 = 60**, cites both deeds and mutation.
- [ ] Clean and incomplete fixtures display honest coverage; missing data never implies clearance.
- [ ] Real correction survives reload with old value, new value, reason and actor.
- [ ] Verify twice → one mutation case; conflict blocks approval on the server.
- [ ] Anonymous users cannot write records or view unpublished/private documents.
- [ ] Actual source files open; hashes are computed from stored bytes.
- [ ] AI errors stay visible/retryable; no fabricated extraction or API success.
- [ ] Desktop/mobile demo path and production build pass.

## Current status

Planning complete. Implementation pending. Service configuration question sent; no keys printed or committed.
