import type { Prisma } from "@prisma/client";
import { canViewPrices, type UserRole } from "@carwash/shared";

export const workOrderInclude = {
  vehicle: true,
  customer: true,
  currentZone: true,
  assignedStaff: true,
  services: true,
  photos: { where: { deletedAt: null } },
  damages: { where: { deletedAt: null } },
  statusLogs: {
    orderBy: { createdAt: "desc" as const },
    include: { user: { select: { id: true, name: true } }, staff: true, zone: true },
  },
} satisfies Prisma.WorkOrderInclude;

export function serializeWorkOrder<T extends Record<string, unknown>>(
  workOrder: T,
  role: UserRole,
): T {
  if (canViewPrices(role)) return workOrder;
    const { totalAmount: _total, ...rest } = workOrder;
    const services = Array.isArray(workOrder.services)
      ? workOrder.services.map((service) => {
          if (!service || typeof service !== "object") return service;
          const { priceSnapshot: _price, ...serviceRest } = service as Record<string, unknown>;
          return serviceRest;
        })
      : workOrder.services;
    return { ...rest, services } as unknown as T;
}

export function startOfUtcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function endOfUtcDay(date = new Date()): Date {
  const start = startOfUtcDay(date);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}
