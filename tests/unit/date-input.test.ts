import { expect, test } from "bun:test";
import { dateFromDisplay, dateToDisplay } from "../../src/lib/date-input";

test("officer dates display day first and save as ISO", () => {
  expect(dateToDisplay("2018-06-12", "en")).toBe("12/06/2018");
  expect(dateToDisplay("2018-06-12", "bn")).toBe("১২/০৬/২০১৮");
  expect(dateToDisplay("2018-06-12")).toBe("১২/০৬/২০১৮");
  expect(dateFromDisplay("12/06/2018")).toBe("2018-06-12");
  expect(dateFromDisplay("১২/০৬/২০১৮")).toBe("2018-06-12");
});

test("flexible date parsing handles diverse officer input formats", () => {
  // Single-digit month and day
  expect(dateFromDisplay("19/5/2022")).toBe("2022-05-19");
  expect(dateFromDisplay("5/5/2022")).toBe("2022-05-05");
  expect(dateFromDisplay("5/12/2022")).toBe("2022-12-05");

  // Bangla numerals
  expect(dateFromDisplay("১৯/৫/২০২২")).toBe("2022-05-19");
  expect(dateFromDisplay("৫/৫/২০২২")).toBe("2022-05-05");
  expect(dateFromDisplay("১৯/০৫/২০২২")).toBe("2022-05-19");
  expect(dateFromDisplay("১৯-৫-২০২২")).toBe("2022-05-19");
  expect(dateFromDisplay("১৯.৫.২০২২")).toBe("2022-05-19");

  // Separators (dash, dot, space)
  expect(dateFromDisplay("19-05-2022")).toBe("2022-05-19");
  expect(dateFromDisplay("19.05.2022")).toBe("2022-05-19");
  expect(dateFromDisplay("19 05 2022")).toBe("2022-05-19");
  expect(dateFromDisplay("19-5-2022")).toBe("2022-05-19");
  expect(dateFromDisplay("19.5.2022")).toBe("2022-05-19");

  // ISO formats
  expect(dateFromDisplay("2022-05-19")).toBe("2022-05-19");
  expect(dateFromDisplay("2022/5/19")).toBe("2022-05-19");
  expect(dateFromDisplay("২০২২-০৫-১৯")).toBe("2022-05-19");
  expect(dateFromDisplay("২০২২-৫-১৯")).toBe("2022-05-19");

  // Two-digit year
  expect(dateFromDisplay("19/05/22")).toBe("2022-05-19");
  expect(dateFromDisplay("19/5/22")).toBe("2022-05-19");
  expect(dateFromDisplay("12/06/85")).toBe("1985-06-12");

  // Month names (English and Bangla)
  expect(dateFromDisplay("12 February 2020")).toBe("2020-02-12");
  expect(dateFromDisplay("12-Feb-2020")).toBe("2020-02-12");
  expect(dateFromDisplay("১২ ফেব্রুয়ারি ২০২০")).toBe("2020-02-12");
  expect(dateFromDisplay("১৯ মে ২০২২")).toBe("2022-05-19");
  expect(dateFromDisplay("February 12, 2020")).toBe("2020-02-12");

  // Month + Year
  expect(dateFromDisplay("05/2022")).toBe("2022-05-01");
  expect(dateFromDisplay("5/2022")).toBe("2022-05-01");
  expect(dateFromDisplay("০৫/২০২২")).toBe("2022-05-01");
  expect(dateFromDisplay("February 2020")).toBe("2020-02-01");
  expect(dateFromDisplay("ফেব্রুয়ারি ২০২০")).toBe("2020-02-01");

  // Year only
  expect(dateFromDisplay("2022")).toBe("2022-01-01");
  expect(dateFromDisplay("২০২২")).toBe("2022-01-01");

  // Empty / null
  expect(dateFromDisplay("")).toBeNull();
  expect(dateFromDisplay("   ")).toBeNull();
  expect(dateFromDisplay(null)).toBeNull();
  expect(dateFromDisplay(undefined)).toBeNull();
});

test("invalid calendar dates are not silently converted", () => {
  expect(dateFromDisplay("31/02/2021")).toBeNull();
  expect(dateFromDisplay("12/13/2021")).toBeNull();
  expect(dateFromDisplay("12/06/201")).toBeNull();
  expect(dateFromDisplay("29/02/2020")).toBe("2020-02-29");
});


