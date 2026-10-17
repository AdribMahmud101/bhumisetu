const digits = (text: string) =>
  text
    .normalize("NFC")
    .replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 2534));
export function groundExtraction(
  raw: Record<string, any>,
  nativeText: string,
  category: string,
) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Invalid extraction result");
  const transcription =
    typeof raw.source_text === "string" ? raw.source_text.slice(0, 6000) : "";
  const source = digits(nativeText || transcription);
  const output: Record<string, any> = {
    ...raw,
    parcel: { ...(raw.parcel || {}) },
  };
  const adjustments: string[] = [];
  const assign = (key: string, value: unknown, parcel = false) => {
    const target = parcel ? output.parcel : output;
    if (target[key] !== value) {
      target[key] = value;
      adjustments.push((parcel ? "parcel." : "") + key);
    }
  };
  // A date cannot be grounded when its year does not occur in the available source.
  if (source)
    for (const key of ["document_date", "execution_date"]) {
      const year =
        typeof raw[key] === "string"
          ? digits(raw[key]).match(/^\d{4}/)?.[0]
          : undefined;
      if (year && !source.includes(year)) assign(key, null);
    }
  if (category !== "MUTATION") assign("based_on_deed", null);
  if (["KHATIAN", "PORCHA"].includes(category) && source) {
    // Only normalize a single, explicit measured quantity; ambiguous/multiple areas stay for review.
    const measured = [
      ...source.matchAll(
        /(?<![\d.,/−-])(\d+(?:\.\d+)?)\s*(একর|acres?\b|শতাংশ|শতক|decimals?\b)/gi,
      ),
    ];
    const measuredContext =
      measured.length === 1
        ? source.slice(
            Math.max(0, (measured[0].index || 0) - 60),
            measured[0].index,
          )
        : "";
    const shareOnly =
      /অংশ|share|percent/i.test(measuredContext) &&
      !/পরিমাণ|জমির|area/i.test(measuredContext);
    if (measured.length === 1 && !shareOnly) {
      const area =
        Number(measured[0][1]) * (/একর|acre/i.test(measured[0][2]) ? 100 : 1);
      if (area > 0 && area <= 10000000) {
        const rounded = Math.round(area * 10000) / 10000;
        assign("area_decimals", rounded);
        assign("total_area_decimals", rounded, true);
      }
    }
    const candidates: string[] = [];
    for (const line of source.split(/[\r\n]/)) {
      if (/সাবেক|previous|former|old\s+khatian/i.test(line)) continue;
      const match = line.match(
        /(?:খতিয়ান|খতিয়ান|khatian)\s*(?:নং|নম্বর|no\.?|number)?\s*[:：-]?\s*((?:(?:আরএস|সিএস|এসএ|বিএস|RS|CS|SA|BS|BRS)[-\s]*)?\d+(?:[-/]\d+)*)/i,
      );
      if (match) candidates.push(match[1].trim());
    }
    const current = [...new Set(candidates)];
    if (current.length === 1) {
      assign("current_khatian_no", current[0], true);
      if (
        category === "KHATIAN" &&
        !/নথির\s*পরিচিতি\s*নম্বর|document\s*(?:id|identity)/i.test(source)
      )
        assign("official_number", current[0]);
    }
  }
  return {
    raw: output,
    evidence: {
      transcription,
      source_kind: nativeText ? "native_text" : "model_transcription",
      adjustments,
    },
  };
}
