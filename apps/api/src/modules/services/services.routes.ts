import { Router } from "express";
import { createServiceSchema, updateServiceSchema, canViewPrices } from "@carwash/shared";
import { NotFoundError } from "../../lib/errors.js";
import { routeId } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { currentUser, requireAuth, requireManager } from "../../middleware/auth.js";
import { asyncHandler, validateBody } from "../../middleware/error-handler.js";

export const servicesRouter = Router();
servicesRouter.use(requireAuth);

servicesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const items = await prisma.service.findMany({
      where: { businessId: user.businessId, deletedAt: null },
      orderBy: { name: "asc" },
    });
    const payload = canViewPrices(user.role)
      ? items
      : items.map(({ price: _price, ...rest }) => rest);
    res.json({ items: payload });
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
