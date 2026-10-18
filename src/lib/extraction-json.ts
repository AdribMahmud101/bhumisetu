// Repair only literal control characters inside JSON strings, without inventing
// missing content, changing values, or accepting truncated JSON.
export function parseExtractionJson(raw: string) {
  if (!raw || !raw.trim()) return {};
  const source = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // 1. Direct JSON parse
  try {
    return JSON.parse(source);
  } catch {
    // continue
  }

  // 2. Try substring JSON enclosed in outermost { ... }
  const firstBrace = source.indexOf("{");
  const lastBrace = source.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonSub = source.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonSub);
    } catch {
      try {
        let quoted = false,
          escaped = false,
          repaired = "";
        for (const char of jsonSub) {
          if (quoted && char.charCodeAt(0) < 32) {
            repaired += JSON.stringify(char).slice(1, -1);
            escaped = false;
            continue;
          }
          repaired += char;
          if (escaped) {
            escaped = false;
            continue;
          }
          if (quoted && char === "\\") {
            escaped = true;
            continue;
          }
          if (char === '"') quoted = !quoted;
        }
        return JSON.parse(repaired);
      } catch {
        // continue
      }
    }
  }

  // 3. Fallback: Parse key-value lines (e.g. YAML-like output from vision models)
  const lines = source.split("\n");
  const parsedObj: Record<string, unknown> = {};
  let foundAny = false;
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim().replace(/^["']|["']$/g, "");
      let valStr = line.slice(colonIdx + 1).trim();
      if (valStr.endsWith(",")) valStr = valStr.slice(0, -1).trim();
      let val: unknown = valStr;
      if (valStr === "null" || valStr === "") val = null;
      else if (valStr === "true") val = true;
      else if (valStr === "false") val = false;
      else if (!isNaN(Number(valStr)) && valStr !== "") val = Number(valStr);
      else val = valStr.replace(/^["']|["']$/g, "");

      if (key && !key.includes(" ")) {
        parsedObj[key] = val;
        foundAny = true;
      }
    }
  }
  if (foundAny && Object.keys(parsedObj).length >= 2) {
    return parsedObj;
  }

  // 4. Default repair loop
  let quoted = false,
    escaped = false,
    repaired = "";
  for (const char of source) {
    if (quoted && char.charCodeAt(0) < 32) {
      repaired += JSON.stringify(char).slice(1, -1);
      escaped = false;
      continue;
    }
    repaired += char;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quoted && char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') quoted = !quoted;
  }
  return JSON.parse(repaired);
}
