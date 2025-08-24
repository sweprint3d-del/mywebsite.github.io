import { calculatePrice } from "../src/lib/pricing";

test("Calculate price for 100g PLA, 1 file", () => {
  expect(calculatePrice(100, "PLA", 1)).toBe(94);
});

test("Calculate price for 100g PLA, 3 files", () => {
  expect(calculatePrice(100, "PLA", 3)).toBe(114);
});
