const MONTH_NAMES: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
  জানুয়ারি: "01",
  জানুয়ারি: "01",
  ফেব্রুয়ারি: "02",
  ফেব্রুয়ারি: "02",
  মার্চ: "03",
  এপ্রিল: "04",
  মে: "05",
  জুন: "06",
  জুলাই: "07",
  আগস্ট: "08",
  আগষ্ট: "08",
  সেপ্টেম্বর: "09",
  অক্টোবর: "10",
  নভেম্বর: "11",
  ডিসেম্বর: "12",
  বৈশাখ: "04",
  জ্যৈষ্ঠ: "05",
  আষাঢ়: "06",
  শ্রাবণ: "07",
  ভাদ্র: "08",
  আশ্বিন: "09",
  কার্তিক: "10",
  অগ্রহায়ণ: "11",
  পৌষ: "12",
  মাঘ: "01",
  ফাল্গুন: "02",
  চৈত্র: "03",
};

function buildValidIso(
  yearStr: string,
  monthStr: string,
  dayStr: string,
): string | null {
  let y = Number(yearStr);
  if (yearStr.length === 2) {
    y = y >= 50 ? 1900 + y : 2000 + y;
  } else if (yearStr.length !== 4) {
    return null;
  }
  if (!Number.isInteger(y) || y < 1000 || y > 9999) return null;

  const m = Number(monthStr);
  if (!Number.isInteger(m) || m < 1 || m > 12) return null;

  const d = Number(dayStr);
  if (!Number.isInteger(d) || d < 1 || d > 31) return null;

  const yPadded = String(y).padStart(4, "0");
  const mPadded = String(m).padStart(2, "0");
  const dPadded = String(d).padStart(2, "0");
  const iso = `${yPadded}-${mPadded}-${dPadded}`;

  const parsed = new Date(`${iso}T00:00:00.000Z`);
  if (
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === iso
  ) {
    return iso;
  }
  return null;
}

export function dateToDisplay(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

export function dateFromDisplay(value: unknown): string | null {
  if (value == null) return null;
  const str = String(value).trim();
  if (!str) return null;

  // Convert Bengali numerals ০-৯ to 0-9
  const ascii = str.replace(/[০-৯]/g, (digit) =>
    String("০১২৩৪৫৬৭৮৯".indexOf(digit)),
  );

  // 1. ISO format: YYYY-MM-DD, YYYY/M/D, YYYY.M.D
  const isoMatch = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(ascii);
  if (isoMatch) {
    const res = buildValidIso(isoMatch[1], isoMatch[2], isoMatch[3]);
    if (res) return res;
  }

  // 2. Day-Month-Year (numeric): DD/MM/YYYY, D/M/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD/MM/YY
  const dmyMatch =
    /^(\d{1,2})[-/.\s,]+(\d{1,2})[-/.\s,]+(\d{2,4})$/.exec(ascii);
  if (dmyMatch) {
    const res = buildValidIso(dmyMatch[3], dmyMatch[2], dmyMatch[1]);
    if (res) return res;
  }

  // 3. Day - MonthName - Year: e.g. "12 February 2020", "১২ ফেব্রুয়ারি ২০২০", "12-Feb-2020"
  const dNameYMatch =
    /^(\d{1,2})[-/.\s,]+([a-zA-Z\u0980-\u09FF]+)[-/.\s,]+(\d{2,4})$/.exec(
      ascii,
    );
  if (dNameYMatch) {
    const monthKey = dNameYMatch[2].toLowerCase();
    const monthNum = MONTH_NAMES[monthKey];
    if (monthNum) {
      const res = buildValidIso(dNameYMatch[3], monthNum, dNameYMatch[1]);
      if (res) return res;
    }
  }

  // 4. MonthName - Day - Year: e.g. "February 12, 2020", "মে ১৯, ২০২২"
  const nameDYMatch =
    /^([a-zA-Z\u0980-\u09FF]+)[-/.\s,]+(\d{1,2})[-/.\s,]+(\d{2,4})$/.exec(
      ascii,
    );
  if (nameDYMatch) {
    const monthKey = nameDYMatch[1].toLowerCase();
    const monthNum = MONTH_NAMES[monthKey];
    if (monthNum) {
      const res = buildValidIso(nameDYMatch[3], monthNum, nameDYMatch[2]);
      if (res) return res;
    }
  }

  // 5. Month - Year: MM/YYYY, M/YYYY, MM-YYYY (defaults day to 01)
  const myMatch = /^(\d{1,2})[-/.\s,]+(\d{4})$/.exec(ascii);
  if (myMatch) {
    const res = buildValidIso(myMatch[2], myMatch[1], "01");
    if (res) return res;
  }

  // 6. MonthName - Year: e.g. "February 2020", "মে ২০২২"
  const nameYMatch = /^([a-zA-Z\u0980-\u09FF]+)[-/.\s,]+(\d{4})$/.exec(ascii);
  if (nameYMatch) {
    const monthKey = nameYMatch[1].toLowerCase();
    const monthNum = MONTH_NAMES[monthKey];
    if (monthNum) {
      const res = buildValidIso(nameYMatch[2], monthNum, "01");
      if (res) return res;
    }
  }

  // 7. Year only: YYYY (e.g. "2022", "২০২২")
  const yMatch = /^(\d{4})$/.exec(ascii);
  if (yMatch) {
    const year = Number(yMatch[1]);
    if (year >= 1800 && year <= 2100) {
      return `${yMatch[1]}-01-01`;
    }
  }

  return null;
}
