# BhumiSetu — 90-second demonstration

Live application: https://bhumisetu.adribmahmud.workers.dev

The film presents P1, P2, P3 and P5 through the working application. The final delivery has Soniox Priya Bangla narration and burned-in Bangla subtitles. Eight separate recorded lines fit explicit speech windows with silent transition gaps.

- [Bangla narration and speech windows](../videos/bhumisetu-demo/SCRIPT.md)
- [Storyboard](../videos/bhumisetu-demo/STORYBOARD.md)
- [Machine-readable timing](../videos/bhumisetu-demo/TIMING.json)
- [Bangla subtitles](../videos/bhumisetu-demo/captions.bn.srt)
- [Production evidence and reproduction](../videos/bhumisetu-demo/PRODUCTION.md)
- [Final narrated MP4](../videos/bhumisetu-demo/renders/BhumiSetu_90s_Bangla_Priya.mp4)

| Picture time | Demonstration |
| --- | --- |
| 0–7s | Human stakes: a family's savings and inconsistent land documents. |
| 7–15s | Four connected capabilities: digitization, deed comparison, sale-conflict alerts and citizen checks. |
| 15–33s | Actual upload and OCR of a fictional Bangla Khatian. Officer corrections remain visible beside the original. |
| 33–43s | Editable document fields and an existing audit entry with old/new values and reason. |
| 43–57s | Actual 20-decimal parcel with two 12-decimal claims, followed by the supporting deed and mutation evidence. |
| 57–70s | Actual altered-deed upload, extraction, verification action and 12-versus-25 area mismatch. |
| 70–83s | Citizen QR lookup, the published record, exported QR and printable report. |
| 83–90s | “এআই পড়ে। নিয়ম অমিল দেখায়। মানুষ সিদ্ধান্ত নেয়।” |

The captured canonical fixture was `LND-MOCK-001`, with a 65/100 rule indicator at capture. The film explains its evidence; the indicator is not a probability of fraud. This replaces the older rehearsal script's 60/100 snapshot.

All application footage uses actual responses and fictional sample records. Only provider wait intervals were shortened, with an on-screen label; `SOURCE_RANGES.json` preserves the edit timings. No API response was mocked. OCR is shown as editable output, including actual corrections, rather than perfect automatic recognition. The audit entry is existing historical evidence, separate from the unconfirmed filmed intake. That intake was aborted after recording.

Authenticated browser state and raw recordings remain in ignored `.local/` files. Do not include them in the submission. The Priya voice track was generated and measured line by line; each line ends within its allocated window.

The submission package still needs final team/mentor details and submission through the official platform. The concept PDF draft and narrated 90-second film are available in this repository.
