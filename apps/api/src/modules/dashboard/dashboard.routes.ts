import { Router } from "express";
import { ACTIVE_WORK_ORDER_STATUSES, WORK_ORDER_STATUSES, canViewReports } from "@carwash/shared";
import { prisma } from "../../lib/prisma.js";
import { endOfUtcDay, serializeWorkOrder, startOfUtcDay, workOrderInclude } from "../../lib/serialize.js";
import { currentUser, requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/error-handler.js";

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
        include: workOrderInclude,
        orderBy: { acceptedAt: "asc" },
      }),
      prisma.zone.findMany({
        where: { businessId: user.businessId, deletedAt: null },
        include: {
          currentWorkOrder: { include: { vehicle: true, assignedStaff: true } },
        },
        orderBy: [{ type: "asc" }, { name: "asc" }],
      }),
      prisma.staff.findMany({
        where: { businessId: user.businessId, deletedAt: null, isActive: true },
        include: {
          workOrders: {
            where: {
              deletedAt: null,
              status: { in: [...ACTIVE_WORK_ORDER_STATUSES] },
            },
            include: { vehicle: true, currentZone: true },
          },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    const columns = Object.fromEntries(
      WORK_ORDER_STATUSES.filter((status) => status !== "DELIVERED" && status !== "CANCELLED").map(
        (status) => [
          status,
          workOrders
            .filter((wo) => wo.status === status)
            .map((wo) => serializeWorkOrder(wo, user.role)),
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
        activeWorkOrders: member.workOrders.map((wo) => serializeWorkOrder(wo, user.role)),
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

    const [inProgress, readyCount, unpaidCount, zones, todayPaid] = await Promise.all([
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
      prisma.workOrder.findMany({
        where: {
          businessId: user.businessId,
          deletedAt: null,
          paymentStatus: "PAID",
          acceptedAt: { gte: todayStart, lt: todayEnd },
        },
        select: { totalAmount: true },
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
      payload.todayRevenue = todayPaid.reduce((sum, wo) => sum + Number(wo.totalAmount), 0);
    }

    res.json(payload);
  }),
);
