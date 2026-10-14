import { Router } from "express";
import { createZoneSchema, paginationSchema, updateZoneSchema } from "@carwash/shared";
import { NotFoundError, UnprocessableEntityError } from "../../lib/errors.js";
import { routeId } from "../../lib/http.js";
import { pageArgs, pageMeta } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { currentUser, requireAuth, requireManager } from "../../middleware/auth.js";
import { asyncHandler, validateBody, validateQuery } from "../../middleware/error-handler.js";

export const zonesRouter = Router();
zonesRouter.use(requireAuth);

zonesRouter.get(
  "/",
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const query = req.query as unknown as { page: number; pageSize: number; cursor?: string };
    const where = { businessId: user.businessId, deletedAt: null };
    const [zones, total] = await Promise.all([
      prisma.zone.findMany({
        where,
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          currentWorkOrder: { select: { vehicle: { select: { plate: true } } } },
        },
        orderBy: [{ type: "asc" }, { name: "asc" }, { id: "asc" }],
        ...pageArgs(query),
      }),
      prisma.zone.count({ where }),
    ]);
    res.json(pageMeta(zones, total, query));
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
