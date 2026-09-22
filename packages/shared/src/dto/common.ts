import { z } from "zod";
import { USER_ROLES } from "../enums.js";

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

export const authUserSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  role: z.enum(USER_ROLES),
  email: z.string().email(),
  name: z.string(),
});

export type AuthUser = z.infer<typeof authUserSchema>;
