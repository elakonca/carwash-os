import { Router } from "express";
import { createZoneSchema, updateZoneSchema } from "@carwash/shared";
import { NotFoundError, UnprocessableEntityError } from "../../lib/errors.js";
import { routeId } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { currentUser, requireAuth, requireManager } from "../../middleware/auth.js";
import { asyncHandler, validateBody } from "../../middleware/error-handler.js";

export const zonesRouter = Router();
zonesRouter.use(requireAuth);

zonesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const zones = await prisma.zone.findMany({
      where: { businessId: user.businessId, deletedAt: null },
      include: {
        currentWorkOrder: {
          include: {
            vehicle: true,
            customer: true,
            assignedStaff: true,
          },
        },
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
    res.json({ items: zones });
  }),
);

zonesRouter.post(
  "/",
  requireManager,
  validateBody(createZoneSchema),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const zone = await prisma.zone.create({
      data: {
        businessId: user.businessId,
        name: req.body.name,
        type: req.body.type,
        status: req.body.status ?? "EMPTY",
      },
    });
    res.status(201).json(zone);
  }),
);

zonesRouter.put(
  "/:id",
  requireManager,
  validateBody(updateZoneSchema),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const zone = await prisma.zone.findFirst({
      where: { id: routeId(req), businessId: user.businessId, deletedAt: null },
    });
    if (!zone) throw new NotFoundError("Zone not found");
    if (req.body.status === "EMPTY" && zone.currentWorkOrderId) {
      throw new UnprocessableEntityError(
        "Cannot mark occupied zone as empty",
        "ZONE_OCCUPIED",
      );
    }
    const updated = await prisma.zone.update({
      where: { id: zone.id },
      data: req.body,
    });
    res.json(updated);
  }),
);
