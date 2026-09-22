import { Router } from "express";
import {
  ACTIVE_WORK_ORDER_STATUSES,
  buildCustomerJourney,
  portalAppointmentSchema,
  portalTrackQuerySchema,
} from "@carwash/shared";
import { UnprocessableEntityError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { currentUser, requireAuth } from "../../middleware/auth.js";
import { asyncHandler, validateBody } from "../../middleware/error-handler.js";

export const portalRouter = Router();
portalRouter.use(requireAuth);

portalRouter.get(
  "/catalog",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const items = await prisma.service.findMany({
      where: { businessId: user.businessId, deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
    });
    res.json({ items });
  }),
);

portalRouter.get(
  "/track",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const { plate } = portalTrackQuerySchema.parse({ plate: String(req.query.plate ?? "") });
    const vehicle = await prisma.vehicle.findFirst({
      where: { businessId: user.businessId, plate, deletedAt: null },
      include: { customer: true },
    });
    if (!vehicle) {
      res.json({ found: false, plate });
      return;
    }

    const workOrder = await prisma.workOrder.findFirst({
      where: {
        businessId: user.businessId,
        vehicleId: vehicle.id,
        deletedAt: null,
        status: { not: "CANCELLED" },
      },
      include: { currentZone: true, assignedStaff: true, services: true },
      orderBy: { acceptedAt: "desc" },
    });

    if (!workOrder) {
      res.json({
        found: true,
        plate,
        inProgress: false,
        customer: {
          firstName: vehicle.customer.firstName,
          lastName: vehicle.customer.lastName,
        },
        vehicle: { brand: vehicle.brand, model: vehicle.model, color: vehicle.color },
      });
      return;
    }

    res.json({
      found: true,
      inProgress: ACTIVE_WORK_ORDER_STATUSES.includes(workOrder.status),
      plate,
      code: workOrder.code,
      status: workOrder.status,
      estimatedDeliveryAt: workOrder.estimatedDeliveryAt,
      zoneName: workOrder.currentZone?.name ?? null,
      staffName: workOrder.assignedStaff?.name ?? null,
      customer: {
        firstName: vehicle.customer.firstName,
        lastName: vehicle.customer.lastName,
      },
      vehicle: { brand: vehicle.brand, model: vehicle.model, color: vehicle.color },
      steps: buildCustomerJourney(workOrder.status),
      cancelled: workOrder.status === "CANCELLED",
      delivered: workOrder.status === "DELIVERED",
    });
  }),
);

portalRouter.post(
  "/appointments",
  validateBody(portalAppointmentSchema),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const input = req.body as {
      firstName: string;
      lastName: string;
      phone: string;
      plate: string;
      date: string;
      time: string;
      serviceIds: string[];
      note?: string;
    };

    const services = await prisma.service.findMany({
      where: {
        id: { in: input.serviceIds },
        businessId: user.businessId,
        deletedAt: null,
        isActive: true,
      },
    });
    if (services.length !== input.serviceIds.length) {
      throw new UnprocessableEntityError("One or more services are invalid");
    }

    let customer = await prisma.customer.findFirst({
      where: { businessId: user.businessId, phone: input.phone },
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          businessId: user.businessId,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
        },
      });
    } else if (customer.deletedAt) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: { deletedAt: null, firstName: input.firstName, lastName: input.lastName },
      });
    }

    let vehicle = await prisma.vehicle.findFirst({
      where: { businessId: user.businessId, plate: input.plate },
    });
    if (!vehicle) {
      vehicle = await prisma.vehicle.create({
        data: {
          businessId: user.businessId,
          customerId: customer.id,
          plate: input.plate,
        },
      });
    } else if (vehicle.deletedAt) {
      vehicle = await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { deletedAt: null, customerId: customer.id },
      });
    }

    const estimatedMinutes = services.reduce((sum, service) => sum + service.estimatedMinutes, 0);
    const appointment = await prisma.appointment.create({
      data: {
        businessId: user.businessId,
        customerId: customer.id,
        vehicleId: vehicle.id,
        date: new Date(`${input.date}T00:00:00.000Z`),
        time: input.time,
        estimatedMinutes,
        note: input.note ? `[Portal] ${input.note}` : "[Portal]",
        status: "PENDING",
        services: {
          create: services.map((service) => ({
            businessId: user.businessId,
            serviceId: service.id,
          })),
        },
      },
      include: {
        customer: true,
        vehicle: true,
        services: { include: { service: true } },
      },
    });

    res.status(201).json(appointment);
  }),
);
