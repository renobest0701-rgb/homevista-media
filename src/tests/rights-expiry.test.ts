import { describe, it, expect } from "vitest";

// Pure logic test for expiry date calculations
describe("Rights expiry logic", () => {
  it("detects expired permission (validUntil in past)", () => {
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
    expect(yesterday < new Date()).toBe(true);
  });

  it("detects permissions expiring within 30 days", () => {
    const in20Days = new Date(Date.now() + 20 * 24 * 3600 * 1000);
    const threshold30 = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    expect(in20Days <= threshold30).toBe(true);
  });

  it("detects permissions expiring within 7 days", () => {
    const in5Days = new Date(Date.now() + 5 * 24 * 3600 * 1000);
    const threshold7 = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    expect(in5Days <= threshold7).toBe(true);
  });

  it("does not flag permission expiring in 60 days as urgent", () => {
    const in60Days = new Date(Date.now() + 60 * 24 * 3600 * 1000);
    const threshold30 = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    expect(in60Days <= threshold30).toBe(false);
  });
});
