import { nanoid } from "nanoid";

// Asset code format: HV-YYYYMMDD-XXXXX
export function generateAssetCode(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = nanoid(6).toUpperCase();
  return `HV-${date}-${random}`;
}

// Project code format: PRJ-XXXXX
export function generateProjectCode(prefix = "PRJ"): string {
  const random = nanoid(6).toUpperCase();
  return `${prefix}-${random}`;
}
