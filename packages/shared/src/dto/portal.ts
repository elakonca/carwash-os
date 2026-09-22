import { z } from "zod";
import { normalizePlate } from "../plate.js";

export const portalTrackQuerySchema = z.object({
  plate: z.string().min(5).transform(normalizePlate),
});

export const portalAppointmentSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(7).max(20),
  plate: z.string().min(5).transform(normalizePlate),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  serviceIds: z.array(z.string().min(1)).min(1),
  note: z.string().trim().max(1000).optional(),
});

export type PortalAppointmentInput = z.infer<typeof portalAppointmentSchema>;
