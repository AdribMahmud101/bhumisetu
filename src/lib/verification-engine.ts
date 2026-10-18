import {
  Analysis,
  Land,
  LandDocument,
  normalize,
  SeverityLevel,
  Signal,
  VerificationAlert,
  VerificationResult,
} from "./domain";

export type { SeverityLevel, VerificationAlert, VerificationResult };

const units = (n: unknown) => Math.round(Number(n || 0) * 100);

export function runVerificationEngineWithData(
  land: Land,
  input: LandDocument[],
): VerificationResult {
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

  const triggeredAlerts: VerificationAlert[] = [];
  const reasonsShort: string[] = [];
  const conflictingDeedIds = new Set<string>();

  // Rule 1: RULE_DOUBLE_SALE (Weight: 40)
  // Two or more deeds transfer the identical land portion/area from the same seller where cumulative transfers exceed ownership.
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
    const deeds = sales.filter(
      (d) => normalize(d.seller_or_prior_owner) === seller,
    );
    if (!owned.length && !deeds.length) continue;
    const available = owned.length
      ? Math.max(...owned.map((d) => units(d.area_decimals)))
      : 0;
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

    if ((owned.length > 0 && total > available) || explicitOverlap) {
      deeds.forEach((d) => conflictingDeedIds.add(d.id));
      let reason = "";
      if (deeds.length >= 2) {
        const areaStr = (deeds[0].area_decimals ?? (total / 100)).toString();
        const buyersStr = deeds
          .map((d) => {
            const yr = (d.document_date || "").slice(0, 4);
            return yr
              ? `${d.buyer_or_current_owner} in ${yr}`
              : `${d.buyer_or_current_owner}`;
          })
          .join(" & ");
        reason = `${areaStr} decimals sold twice to different buyers (${buyersStr}) from the same Dag.`;
      } else {
        reason = `Cumulative sales of ${(total / 100).toFixed(2)} decimals exceed recorded ownership entitlement of ${(available / 100).toFixed(2)} decimals.`;
      }

      triggeredAlerts.push({
        ruleId: "RULE_DOUBLE_SALE",
        shortTitle: "বিক্রিত জমিতে সংঘাত / Double-Selling Alert",
        weight: 40,
        shortReason: reason,
        evidenceDocs: Array.from(
          new Set([...owned, ...deeds].map((d) => d.id)),
        ),
      });
      reasonsShort.push(`Double-Selling Alert: ${reason}`);
    }
  }

  // Rule 2: RULE_OWNERSHIP_CONFLICT (Weight: 25)
  // Subsequent transfer occurs without continuous chain of title, or a deed is executed by a party who already transferred their entitlement.
  let ownershipTriggered = false;
  for (let i = 0; i < sales.length; i++) {
    if (ownershipTriggered) break;
    const deed = sales[i];
    const sellerNorm = normalize(deed.seller_or_prior_owner);

    // Part A: Party already transferred their entitlement
    const priorSalesBySeller = sales
      .slice(0, i)
      .filter((d) => normalize(d.seller_or_prior_owner) === sellerNorm);
    const ownedForSeller = baselines.filter(
      (d) =>
        normalize(d.buyer_or_current_owner) === sellerNorm &&
        d.area_decimals != null,
    );
    const availableForSeller = ownedForSeller.length
      ? Math.max(...ownedForSeller.map((d) => units(d.area_decimals)))
      : 0;
    const priorAreaSold = priorSalesBySeller.reduce(
      (s, d) => s + units(d.area_decimals),
      0,
    );
    const hasSameShareAlreadySold =
      !!deed.share_identity &&
      priorSalesBySeller.some(
        (p) => normalize(p.share_identity) === normalize(deed.share_identity),
      );
    const isExceedingPriorEntitlement =
      ownedForSeller.length > 0 &&
      priorAreaSold + units(deed.area_decimals) > availableForSeller &&
      priorSalesBySeller.length > 0;

    if (hasSameShareAlreadySold || isExceedingPriorEntitlement) {
      ownershipTriggered = true;
      conflictingDeedIds.add(deed.id);
      const reason = `Subsequent transfer Deed ${deed.official_number || "—"} executed after prior entitlement for this portion was already transferred.`;
      triggeredAlerts.push({
        ruleId: "RULE_OWNERSHIP_CONFLICT",
        shortTitle: "মালিকানার ধারাবাহিকতায় অমিল / Ownership History Conflict",
        weight: 25,
        shortReason: reason,
        evidenceDocs: Array.from(
          new Set([deed.id, ...priorSalesBySeller.map((p) => p.id)]),
        ),
      });
      reasonsShort.push(`Ownership Conflict: ${reason}`);
      break;
    }

    // Part B: Continuous chain of title
    const priorRecords = related.filter(
      (d) =>
        d.id !== deed.id &&
        d.document_date &&
        deed.document_date &&
        d.document_date < deed.document_date &&
        ["KHATIAN", "PORCHA", "DEED"].includes(d.category),
    );
    const knownOwners = priorRecords
      .map((d) => normalize(d.buyer_or_current_owner))
      .filter(Boolean);
    if (
      knownOwners.length > 0 &&
      sellerNorm &&
      !knownOwners.includes(sellerNorm)
    ) {
      ownershipTriggered = true;
      conflictingDeedIds.add(deed.id);
      const reason = `Seller in deed ${deed.official_number || "—"} does not appear in the prior recorded-party chain of title.`;
      triggeredAlerts.push({
        ruleId: "RULE_OWNERSHIP_CONFLICT",
        shortTitle: "মালিকানার ধারাবাহিকতায় অমিল / Ownership History Conflict",
        weight: 25,
        shortReason: reason,
        evidenceDocs: Array.from(
          new Set([deed.id, ...priorRecords.map((p) => p.id)]),
        ),
      });
      reasonsShort.push(`Ownership Conflict: ${reason}`);
      break;
    }
  }

  // Rule 3: RULE_RECORD_MISMATCH (Weight: 20 nominal)
  // Namjari record is registered under a subsequent buyer while an earlier sale deed for the exact same parcel portion remains unmutated / conflicting.
  const mutations = related.filter((d) => d.category === "MUTATION");
  for (const mut of mutations) {
    const targetDeed = sales.find(
      (d) =>
        normalize(d.official_number) === normalize(mut.based_on_deed) &&
        conflictingDeedIds.has(d.id),
    );
    const earlierCompetingDeed =
      targetDeed &&
      sales.find(
        (d) =>
          conflictingDeedIds.has(d.id) &&
          d.id !== targetDeed.id &&
          d.document_date &&
          targetDeed.document_date &&
          d.document_date < targetDeed.document_date,
      );

    if (targetDeed && earlierCompetingDeed) {
      // Deduplication: Since targetDeed is part of double sale / ownership conflict,
      // prevent double counting by contributing 0 points to riskScore.
      const isAlreadyCoveredByDeedConflict =
        conflictingDeedIds.has(targetDeed.id) &&
        (triggeredAlerts.some((a) => a.ruleId === "RULE_DOUBLE_SALE") ||
          triggeredAlerts.some((a) => a.ruleId === "RULE_OWNERSHIP_CONFLICT"));

      const effectiveWeight = isAlreadyCoveredByDeedConflict ? 0 : 20;
      const reason = `${mut.buyer_or_current_owner}’s Namjari overlaps with ${earlierCompetingDeed.buyer_or_current_owner}’s prior un-mutated registered deed.`;

      triggeredAlerts.push({
        ruleId: "RULE_RECORD_MISMATCH",
        shortTitle: "দলিল–নামজারিতে সংঘাত / Deed–Mutation Conflict",
        weight: effectiveWeight,
        shortReason: reason,
        evidenceDocs: Array.from(
          new Set([mut.id, targetDeed.id, earlierCompetingDeed.id]),
        ),
      });
      reasonsShort.push(`Namjari Conflict: ${reason}`);
      break;
    }
  }

  // Rule 4: RULE_SUSPICIOUS_TIMELINE (Weight: 15)
  // Unusually rapid back-to-back sales or out-of-sequence registration dates.
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

    if (backdated || delta <= 30) {
      const reason = backdated
        ? `${deed.official_number || "Deed"} has a registration date before execution.`
        : `${deed.official_number || "Deed"} records an onward transfer within 30 days.`;
      triggeredAlerts.push({
        ruleId: "RULE_SUSPICIOUS_TIMELINE",
        shortTitle: "তারিখে অসংগতি / Suspicious Transfer Timeline",
        weight: 15,
        shortReason: reason,
        evidenceDocs: Array.from(
          new Set([deed.id, ...(previous ? [previous.id] : [])]),
        ),
      });
      reasonsShort.push(`Suspicious Timeline: ${reason}`);
      break;
    }
  }

  // Score calculation
  const riskScore = Math.min(
    100,
    triggeredAlerts.reduce((sum, a) => sum + a.weight, 0),
  );

  const severityLevel: SeverityLevel =
    riskScore >= 75
      ? "critical"
      : riskScore >= 50
        ? "elevated"
        : riskScore >= 30
          ? "moderate"
          : "low";

  const riskLabel =
    severityLevel === "critical"
      ? "Critical Conflict Indicator"
      : severityLevel === "elevated"
        ? "Elevated Risk Indicator"
        : severityLevel === "moderate"
          ? "Moderate Risk Indicator"
          : "Low Risk Indicator";

  const overallStatus =
    triggeredAlerts.length > 0
      ? "Potential Conflict Detected"
      : !baselines.length || input.length !== docs.length
        ? "Further verification required"
        : "No conflict found in available records";

  const buyerVerdict =
    severityLevel === "critical"
      ? "High Risk of Conflicting Ownership - Do Not Purchase"
      : severityLevel === "elevated" || severityLevel === "moderate"
        ? "Further Verification Required before purchase"
        : "No conflict found in available records";

  // Coverage
  const checkedRecords = docs.map((d) => {
    const catName =
      d.category === "KHATIAN"
        ? `${d.sub_type || "RS"} Khatian`
        : d.category === "PORCHA"
          ? `${d.sub_type || "Certified"} Porcha`
          : d.category === "DEED"
            ? `Deed`
            : `Mutation`;
    return `${catName} (${d.official_number || "—"})`;
  });

  const missingOrExternalSources: Array<{
    name: string;
    status: "Not checked / Data unavailable";
  }> = [
    {
      name: "Court Litigation Registry",
      status: "Not checked / Data unavailable",
    },
    {
      name: "Khas & Land Acquisition Registry",
      status: "Not checked / Data unavailable",
    },
  ];

  if (!baselines.length) {
    missingOrExternalSources.push({
      name: "Verified Khatian/Porcha baseline",
      status: "Not checked / Data unavailable",
    });
  }
  if (input.some((d) => d.verification_status !== "VERIFIED")) {
    missingOrExternalSources.push({
      name: "Unverified submitted documents",
      status: "Not checked / Data unavailable",
    });
  }

  const recordedOwner =
    baselines[0]?.buyer_or_current_owner ||
    sales[0]?.seller_or_prior_owner ||
    "—";

  return {
    masterLandId: land.unique_land_id || land.id,
    parcelSummary: {
      district: land.district || "—",
      upazila: land.upazila || "—",
      mouza: land.mouza || "—",
      khatianAndDag: `Khatian: ${land.current_khatian_no || "—"}, Dag: ${land.dag_number || "—"}`,
      totalRecordedArea: `${land.total_area_decimals || 0} Decimals`,
      recordedOwner,
    },
    riskScore,
    maxScore: 100,
    severityLevel,
    riskLabel,
    overallStatus,
    buyerVerdict,
    reasonsShort,
    triggeredAlerts,
    coverage: {
      checkedRecords,
      missingOrExternalSources,
    },
    verificationStatus:
      "Manual or official AC Land / Sub-Registry verification required",
  };
}

export async function runVerificationEngine(
  masterLandId: string,
): Promise<VerificationResult> {
  const { loadLand } = await import("./data");
  const { land, documents } = await loadLand(masterLandId, true);
  return runVerificationEngineWithData(land, documents);
}

export function analyzeRecords(land: Land, input: LandDocument[]): Analysis {
  const result = runVerificationEngineWithData(land, input);

  const signals: Signal[] = result.triggeredAlerts.map((a) => {
    const id = a.ruleId.replace("RULE_", "");
    return {
      id:
        id === "DOUBLE_SALE"
          ? "OVERLAP"
          : id === "OWNERSHIP_CONFLICT"
            ? "OWNERSHIP"
            : id === "RECORD_MISMATCH"
              ? "MUTATION"
              : id === "SUSPICIOUS_TIMELINE"
                ? "TIMELINE"
                : id,
      title: a.shortTitle,
      points: a.weight,
      detail: a.shortReason,
      evidence: a.evidenceDocs,
    };
  });

  const docs = input.filter((d) => d.verification_status === "VERIFIED");
  const related = docs.filter(
    (d) => normalize(d.dag_number) === normalize(land.dag_number),
  );
  const sales = related.filter(
    (d) => d.category === "DEED" && d.sub_type === "SAF_KABALA",
  );
  const baselines = related.filter((d) =>
    ["KHATIAN", "PORCHA"].includes(d.category),
  );
  const available = baselines.length
    ? Math.max(...baselines.map((d) => units(d.area_decimals)))
    : 0;
  const sold = sales.reduce((s, d) => s + units(d.area_decimals), 0) / 100;
  const excess = Math.max(0, (sold * 100 - available) / 100);

  const missing = result.coverage.missingOrExternalSources.map(
    (m) => `${m.name}: ${m.status}`,
  );

  return {
    score: result.riskScore,
    signals,
    coverage: docs.length,
    pending: input.length - docs.length,
    recorded: Number(land.total_area_decimals),
    sold,
    excess,
    missing,
    status: result.overallStatus,
    version: "BS-RULES-2.0",
    verificationResult: result,
  };
}
