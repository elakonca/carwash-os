import { z } from "zod";
import { APPOINTMENT_STATUSES, ZONE_STATUSES, ZONE_TYPES } from "../enums.js";
import { paginationSchema } from "./common.js";

export const createZoneSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(ZONE_TYPES),
  status: z.enum(ZONE_STATUSES).optional().default("EMPTY"),
});

export const updateZoneSchema = createZoneSchema.partial();

export type CreateZoneInput = z.infer<typeof createZoneSchema>;
export type UpdateZoneInput = z.infer<typeof updateZoneSchema>;

export const createAppointmentSchema = z.object({
  customerId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  estimatedMinutes: z.coerce.number().int().min(1).optional(),
  note: z.string().trim().max(1000).optional(),
  serviceIds: z.array(z.string().uuid()).min(1),
});

export const updateAppointmentSchema = createAppointmentSchema
  .partial()
  .extend({
    status: z.enum(APPOINTMENT_STATUSES).optional(),
  });

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

export const listAppointmentsQuerySchema = paginationSchema.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;
