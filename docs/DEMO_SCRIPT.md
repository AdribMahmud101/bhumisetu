# BhumiSetu — 90-second Round 1 demo

Live: https://bhumisetu.adribmahmud.workers.dev
Primary problem: P3 — Catch Fraud & Double-Selling.

| Time | Action and narration |
| --- | --- |
| 0–10s | Homepage. “Land documents are fragmented. BhumiSetu connects the evidence before a buyer pays or an officer approves.” |
| 10–25s | Open `LND-MOCK-001`. “This fictional plot records 20 decimals, but these two deeds sell 24. The overflow is visible immediately.” |
| 25–40s | Show the two evidence alerts and deed links. “The indicator is 60: 40 for the sale conflict, 20 for the mutation conflict. Every signal cites its source. It is not a fraud probability.” |
| 40–60s | Officer workspace → Documents → review an already extracted sample. Correct a field with a reason; show the audit row. “AI extracts; the officer checks the original. Every correction preserves the old value, new value and reason.” |
| 60–73s | Mutation queue. “Verifying a sale deed creates one review case. A conflicting case requires hearing; approval is blocked.” |
| 73–85s | Citizen report → history and coverage. “The same evidence reaches the buyer. Court, khas and acquisition information are explicitly marked unavailable.” |
| 85–90s | QR / print report and repository. “AI reads. Rules explain. Officers decide.” |

Use reviewed, clearly labeled synthetic documents to keep provider latency outside the recording. A real live upload/extraction works separately; do not claim preprocessed data was extracted during the recording. Keep the canonical parcel at 60/100 after rehearsal; restore any changed fields and publish it again.

Officer credentials: ignored `.local/officer.json`. Upload samples: ignored `.local/fixtures/`. Do not show passwords, keys or developer tools containing session tokens in the recording.

Submission still needs the team's names/mentors, the ≤3-page concept PDF, the ≤90-second video, and submission through the official platform.
