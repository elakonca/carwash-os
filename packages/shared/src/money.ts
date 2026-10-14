import { z } from "zod";

/** Canonical money string with exactly two fractional digits. */
export const moneySchema = z
  .union([z.string().trim(), z.number().finite().nonnegative()])
  .transform((value, ctx) => {
    const raw = typeof value === "number" ? value.toFixed(2) : value;
    if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid money amount" });
      return z.NEVER;
    }
    const [whole, frac = ""] = raw.split(".");
    return `${whole}.${frac.padEnd(2, "0").slice(0, 2)}`;
  });

export function toCents(value: string): bigint {
  const negative = value.startsWith("-");
  const [whole, frac = ""] = value.replace("-", "").split(".");
  const cents = BigInt(whole || "0") * 100n + BigInt((frac + "00").slice(0, 2));
  return negative ? -cents : cents;
}

export function fromCents(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const whole = abs / 100n;
  const frac = (abs % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${frac}`;
}

export function addMoney(left: string, right: string): string {
  return fromCents(toCents(left) + toCents(right));
}

export function sumMoney(values: string[]): string {
  return fromCents(values.reduce((total, value) => total + toCents(value), 0n));
}
