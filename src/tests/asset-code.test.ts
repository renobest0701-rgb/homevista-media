import { describe, it, expect } from "vitest";
import { generateAssetCode, generateProjectCode } from "@/lib/utils/asset-code";

describe("Asset code generation", () => {
  it("generates asset code in HV-YYYYMMDD-XXXXX format", () => {
    const code = generateAssetCode();
    expect(code).toMatch(/^HV-\d{8}-[A-Z0-9_-]{6}$/);
  });

  it("generates unique asset codes", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateAssetCode()));
    expect(codes.size).toBe(100);
  });

  it("generates project code with default prefix", () => {
    const code = generateProjectCode();
    expect(code).toMatch(/^PRJ-[A-Z0-9_-]{6}$/);
  });

  it("generates project code with custom prefix", () => {
    const code = generateProjectCode("HV");
    expect(code).toMatch(/^HV-[A-Z0-9_-]{6}$/);
  });
});
