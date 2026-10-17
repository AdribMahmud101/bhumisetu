// Repair only literal control characters inside JSON strings, without inventing
// missing content, changing values, or accepting truncated JSON.
export function parseExtractionJson(raw: string) {
  const source = raw
    .replace(/^```(?:json)?\s*/, "")
    .replace(/\s*```$/, "")
    .trim();
  try {
    return JSON.parse(source);
  } catch {
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
}
