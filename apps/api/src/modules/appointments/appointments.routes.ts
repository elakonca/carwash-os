import { Router } from "express";
import { createAppointmentSchema, updateAppointmentSchema } from "@carwash/shared";
import { NotFoundError, UnprocessableEntityError } from "../../lib/errors.js";
import { routeId } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { currentUser, requireAuth } from "../../middleware/auth.js";
import { asyncHandler, validateBody } from "../../middleware/error-handler.js";
import { createWorkOrder } from "../work-orders/work-orders.service.js";

export const appointmentsRouter = Router();
appointmentsRouter.use(requireAuth);

const include = {
  customer: true,
  vehicle: true,
  workOrder: true,
  services: { include: { service: true } },
} as const;

appointmentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const date = typeof req.query.date === "string" ? req.query.date : undefined;
    const items = await prisma.appointment.findMany({
      where: {
        businessId: user.businessId,
        deletedAt: null,
        ...(date ? { date: new Date(`${date}T00:00:00.000Z`) } : {}),
      },
      include,
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });
    res.json({ items });
  }),
);

appointmentsRouter.post(
  "/",
  validateBody(createAppointmentSchema),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const [customer, vehicle, services] = await Promise.all([
      prisma.customer.findFirst({
        where: { id: req.body.customerId, businessId: user.businessId, deletedAt: null },
      }),
      prisma.vehicle.findFirst({
        where: { id: req.body.vehicleId, businessId: user.businessId, deletedAt: null },
      }),
      prisma.service.findMany({
        where: {
          id: { in: req.body.serviceIds },
          businessId: user.businessId,
          deletedAt: null,
        },
      }),
    ]);
    if (!customer) throw new NotFoundError("Customer not found");
    if (!vehicle) throw new NotFoundError("Vehicle not found");
    if (services.length !== req.body.serviceIds.length) {
      throw new UnprocessableEntityError("One or more services are invalid");
    }

    const estimatedMinutes =
      req.body.estimatedMinutes ??
      services.reduce((sum, service) => sum + service.estimatedMinutes, 0);

    const appointment = await prisma.appointment.create({
      data: {
        businessId: user.businessId,
        customerId: customer.id,
        vehicleId: vehicle.id,
        date: new Date(`${req.body.date}T00:00:00.000Z`),
        time: req.body.time,
        estimatedMinutes,
        note: req.body.note,
        services: {
          create: services.map((service) => ({
            businessId: user.businessId,
            serviceId: service.id,
          })),
        },
      },
      include,
    });
    res.status(201).json(appointment);
  }),
);

appointmentsRouter.put(
  "/:id",
  validateBody(updateAppointmentSchema),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const appointment = await prisma.appointment.findFirst({
      where: { id: routeId(req), businessId: user.businessId, deletedAt: null },
    });
    if (!appointment) throw new NotFoundError("Appointment not found");

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        ...(req.body.date ? { date: new Date(`${req.body.date}T00:00:00.000Z`) } : {}),
        time: req.body.time,
        note: req.body.note,
        status: req.body.status,
        estimatedMinutes: req.body.estimatedMinutes,
      },
      include,
    });
    res.json(updated);
  }),
);

appointmentsRouter.post(
  "/:id/convert",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const appointment = await prisma.appointment.findFirst({
      where: { id: routeId(req), businessId: user.businessId, deletedAt: null },
      include: { services: true },
    });
    if (!appointment) throw new NotFoundError("Appointment not found");
    if (appointment.workOrderId) {
      throw new UnprocessableEntityError("Appointment already converted", "ALREADY_CONVERTED");
    }
    if (appointment.status === "CANCELLED") {
      throw new UnprocessableEntityError("Cancelled appointment cannot be converted");
    }

    const workOrder = await createWorkOrder(user, {
      source: "staff",
      vehicleId: appointment.vehicleId,
      customerId: appointment.customerId,
      serviceIds: appointment.services.map((s) => s.serviceId),
      note: appointment.note ?? undefined,
    });

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { workOrderId: (workOrder as { id: string }).id, status: "IN_PROGRESS" },
      include,
    });

    res.status(201).json({ appointment: updated, workOrder });
  }),
);
