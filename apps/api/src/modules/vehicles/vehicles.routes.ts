import { Router } from "express";
import { createVehicleSchema, listVehiclesQuerySchema, normalizePlate, paginationSchema } from "@carwash/shared";
import { ConflictError, NotFoundError } from "../../lib/errors.js";
import { routeId } from "../../lib/http.js";
import { pageArgs, pageMeta } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { currentUser, requireAuth } from "../../middleware/auth.js";
import { asyncHandler, validateBody, validateQuery } from "../../middleware/error-handler.js";
import { serializeWorkOrder } from "../../lib/serialize.js";

export const vehiclesRouter = Router();
vehiclesRouter.use(requireAuth);

vehiclesRouter.get(
  "/",
  validateQuery(listVehiclesQuerySchema),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const query = req.query as unknown as {
      page: number;
      pageSize: number;
      cursor?: string;
      plate?: string;
      q?: string;
      customerId?: string;
    };
    const plate = query.plate ? normalizePlate(query.plate) : undefined;
    const q = query.q;

    const where = {
      businessId: user.businessId,
      deletedAt: null,
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(plate ? { plate } : {}),
      ...(q && !plate
        ? {
            OR: [
              { plate: { contains: normalizePlate(q), mode: "insensitive" as const } },
              { brand: { contains: q, mode: "insensitive" as const } },
              { model: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        include: { customer: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        ...pageArgs(query),
      }),
      prisma.vehicle.count({ where }),
    ]);
    res.json(pageMeta(items, total, query));
  }),
);

vehiclesRouter.post(
  "/",
  validateBody(createVehicleSchema),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const customer = await prisma.customer.findFirst({
      where: { id: req.body.customerId, businessId: user.businessId, deletedAt: null },
    });
    if (!customer) throw new NotFoundError("Customer not found");

    const existing = await prisma.vehicle.findFirst({
      where: { businessId: user.businessId, plate: req.body.plate },
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictError("Plate already exists", "PLATE_TAKEN");
    }

    const vehicle = existing
      ? await prisma.vehicle.update({
          where: { id: existing.id },
          data: { ...req.body, deletedAt: null },
          include: { customer: true },
        })
      : await prisma.vehicle.create({
          data: { businessId: user.businessId, ...req.body },
          include: { customer: true },
        });
    res.status(201).json(vehicle);
  }),
);

vehiclesRouter.get(
  "/:id/history",
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: routeId(req), businessId: user.businessId, deletedAt: null },
      include: { customer: true },
    });
    if (!vehicle) throw new NotFoundError("Vehicle not found");

    const query = req.query as unknown as { page: number; pageSize: number; cursor?: string };
    const where = { vehicleId: vehicle.id, businessId: user.businessId, deletedAt: null };
    const [workOrders, total] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        include: { services: true, currentZone: true, assignedStaff: true, damages: true },
        orderBy: [{ acceptedAt: "desc" }, { id: "desc" }],
        ...pageArgs(query),
      }),
      prisma.workOrder.count({ where }),
    ]);
    const page = pageMeta(
      workOrders.map((wo) => serializeWorkOrder(wo, user.role)),
      total,
      query,
    );

    res.json({
      vehicle,
      workOrders: page.items,
      total: page.total,
      page: page.page,
      pageSize: page.pageSize,
      nextCursor: page.nextCursor,
    });
  }),
);
