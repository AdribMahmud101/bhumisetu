import { Analysis, Land, LandDocument, normalize, Signal } from "./domain";
const units = (n: unknown) => Math.round(Number(n || 0) * 100);
export function analyzeRecords(land: Land, input: LandDocument[]): Analysis {
  const seen = new Set<string>();
  const docs = input.filter((d) => {
    if (d.verification_status !== "VERIFIED") return false;
    const key = d.sha256 || `${d.category}:${normalize(d.official_number)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const related = docs.filter(
    (d) => normalize(d.dag_number) === normalize(land.dag_number),
  );
  const sales = related
    .filter((d) => d.category === "DEED" && d.sub_type === "SAF_KABALA")
    .sort((a, b) =>
      (a.document_date || "").localeCompare(b.document_date || ""),
    );
  const baselines = related.filter((d) =>
    ["KHATIAN", "PORCHA"].includes(d.category),
  );
  const signals: Signal[] = [];
  const conflicting = new Set<string>();
  let largestExcess = 0;
  const missing = [
    "Court litigation: Not Checked / Data Unavailable",
    "Khas land: Not Checked / Data Unavailable",
    "Acquisition: Not Checked / Data Unavailable",
  ];
  if (!baselines.length)
    missing.push("Verified Khatian/Porcha baseline unavailable");
  if (input.some((d) => d.verification_status !== "VERIFIED"))
    missing.push("Unverified documents excluded from analysis");
  if (docs.some((d) => !d.dag_number || d.area_decimals == null))
    missing.push("Some document parcel/area fields are missing");
  if (
    docs.some(
      (d) =>
        d.dag_number && normalize(d.dag_number) !== normalize(land.dag_number),
    )
  )
    missing.push("Document parcel relationship needs review");
  const sellers = Array.from(
    new Set(
      sales.map((d) => normalize(d.seller_or_prior_owner)).filter(Boolean),
    ),
  );
  for (const seller of sellers) {
    const owned = baselines.filter(
      (d) =>
        normalize(d.buyer_or_current_owner) === seller &&
        d.area_decimals != null,
    );
    if (!owned.length) continue;
    // A Khatian and its Porcha describe the same entitlement; do not sum them.
    const available = Math.max(...owned.map((d) => units(d.area_decimals)));
    const deeds = sales.filter(
      (d) => normalize(d.seller_or_prior_owner) === seller,
    );
    const total = deeds.reduce((s, d) => s + units(d.area_decimals), 0);
    const explicitOverlap = deeds.some(
      (d, i) =>
        !!d.share_identity &&
        deeds
          .slice(i + 1)
          .some(
            (e) => normalize(e.share_identity) === normalize(d.share_identity),
          ),
    );
    if (total > available || explicitOverlap) {
      deeds.forEach((d) => conflicting.add(d.id));
      largestExcess = Math.max(largestExcess, total - available);
      const existing = signals.find((s) => s.id === "OVERLAP");
      if (existing)
        existing.evidence.push(
          ...deeds.map((d) => d.id),
          ...owned.map((d) => d.id),
        );
      else
        signals.push({
          id: "OVERLAP",
          title: "বিক্রিত জমিতে সংঘাত / Excess or overlapping sale",
          points: 40,
          detail: `${deeds.map((d) => d.official_number).join(" + ")} records ${(total / 100).toFixed(2)} decimals against ${(available / 100).toFixed(2)} recorded for the same seller. ${explicitOverlap ? "The same share identifier appears more than once." : "The recorded entitlement is exceeded."}`,
          evidence: [...owned, ...deeds].map((d) => d.id),
        });
    }
  }
  for (const deed of sales) {
    const prior = related.filter(
      (d) =>
        d.id !== deed.id &&
        d.document_date &&
        deed.document_date &&
        d.document_date < deed.document_date &&
        ["KHATIAN", "PORCHA", "DEED"].includes(d.category),
    );
    const known = prior
      .map((d) => normalize(d.buyer_or_current_owner))
      .filter(Boolean);
    if (
      known.length &&
      deed.seller_or_prior_owner &&
      !known.includes(normalize(deed.seller_or_prior_owner)) &&
      !signals.some((s) => s.id === "OWNERSHIP")
    )
      signals.push({
        id: "OWNERSHIP",
        title: "মালিকানার ধারাবাহিকতায় অমিল / Ownership chain conflict",
        points: 25,
        detail: `Seller in ${deed.official_number} does not appear in the available prior recorded-party chain. Further source verification is required.`,
        evidence: [deed.id, ...prior.map((d) => d.id)],
      });
  }
  const mutations = related.filter((d) => d.category === "MUTATION");
  for (const mut of mutations) {
    const target = sales.find(
      (d) =>
        normalize(d.official_number) === normalize(mut.based_on_deed) &&
        conflicting.has(d.id),
    );
    const earlier =
      target &&
      sales.find(
        (d) =>
          conflicting.has(d.id) &&
          d.document_date &&
          target.document_date &&
          d.document_date < target.document_date,
      );
    if (target && earlier && !signals.some((s) => s.id === "MUTATION"))
      signals.push({
        id: "MUTATION",
        title: "দলিল–নামজারিতে সংঘাত / Deed–mutation conflict",
        points: 20,
        detail: `Mutation ${mut.official_number} references ${target.official_number}, while earlier competing deed ${earlier.official_number} is recorded for ${earlier.buyer_or_current_owner}.`,
        evidence: [mut.id, target.id, earlier.id],
      });
  }
  for (const deed of sales) {
    const backdated =
      deed.execution_date &&
      deed.document_date &&
      deed.document_date < deed.execution_date;
    const previous = sales.find(
      (d) =>
        d.id !== deed.id &&
        d.document_date &&
        deed.document_date &&
        d.document_date < deed.document_date &&
        normalize(d.buyer_or_current_owner) ===
          normalize(deed.seller_or_prior_owner),
    );
    const delta =
      previous && deed.document_date
        ? (Date.parse(deed.document_date) -
            Date.parse(previous.document_date!)) /
          86400000
        : Infinity;
    if ((backdated || delta <= 30) && !signals.some((s) => s.id === "TIMELINE"))
      signals.push({
        id: "TIMELINE",
        title: "তারিখে অসংগতি / Transaction timeline signal",
        points: 15,
        detail: backdated
          ? `${deed.official_number} has a registration date before execution.`
          : `${deed.official_number} records an onward transfer within 30 days. This is a review signal.`,
        evidence: [deed.id, ...(previous ? [previous.id] : [])],
      });
  }
  signals.forEach((s) => (s.evidence = Array.from(new Set(s.evidence))));
  const sold = sales.reduce((s, d) => s + units(d.area_decimals), 0) / 100;
  return {
    score: Math.min(
      100,
      signals.reduce((s, r) => s + r.points, 0),
    ),
    signals,
    coverage: docs.length,
    pending: input.length - docs.length,
    recorded: Number(land.total_area_decimals),
    sold,
    excess: Math.max(0, largestExcess / 100),
    missing,
    status: signals.length
      ? "Potential conflict detected"
      : !baselines.length || input.length !== docs.length
        ? "Further verification required"
        : "No conflict found in available records",
    version: "BS-RULES-1.0",
  };
}
