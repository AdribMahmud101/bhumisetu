export const BENGALI_DIGITS = [
  "০",
  "১",
  "২",
  "৩",
  "৪",
  "৫",
  "৬",
  "৭",
  "৮",
  "৯",
] as const;

export const ASCII_DIGITS = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
] as const;

/**
 * Translates all ASCII digits [0-9] in any string or number to Bengali digits [০-৯].
 */
export function toBengaliDigits(value: unknown): string {
  if (value == null) return "";
  return String(value).replace(/[0-9]/g, (d) => BENGALI_DIGITS[Number(d)]);
}

/**
 * Translates all Bengali digits [০-৯] in any string to ASCII digits [0-9].
 */
export function toAsciiDigits(value: unknown): string {
  if (value == null) return "";
  return String(value).replace(/[০-৯]/g, (d) =>
    String("০১২৩৪৫৬৭৮৯".indexOf(d)),
  );
}

/**
 * Translates digits based on the active locale ("bn" -> Bengali digits, otherwise ASCII).
 */
export function formatDigits(value: unknown, locale: string = "bn"): string {
  if (value == null) return "";
  return locale === "bn" ? toBengaliDigits(value) : toAsciiDigits(value);
}
