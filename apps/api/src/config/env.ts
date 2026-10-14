import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES: z.string().default("15m"),
  JWT_REFRESH_EXPIRES: z.string().default("7d"),
  API_PORT: z.coerce.number().default(3001),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
  UPLOAD_DIR: z.string().default("./uploads"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  REDIS_URL: z.string().min(1).optional(),
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  COOKIE_SECURE: parsed.COOKIE_SECURE
    ? parsed.COOKIE_SECURE === "true"
    : parsed.NODE_ENV === "production",
};
