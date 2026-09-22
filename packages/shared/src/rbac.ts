import type { UserRole } from "./enums.js";

export const PRICE_HIDDEN_ROLES: UserRole[] = ["STAFF"];
export const REPORT_HIDDEN_ROLES: UserRole[] = ["STAFF"];

export function canViewPrices(role: UserRole): boolean {
  return !PRICE_HIDDEN_ROLES.includes(role);
}

export function canViewReports(role: UserRole): boolean {
  return !REPORT_HIDDEN_ROLES.includes(role);
}

export function canManageSettings(role: UserRole): boolean {
  return role === "OWNER" || role === "MANAGER";
}

export function canOverridePaymentAmount(role: UserRole): boolean {
  return role === "OWNER" || role === "MANAGER";
}

export function canManageUsers(role: UserRole): boolean {
  return role === "OWNER";
}

const PRICE_KEYS = new Set([
  "price",
  "totalAmount",
  "total_amount",
  "priceSnapshot",
  "price_snapshot",
  "amountOverride",
  "todayRevenue",
  "revenue",
  "totalSpent",
]);

export function stripPriceFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripPriceFields(item)) as T;
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (PRICE_KEYS.has(key)) continue;
      result[key] = stripPriceFields(nested);
    }
    return result as T;
  }
  return value;
}
