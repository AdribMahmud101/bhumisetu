import type { LandDocument, Signal } from "@/lib/domain";
import type { createTranslator, MessageKey } from "./core";
const reasons: Record<string, MessageKey> = {
  OVERLAP: "rule_overlap_reason",
  OWNERSHIP: "rule_ownership_reason",
  MUTATION: "rule_mutation_reason",
  TIMELINE: "rule_timeline_reason",
};
export function explainSignal(
  signal: Signal,
  documents: LandDocument[],
  t: ReturnType<typeof createTranslator>["t"],
) {
  const key = reasons[signal.id];
  if (!key) return signal.detail;
  const references = signal.evidence
    .map((id) => documents.find((d) => d.id === id)?.official_number)
    .filter(Boolean)
    .join(", ");
  return t(key, { documents: references });
}
