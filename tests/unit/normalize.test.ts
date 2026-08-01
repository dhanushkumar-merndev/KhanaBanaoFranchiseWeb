import { describe, expect, it } from "vitest";
import {
  isValidIndianMobile,
  normalizeEmail,
  normalizePhone,
  normalizeText,
  toTitleCase,
} from "@/lib/domain/normalize";

describe("phone normalization", () => {
  it("canonicalises every shape a person might type", () => {
    for (const input of [
      "9876543210",
      "09876543210",
      "+91 98765 43210",
      "91-9876543210",
      "+919876543210",
      " 98765 43210 ",
    ]) {
      expect(normalizePhone(input)).toBe("+919876543210");
    }
  });

  it("returns digits only when the number is not a valid Indian mobile", () => {
    // Landline-style prefix: kept visible rather than silently rewritten.
    expect(normalizePhone("0422 2345678")).toBe("04222345678");
    expect(normalizePhone("12345")).toBe("12345");
    expect(normalizePhone("")).toBe("");
  });

  it("accepts only mobile prefixes 6-9", () => {
    expect(isValidIndianMobile("9876543210")).toBe(true);
    expect(isValidIndianMobile("6012345678")).toBe(true);
    expect(isValidIndianMobile("5876543210")).toBe(false);
    expect(isValidIndianMobile("98765")).toBe(false);
    expect(isValidIndianMobile("")).toBe(false);
  });
});

describe("email normalization", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Ramesh.Iyer@Example.COM ")).toBe(
      "ramesh.iyer@example.com",
    );
  });

  it("leaves gmail dots and plus tags alone", () => {
    // Two addresses that Gmail treats as one are still two distinct records
    // here; collapsing them would merge unrelated people on other providers.
    expect(normalizeEmail("a.b+franchise@gmail.com")).toBe(
      "a.b+franchise@gmail.com",
    );
  });
});

describe("text normalization", () => {
  it("collapses internal whitespace", () => {
    expect(normalizeText("  Ramesh   Kumar  Iyer ")).toBe("Ramesh Kumar Iyer");
  });

  it("title-cases while preserving acronyms", () => {
    expect(toTitleCase("ramesh IYER")).toBe("Ramesh IYER");
    expect(toTitleCase("gst certificate")).toBe("Gst Certificate");
    expect(toTitleCase("coimbatore  SOUTH")).toBe("Coimbatore SOUTH");
  });
});
