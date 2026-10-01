import { Router } from "express";
import { ACTIVE_WORK_ORDER_STATUSES, createStaffSchema, paginationSchema, updateStaffSchema } from "@carwash/shared";
import { NotFoundError } from "../../lib/errors.js";
import { routeId } from "../../lib/http.js";
import { pageArgs, pageMeta } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { currentUser, requireAuth, requireManager } from "../../middleware/auth.js";
import { asyncHandler, validateBody, validateQuery } from "../../middleware/error-handler.js";

export const staffRouter = Router();
staffRouter.use(requireAuth);

staffRouter.get(
  "/",
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const query = req.query as unknown as { page: number; pageSize: number; cursor?: string };
    const where = { businessId: user.businessId, deletedAt: null };
    const [items, total] = await Promise.all([
      prisma.staff.findMany({
        where,
        include: {
          workOrders: {
            where: { deletedAt: null, status: { in: [...ACTIVE_WORK_ORDER_STATUSES] } },
            select: { id: true, vehicle: { select: { plate: true } } },
            take: 20,
          },
        },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        ...pageArgs(query),
      }),
      prisma.staff.count({ where }),
    ]);
    res.json(pageMeta(items, total, query));
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
