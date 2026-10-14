import { Prisma } from "@prisma/client";
import {
  ACTIVE_WORK_ORDER_STATUSES,
  DOMAIN_EVENTS,
  InvalidTransitionError,
  assertTransition,
  canOverridePaymentAmount,
  canViewPrices,
  isTerminalStatus,
  normalizePlate,
  type CreateDamageInput,
  type CreateWorkOrderInput,
  type ListWorkOrdersQuery,
  type PaymentInput,
  type TransitionWorkOrderInput,
  type UserRole,
} from "@carwash/shared";
import { domainEvents } from "../../lib/events.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnprocessableEntityError,
} from "../../lib/errors.js";
import { sumDecimals } from "../../lib/money.js";
import { pageArgs, pageMeta } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { endOfUtcDay, serializeWorkOrder, startOfUtcDay, workOrderInclude } from "../../lib/serialize.js";
import { syncWorkOrderZone } from "../../lib/zone-lock.js";
import type { RequestUser } from "../../middleware/auth.js";

function currentFromStatus(
  logs: { fromStatus: string | null; toStatus: string }[],
  toStatus: string,
): string | null {
  const latest = logs.find((log) => log.toStatus === toStatus);
  return latest?.fromStatus ?? logs[0]?.fromStatus ?? null;
}

async function getTenantWorkOrder(businessId: string, id: string) {
  const workOrder = await prisma.workOrder.findFirst({
    where: { id, businessId, deletedAt: null },
    include: workOrderInclude,
  });
  if (!workOrder) throw new NotFoundError("Work order not found");
  return workOrder;
}

async function resolveCustomerAndVehicle(
  tx: Prisma.TransactionClient,
  businessId: string,
  input: CreateWorkOrderInput,
) {
  if (input.vehicleId) {
    const vehicle = await tx.vehicle.findFirst({
      where: { id: input.vehicleId, businessId, deletedAt: null },
      include: { customer: true },
    });
    if (!vehicle) throw new NotFoundError("Vehicle not found");
    return { vehicle, customer: vehicle.customer };
  }

  const plate = normalizePlate(input.plate ?? input.vehicle?.plate ?? "");
  if (!plate) throw new UnprocessableEntityError("Plate is required");

  const existing = await tx.vehicle.findFirst({
    where: { businessId, plate },
    include: { customer: true },
  });

  if (existing) {
    if (existing.deletedAt) {
      const restored = await tx.vehicle.update({
        where: { id: existing.id },
        data: { deletedAt: null, ...input.vehicle },
        include: { customer: true },
      });
      return { vehicle: restored, customer: restored.customer };
    }
    return { vehicle: existing, customer: existing.customer };
  }

  let customer = input.customerId
    ? await tx.customer.findFirst({
        where: { id: input.customerId, businessId, deletedAt: null },
      })
    : null;

  if (!customer && input.customer) {
    const byPhone = await tx.customer.findFirst({
      where: { businessId, phone: input.customer.phone },
    });
    if (byPhone) {
      customer = byPhone.deletedAt
        ? await tx.customer.update({
            where: { id: byPhone.id },
            data: {
              deletedAt: null,
              firstName: input.customer.firstName,
              lastName: input.customer.lastName,
              email: input.customer.email || null,
              note: input.customer.note,
            },
          })
        : byPhone;
    } else {
      customer = await tx.customer.create({
        data: {
          businessId,
          firstName: input.customer.firstName,
          lastName: input.customer.lastName,
          phone: input.customer.phone,
          email: input.customer.email || null,
          note: input.customer.note,
        },
      });
    }
  }

  if (!customer) {
    throw new UnprocessableEntityError(
      "Customer is required for a new vehicle",
      "CUSTOMER_REQUIRED",
    );
  }

  const vehicle = await tx.vehicle.create({
    data: {
      businessId,
      customerId: customer.id,
      plate,
      brand: input.vehicle?.brand,
      model: input.vehicle?.model,
      year: input.vehicle?.year,
      color: input.vehicle?.color,
      note: input.vehicle?.note,
    },
    include: { customer: true },
  });

  return { vehicle, customer: vehicle.customer };
}

export async function createWorkOrder(user: RequestUser, input: CreateWorkOrderInput) {
  const created = await prisma.$transaction(async (tx) => {
    const { vehicle, customer } = await resolveCustomerAndVehicle(tx, user.businessId, input);

    const services = await tx.service.findMany({
      where: {
        id: { in: input.serviceIds },
        businessId: user.businessId,
        deletedAt: null,
        isActive: true,
      },
    });
    if (services.length !== input.serviceIds.length) {
      throw new UnprocessableEntityError("One or more services are invalid");
    }

    const totalAmount = sumDecimals(services.map((service) => service.price));
    const estimatedMinutes = services.reduce((sum, service) => sum + service.estimatedMinutes, 0);

    const business = await tx.business.update({
      where: { id: user.businessId },
      data: { workOrderSeq: { increment: 1 } },
    });
    const code = `WO-${business.workOrderSeq}`;

    const workOrder = await tx.workOrder.create({
      data: {
        businessId: user.businessId,
        code,
        vehicleId: vehicle.id,
        customerId: customer.id,
        status: "ACCEPTED",
        source: input.source,
        note: input.note,
        estimatedDeliveryAt: input.estimatedDeliveryAt
          ? new Date(input.estimatedDeliveryAt)
          : new Date(Date.now() + estimatedMinutes * 60 * 1000),
        assignedStaffId: input.assignedStaffId,
        totalAmount,
        createdBy: user.id,
        services: {
          create: services.map((service) => ({
            businessId: user.businessId,
            serviceId: service.id,
            nameSnapshot: service.name,
            priceSnapshot: service.price,
            estimatedMinutesSnapshot: service.estimatedMinutes,
          })),
        },
        statusLogs: {
          create: {
            businessId: user.businessId,
            fromStatus: null,
            toStatus: "ACCEPTED",
            staffId: input.assignedStaffId,
            userId: user.id,
            zoneId: input.zoneId,
          },
        },
      },
    });

    const zoneId = await syncWorkOrderZone({
      tx,
      businessId: user.businessId,
      workOrderId: workOrder.id,
      previousZoneId: null,
      nextZoneId: input.zoneId,
      nextStatus: "ACCEPTED",
    });

    if (zoneId) {
      await tx.workOrder.update({
        where: { id: workOrder.id },
        data: { currentZoneId: zoneId },
      });
    }

    return tx.workOrder.findFirstOrThrow({
      where: { id: workOrder.id },
      include: workOrderInclude,
    });
  });

  domainEvents.emitEvent(DOMAIN_EVENTS.WORK_ORDER_CREATED, {
    workOrderId: created.id,
    businessId: created.businessId,
    code: created.code,
    source: created.source,
  });

  return serializeWorkOrder(created, user.role);
}

export async function listWorkOrders(user: RequestUser, query: ListWorkOrdersQuery) {
  const where: Prisma.WorkOrderWhereInput = {
    businessId: user.businessId,
    deletedAt: null,
  };

  if (query.status === "active" || !query.status) {
    where.status = { in: [...ACTIVE_WORK_ORDER_STATUSES] };
  } else if (query.status !== "all") {
    where.status = query.status;
  }

  if (query.date === "today") {
    where.acceptedAt = { gte: startOfUtcDay(), lt: endOfUtcDay() };
  }
  if (query.staffId) where.assignedStaffId = query.staffId;
  if (query.zoneId) where.currentZoneId = query.zoneId;
  if (query.plate) {
    where.vehicle = { plate: { contains: normalizePlate(query.plate), mode: "insensitive" } };
  }

  const [items, total] = await Promise.all([
    prisma.workOrder.findMany({
      where,
      include: workOrderInclude,
      orderBy: [{ acceptedAt: "desc" }, { id: "desc" }],
      ...pageArgs(query),
    }),
    prisma.workOrder.count({ where }),
  ]);

  return pageMeta(
    items.map((item) => serializeWorkOrder(item, user.role)),
    total,
    query,
  );
}

export async function getWorkOrder(user: RequestUser, id: string) {
  const workOrder = await getTenantWorkOrder(user.businessId, id);
  return serializeWorkOrder(workOrder, user.role);
}

export async function transitionWorkOrder(
  user: RequestUser,
  id: string,
  input: TransitionWorkOrderInput,
) {
  try {
    const updated = await prisma.$transaction(
      async (tx) => {
        const current = await tx.workOrder.findFirst({
          where: { id, businessId: user.businessId, deletedAt: null },
        });
        if (!current) throw new NotFoundError("Work order not found");
        if (isTerminalStatus(current.status)) {
          throw new UnprocessableEntityError(
            "Terminal work orders cannot transition",
            "INVALID_TRANSITION",
          );
        }

        assertTransition(current.status, input.toStatus);

        if (input.staffId) {
          const staff = await tx.staff.findFirst({
            where: { id: input.staffId, businessId: user.businessId, deletedAt: null, isActive: true },
          });
          if (!staff) throw new NotFoundError("Staff not found");
        }

        const nextZoneId = await syncWorkOrderZone({
          tx,
          businessId: user.businessId,
          workOrderId: current.id,
          previousZoneId: current.currentZoneId,
          nextZoneId: input.zoneId,
          nextStatus: input.toStatus,
        });

        const nextStaffId =
          input.staffId === undefined ? current.assignedStaffId : input.staffId;

        await tx.workOrder.update({
          where: { id: current.id },
          data: {
            status: input.toStatus,
            currentZoneId: nextZoneId,
            assignedStaffId: nextStaffId,
            deliveredAt: input.toStatus === "DELIVERED" ? new Date() : current.deliveredAt,
            cancelledReason:
              input.toStatus === "CANCELLED"
                ? current.cancelledReason ?? "Cancelled via transition"
                : current.cancelledReason,
          },
        });

        await tx.workOrderStatusLog.create({
          data: {
            businessId: user.businessId,
            workOrderId: current.id,
            fromStatus: current.status,
            toStatus: input.toStatus,
            zoneId: nextZoneId,
            staffId: nextStaffId,
            userId: user.id,
          },
        });

        return tx.workOrder.findFirstOrThrow({
          where: { id: current.id },
          include: workOrderInclude,
        });
      },
      { isolationLevel: "ReadCommitted" },
    );

    domainEvents.emitEvent(DOMAIN_EVENTS.WORK_ORDER_STATUS_CHANGED, {
      workOrderId: updated.id,
      businessId: updated.businessId,
      fromStatus: currentFromStatus(updated.statusLogs, input.toStatus),
      toStatus: input.toStatus,
    });

    if (input.toStatus === "READY") {
      domainEvents.emitEvent(DOMAIN_EVENTS.WORK_ORDER_READY, {
        workOrderId: updated.id,
        businessId: updated.businessId,
        fromStatus: null,
        toStatus: "READY",
      });
    }

    return serializeWorkOrder(updated, user.role);
  } catch (error) {
    if (error instanceof InvalidTransitionError) {
      throw new UnprocessableEntityError(error.message, "INVALID_TRANSITION", {
        from: error.from,
        to: error.to,
      });
    }
    if (error instanceof ConflictError) throw error;
    throw error;
  }
}

export async function assignStaff(user: RequestUser, id: string, staffId: string | null) {
  const workOrder = await getTenantWorkOrder(user.businessId, id);
  if (staffId) {
    const staff = await prisma.staff.findFirst({
      where: { id: staffId, businessId: user.businessId, deletedAt: null, isActive: true },
    });
    if (!staff) throw new NotFoundError("Staff not found");
  }

  const updated = await prisma.workOrder.update({
    where: { id: workOrder.id },
    data: { assignedStaffId: staffId },
    include: workOrderInclude,
  });
  return serializeWorkOrder(updated, user.role);
}

export async function addDamage(user: RequestUser, id: string, input: CreateDamageInput) {
  const workOrder = await getTenantWorkOrder(user.businessId, id);
  if (input.photoId) {
    const photo = await prisma.workOrderPhoto.findFirst({
      where: { id: input.photoId, workOrderId: workOrder.id, deletedAt: null },
    });
    if (!photo) throw new NotFoundError("Photo not found");
  }

  return prisma.damageRecord.create({
    data: {
      businessId: user.businessId,
      workOrderId: workOrder.id,
      vehicleId: workOrder.vehicleId,
      area: input.area,
      type: input.type,
      note: input.note,
      photoId: input.photoId,
    },
  });
}

export async function recordPayment(user: RequestUser, id: string, input: PaymentInput) {
  if (input.amountOverride !== undefined && !canOverridePaymentAmount(user.role)) {
    throw new ForbiddenError("STAFF cannot override payment amount");
  }

  const workOrder = await getTenantWorkOrder(user.businessId, id);
  const snapshotTotal = sumDecimals(workOrder.services.map((service) => service.priceSnapshot));
  const totalAmount =
    input.amountOverride !== undefined ? new Prisma.Decimal(input.amountOverride) : snapshotTotal;

  const updated = await prisma.workOrder.update({
    where: { id: workOrder.id },
    data: {
      paymentMethod: input.method,
      paymentStatus: input.status,
      totalAmount,
    },
    include: workOrderInclude,
  });
  return serializeWorkOrder(updated, user.role);
}

export async function cancelWorkOrder(user: RequestUser, id: string, reason: string) {
  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.workOrder.findFirst({
      where: { id, businessId: user.businessId, deletedAt: null },
    });
    if (!current) throw new NotFoundError("Work order not found");
    if (isTerminalStatus(current.status)) {
      throw new UnprocessableEntityError(
        "Terminal work orders cannot be cancelled",
        "INVALID_TRANSITION",
      );
    }

    await syncWorkOrderZone({
      tx,
      businessId: user.businessId,
      workOrderId: current.id,
      previousZoneId: current.currentZoneId,
      nextZoneId: null,
      nextStatus: "CANCELLED",
    });

    await tx.workOrderStatusLog.create({
      data: {
        businessId: user.businessId,
        workOrderId: current.id,
        fromStatus: current.status,
        toStatus: "CANCELLED",
        zoneId: null,
        staffId: current.assignedStaffId,
        userId: user.id,
      },
    });

    return tx.workOrder.update({
      where: { id: current.id },
      data: {
        status: "CANCELLED",
        currentZoneId: null,
        cancelledReason: reason,
      },
      include: workOrderInclude,
    });
  });

  domainEvents.emitEvent(DOMAIN_EVENTS.WORK_ORDER_STATUS_CHANGED, {
    workOrderId: updated.id,
    businessId: updated.businessId,
    fromStatus: updated.statusLogs[0]?.fromStatus ?? null,
    toStatus: "CANCELLED",
  });

  return serializeWorkOrder(updated, user.role);
}

export async function addPhoto(params: {
  user: RequestUser;
  workOrderId: string;
  category: "FRONT" | "BACK" | "LEFT" | "RIGHT" | "INTERIOR" | "DELIVERY";
  fileUrl: string;
}) {
  const workOrder = await getTenantWorkOrder(params.user.businessId, params.workOrderId);
  return prisma.workOrderPhoto.create({
    data: {
      businessId: params.user.businessId,
      workOrderId: workOrder.id,
      category: params.category,
      fileUrl: params.fileUrl,
      uploadedBy: params.user.id,
    },
  });
}

export function hidePricesIfNeeded<T>(role: UserRole, payload: T): T {
  return canViewPrices(role) ? payload : payload;
}
