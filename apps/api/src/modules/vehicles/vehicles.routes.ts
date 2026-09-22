import { Router } from "express";
import { createVehicleSchema, normalizePlate } from "@carwash/shared";
import { ConflictError, NotFoundError } from "../../lib/errors.js";
import { routeId } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { currentUser, requireAuth } from "../../middleware/auth.js";
import { asyncHandler, validateBody } from "../../middleware/error-handler.js";
import { serializeWorkOrder } from "../../lib/serialize.js";

export const vehiclesRouter = Router();
vehiclesRouter.use(requireAuth);

vehiclesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const plate = typeof req.query.plate === "string" ? normalizePlate(req.query.plate) : undefined;
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const customerId = typeof req.query.customerId === "string" ? req.query.customerId : undefined;

    const vehicles = await prisma.vehicle.findMany({
      where: {
        businessId: user.businessId,
        deletedAt: null,
        ...(customerId ? { customerId } : {}),
        ...(plate ? { plate } : {}),
        ...(q && !plate
          ? {
              OR: [
                { plate: { contains: normalizePlate(q), mode: "insensitive" } },
                { brand: { contains: q, mode: "insensitive" } },
                { model: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ items: vehicles });
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
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: routeId(req), businessId: user.businessId, deletedAt: null },
      include: { customer: true },
    });
    if (!vehicle) throw new NotFoundError("Vehicle not found");

    const workOrders = await prisma.workOrder.findMany({
      where: { vehicleId: vehicle.id, businessId: user.businessId, deletedAt: null },
      include: { services: true, currentZone: true, assignedStaff: true, damages: true },
      orderBy: { acceptedAt: "desc" },
    });

    res.json({
      vehicle,
      workOrders: workOrders.map((wo) => serializeWorkOrder(wo, user.role)),
    });
  }),
);
