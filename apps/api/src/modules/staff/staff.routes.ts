import { Router } from "express";
import { ACTIVE_WORK_ORDER_STATUSES, createStaffSchema, updateStaffSchema } from "@carwash/shared";
import { NotFoundError } from "../../lib/errors.js";
import { routeId } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { currentUser, requireAuth, requireManager } from "../../middleware/auth.js";
import { asyncHandler, validateBody } from "../../middleware/error-handler.js";
import { serializeWorkOrder } from "../../lib/serialize.js";

export const staffRouter = Router();
staffRouter.use(requireAuth);

staffRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const items = await prisma.staff.findMany({
      where: { businessId: user.businessId, deletedAt: null },
      include: {
        workOrders: {
          where: { deletedAt: null, status: { in: [...ACTIVE_WORK_ORDER_STATUSES] } },
          include: { vehicle: true, currentZone: true },
        },
      },
      orderBy: { name: "asc" },
    });
    res.json({
      items: items.map((member) => ({
        ...member,
        workOrders: member.workOrders.map((wo) => serializeWorkOrder(wo, user.role)),
      })),
    });
  }),
);

staffRouter.post(
  "/",
  requireManager,
  validateBody(createStaffSchema),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const staff = await prisma.staff.create({
      data: { businessId: user.businessId, ...req.body },
    });
    res.status(201).json(staff);
  }),
);

staffRouter.put(
  "/:id",
  requireManager,
  validateBody(updateStaffSchema),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const staff = await prisma.staff.findFirst({
      where: { id: routeId(req), businessId: user.businessId, deletedAt: null },
    });
    if (!staff) throw new NotFoundError("Staff not found");
    const updated = await prisma.staff.update({
      where: { id: staff.id },
      data: req.body,
    });
    res.json(updated);
  }),
);
