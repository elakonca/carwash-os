import { Prisma } from "@prisma/client";

export function sumDecimals(values: Iterable<Prisma.Decimal | string>): Prisma.Decimal {
  let total = new Prisma.Decimal(0);
  for (const value of values) {
    total = total.add(value);
  }
  return total;
}

export function moneyString(value: Prisma.Decimal | string | null | undefined): string {
  if (value === null || value === undefined) return "0.00";
  return new Prisma.Decimal(value).toFixed(2);
}
