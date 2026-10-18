import { expect, test } from "bun:test";
import { dateFromDisplay, dateToDisplay } from "../../src/lib/date-input";

test("officer dates display day first and save as ISO", () => {
  expect(dateToDisplay("2018-06-12")).toBe("12/06/2018");
  expect(dateFromDisplay("12/06/2018")).toBe("2018-06-12");
  expect(dateFromDisplay("১২/০৬/২০১৮")).toBe("2018-06-12");
});

test("invalid calendar dates are not silently converted", () => {
  expect(dateFromDisplay("31/02/2021")).toBeNull();
  expect(dateFromDisplay("12/13/2021")).toBeNull();
  expect(dateFromDisplay("12/06/201")).toBeNull();
  expect(dateFromDisplay("29/02/2020")).toBe("2020-02-29");
});
