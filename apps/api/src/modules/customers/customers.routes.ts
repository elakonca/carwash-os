import { Router } from "express";
import {
  createCustomerSchema,
  paginationSchema,
  updateCustomerSchema,
} from "@carwash/shared";
import { canViewPrices } from "@carwash/shared";
import { NotFoundError } from "../../lib/errors.js";
import { routeId } from "../../lib/http.js";
import { moneyString, sumDecimals } from "../../lib/money.js";
import { pageArgs, pageMeta } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { currentUser, requireAuth } from "../../middleware/auth.js";
import { asyncHandler, validateBody, validateQuery } from "../../middleware/error-handler.js";

export const customersRouter = Router();
customersRouter.use(requireAuth);

customersRouter.get(
  "/",
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const { q } = req.query as unknown as { q?: string };
    const where = {
      businessId: user.businessId,
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" as const } },
              { lastName: { contains: q, mode: "insensitive" as const } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    };
    const query = req.query as unknown as {
      page: number;
      pageSize: number;
      q?: string;
      cursor?: string;
    };
    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: { vehicles: { where: { deletedAt: null } } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        ...pageArgs(query),
      }),
      prisma.customer.count({ where }),
    ]);
    res.json(pageMeta(items, total, query));
  }),
);

customersRouter.post(
  "/",
  validateBody(createCustomerSchema),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const existing = await prisma.customer.findFirst({
      where: { businessId: user.businessId, phone: req.body.phone },
    });
    if (existing && !existing.deletedAt) {
      res.status(409).json({
        error: { code: "PHONE_TAKEN", message: "Phone already exists for this business" },
      });
      return;
    }
    const customer = existing
      ? await prisma.customer.update({
          where: { id: existing.id },
          data: { ...req.body, email: req.body.email || null, deletedAt: null },
        })
      : await prisma.customer.create({
          data: {
            businessId: user.businessId,
            ...req.body,
            email: req.body.email || null,
          },
        });
    res.status(201).json(customer);
  }),
);

customersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const customer = await prisma.customer.findFirst({
      where: { id: routeId(req), businessId: user.businessId, deletedAt: null },
      include: { vehicles: { where: { deletedAt: null } } },
    });
    if (!customer) throw new NotFoundError("Customer not found");
    res.json(customer);
  }),
);

customersRouter.put(
  "/:id",
  validateBody(updateCustomerSchema),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const customer = await prisma.customer.findFirst({
      where: { id: routeId(req), businessId: user.businessId, deletedAt: null },
    });
    if (!customer) throw new NotFoundError("Customer not found");
    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: { ...req.body, email: req.body.email || customer.email },
    });
    res.json(updated);
  }),
);

customersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const customer = await prisma.customer.findFirst({
      where: { id: routeId(req), businessId: user.businessId, deletedAt: null },
    });
    if (!customer) throw new NotFoundError("Customer not found");
    await prisma.customer.update({
      where: { id: customer.id },
      data: { deletedAt: new Date() },
    });
    res.status(204).send();
  }),
);

customersRouter.get(
  "/:id/summary",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const customer = await prisma.customer.findFirst({
      where: { id: routeId(req), businessId: user.businessId, deletedAt: null },
      include: {
        vehicles: { where: { deletedAt: null } },
        workOrders: {
          where: { deletedAt: null },
          orderBy: { acceptedAt: "desc" },
          take: 20,
          include: { vehicle: true, services: true },
        },
      },
    });
    if (!customer) throw new NotFoundError("Customer not found");

    const paidOrders = customer.workOrders.filter((wo) => wo.paymentStatus === "PAID");
    const totalSpent = moneyString(sumDecimals(paidOrders.map((wo) => wo.totalAmount)));
    const payload = {
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        email: customer.email,
        note: customer.note,
      },
      vehicles: customer.vehicles,
      recentWorkOrders: customer.workOrders,
      visitCount: customer.workOrders.length,
      ...(canViewPrices(user.role) ? { totalSpent } : {}),
    };
    res.json(payload);
  }),
);
