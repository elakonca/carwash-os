import { Router } from "express";
import { Prisma } from "@prisma/client";
import { ACTIVE_WORK_ORDER_STATUSES, WORK_ORDER_STATUSES, canViewReports } from "@carwash/shared";
import { moneyString } from "../../lib/money.js";
import { prisma } from "../../lib/prisma.js";
import { endOfUtcDay, startOfUtcDay } from "../../lib/serialize.js";
import { currentUser, requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/error-handler.js";

const boardCardSelect = {
  id: true,
  code: true,
  status: true,
  vehicle: { select: { plate: true, brand: true, model: true } },
  customer: { select: { firstName: true, lastName: true } },
  currentZone: { select: { name: true } },
  assignedStaff: { select: { name: true } },
} satisfies Prisma.WorkOrderSelect;

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get(
  "/board",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const [workOrders, zones, staff] = await Promise.all([
      prisma.workOrder.findMany({
        where: {
          businessId: user.businessId,
          deletedAt: null,
          status: { in: [...ACTIVE_WORK_ORDER_STATUSES] },
        },
        select: boardCardSelect,
        orderBy: { acceptedAt: "asc" },
      }),
      prisma.zone.findMany({
        where: { businessId: user.businessId, deletedAt: null },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          currentWorkOrder: { select: { vehicle: { select: { plate: true } } } },
        },
        orderBy: [{ type: "asc" }, { name: "asc" }],
      }),
      prisma.staff.findMany({
        where: { businessId: user.businessId, deletedAt: null, isActive: true },
        select: {
          id: true,
          name: true,
          specialty: true,
          workOrders: {
            where: {
              deletedAt: null,
              status: { in: [...ACTIVE_WORK_ORDER_STATUSES] },
            },
            select: {
              id: true,
              vehicle: { select: { plate: true } },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    const columns = Object.fromEntries(
      WORK_ORDER_STATUSES.filter((status) => status !== "DELIVERED" && status !== "CANCELLED").map(
        (status) => [
          status,
          workOrders.filter((wo) => wo.status === status),
        ],
      ),
    );

    res.json({
      columns,
      zones,
      staff: staff.map((member) => ({
        id: member.id,
        name: member.name,
        specialty: member.specialty,
        activeWorkOrders: member.workOrders,
      })),
    });
  }),
);

dashboardRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const todayStart = startOfUtcDay();
    const todayEnd = endOfUtcDay();

    const [inProgress, readyCount, unpaidCount, zones, todayRevenue] = await Promise.all([
      prisma.workOrder.count({
        where: {
          businessId: user.businessId,
          deletedAt: null,
          status: { in: [...ACTIVE_WORK_ORDER_STATUSES] },
        },
      }),
      prisma.workOrder.count({
        where: { businessId: user.businessId, deletedAt: null, status: "READY" },
      }),
      prisma.workOrder.count({
        where: {
          businessId: user.businessId,
          deletedAt: null,
          paymentStatus: "UNPAID",
          status: { notIn: ["CANCELLED"] },
        },
      }),
      prisma.zone.findMany({
        where: { businessId: user.businessId, deletedAt: null },
        select: { status: true },
      }),
      prisma.workOrder.aggregate({
        where: {
          businessId: user.businessId,
          deletedAt: null,
          paymentStatus: "PAID",
          acceptedAt: { gte: todayStart, lt: todayEnd },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    const occupied = zones.filter((z) => z.status === "OCCUPIED").length;
    const payload: Record<string, unknown> = {
      vehiclesInProgress: inProgress,
      readyCount,
      unpaidCount,
      zoneOccupancy: {
        occupied,
        total: zones.length,
        outOfService: zones.filter((z) => z.status === "OUT_OF_SERVICE").length,
      },
    };

    if (canViewReports(user.role)) {
      payload.todayRevenue = moneyString(todayRevenue._sum.totalAmount ?? new Prisma.Decimal(0));
    }

    res.json(payload);
  }),
);
