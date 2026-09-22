import { z } from "zod";
import { normalizePlate } from "../plate.js";
import { ZONE_TYPES } from "../enums.js";

export const createCustomerSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(7).max(20),
  email: z.string().trim().email().optional().or(z.literal("")),
  note: z.string().trim().max(1000).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const createVehicleSchema = z.object({
  customerId: z.string().uuid(),
  plate: z.string().min(5).transform(normalizePlate),
  brand: z.string().trim().max(60).optional(),
  model: z.string().trim().max(60).optional(),
  year: z.coerce.number().int().min(1950).max(2100).optional(),
  color: z.string().trim().max(40).optional(),
  note: z.string().trim().max(1000).optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;

export const createServiceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  price: z.coerce.number().min(0),
  estimatedMinutes: z.coerce.number().int().min(1).max(24 * 60),
  zoneType: z.enum(ZONE_TYPES),
  isActive: z.boolean().optional().default(true),
});

export const updateServiceSchema = createServiceSchema.partial();

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

export const createStaffSchema = z.object({
  userId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(20).optional(),
  specialty: z.string().trim().max(120).optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateStaffSchema = createStaffSchema.partial();

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
