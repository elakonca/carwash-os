import { z } from "zod";
import {
  DAMAGE_TYPES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PHOTO_CATEGORIES,
  WORK_ORDER_SOURCES,
  WORK_ORDER_STATUSES,
} from "../enums.js";
import { normalizePlate } from "../plate.js";
import { moneySchema } from "../money.js";
import { paginationSchema } from "./common.js";

const customerInlineSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(7).max(20),
  email: z.string().trim().email().optional().or(z.literal("")),
  note: z.string().trim().max(1000).optional(),
});

const vehicleInlineSchema = z.object({
  plate: z.string().min(5).transform(normalizePlate),
  brand: z.string().trim().max(60).optional(),
  model: z.string().trim().max(60).optional(),
  year: z.coerce.number().int().min(1950).max(2100).optional(),
  color: z.string().trim().max(40).optional(),
  note: z.string().trim().max(1000).optional(),
});

export const createWorkOrderSchema = z
  .object({
    source: z.enum(WORK_ORDER_SOURCES).default("staff"),
    vehicleId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    plate: z.string().min(5).transform(normalizePlate).optional(),
    customer: customerInlineSchema.optional(),
    vehicle: vehicleInlineSchema.optional(),
    serviceIds: z.array(z.string().uuid()).min(1),
    note: z.string().trim().max(2000).optional(),
    estimatedDeliveryAt: z.string().datetime().optional(),
    zoneId: z.string().uuid().optional(),
    assignedStaffId: z.string().uuid().optional(),
  })
  .refine(
    (value) =>
      Boolean(value.vehicleId) ||
      Boolean(value.plate) ||
      Boolean(value.vehicle?.plate),
    { message: "vehicleId, plate or vehicle.plate is required", path: ["vehicleId"] },
  );

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;

export const listWorkOrdersQuerySchema = paginationSchema.extend({
  status: z.enum(["active", "all", ...WORK_ORDER_STATUSES]).optional(),
  date: z.enum(["today", "all"]).optional().default("all"),
  plate: z.string().optional(),
  staffId: z.string().uuid().optional(),
  zoneId: z.string().uuid().optional(),
});

export type ListWorkOrdersQuery = z.infer<typeof listWorkOrdersQuerySchema>;

export const transitionWorkOrderSchema = z.object({
  toStatus: z.enum(WORK_ORDER_STATUSES),
  zoneId: z.string().uuid().optional().nullable(),
  staffId: z.string().uuid().optional().nullable(),
});

export type TransitionWorkOrderInput = z.infer<typeof transitionWorkOrderSchema>;

export const assignStaffSchema = z.object({
  staffId: z.string().uuid().nullable(),
});

export type AssignStaffInput = z.infer<typeof assignStaffSchema>;

export const createDamageSchema = z.object({
  area: z.string().trim().min(1).max(80),
  type: z.enum(DAMAGE_TYPES),
  note: z.string().trim().max(1000).optional(),
  photoId: z.string().uuid().optional().nullable(),
});

export type CreateDamageInput = z.infer<typeof createDamageSchema>;

export const paymentSchema = z.object({
  method: z.enum(PAYMENT_METHODS),
  status: z.enum(PAYMENT_STATUSES),
  amountOverride: moneySchema.optional(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;

export const cancelWorkOrderSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export type CancelWorkOrderInput = z.infer<typeof cancelWorkOrderSchema>;

export const uploadPhotoMetaSchema = z.object({
  category: z.enum(PHOTO_CATEGORIES),
});
