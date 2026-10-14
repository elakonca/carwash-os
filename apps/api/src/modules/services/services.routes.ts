import { Router } from "express";
import { createServiceSchema, paginationSchema, updateServiceSchema, canViewPrices } from "@carwash/shared";
import { NotFoundError } from "../../lib/errors.js";
import { routeId } from "../../lib/http.js";
import { pageArgs, pageMeta } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { currentUser, requireAuth, requireManager } from "../../middleware/auth.js";
import { asyncHandler, validateBody, validateQuery } from "../../middleware/error-handler.js";

export const servicesRouter = Router();
servicesRouter.use(requireAuth);

servicesRouter.get(
  "/",
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const query = req.query as unknown as { page: number; pageSize: number; cursor?: string };
    const where = { businessId: user.businessId, deletedAt: null };
    const [items, total] = await Promise.all([
      prisma.service.findMany({
        where,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        ...pageArgs(query),
      }),
      prisma.service.count({ where }),
    ]);
    const payload = canViewPrices(user.role)
      ? items
      : items.map(({ price: _price, ...rest }) => rest);
    res.json(pageMeta(payload, total, query));
  }),
);

servicesRouter.post(
  "/",
  requireManager,
  validateBody(createServiceSchema),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const service = await prisma.service.create({
      data: { businessId: user.businessId, ...req.body },
    });
    res.status(201).json(service);
  }),
);

servicesRouter.put(
  "/:id",
  requireManager,
  validateBody(updateServiceSchema),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const service = await prisma.service.findFirst({
      where: { id: routeId(req), businessId: user.businessId, deletedAt: null },
    });
    if (!service) throw new NotFoundError("Service not found");
    const updated = await prisma.service.update({
      where: { id: service.id },
      data: req.body,
    });
    res.json(updated);
  }),
);
