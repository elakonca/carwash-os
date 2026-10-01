import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { customersRouter } from "./modules/customers/customers.routes.js";
import { vehiclesRouter } from "./modules/vehicles/vehicles.routes.js";
import { workOrdersRouter } from "./modules/work-orders/work-orders.routes.js";
import { zonesRouter } from "./modules/zones/zones.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { appointmentsRouter } from "./modules/appointments/appointments.routes.js";
import { servicesRouter } from "./modules/services/services.routes.js";
import { staffRouter } from "./modules/staff/staff.routes.js";
import { portalRouter } from "./modules/portal/portal.routes.js";
import { apiLimiter } from "./middleware/rate-limit.js";

export function createApp() {
  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "2mb" }));
  app.set("trust proxy", 1);
  app.use("/uploads", express.static(path.resolve(env.UPLOAD_DIR)));

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api", apiLimiter);

  app.use("/api/auth", authRouter);
  app.use("/api/customers", customersRouter);
  app.use("/api/vehicles", vehiclesRouter);
  app.use("/api/work-orders", workOrdersRouter);
  app.use("/api/zones", zonesRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/appointments", appointmentsRouter);
  app.use("/api/services", servicesRouter);
  app.use("/api/staff", staffRouter);
  app.use("/api/portal", portalRouter);

  app.use(errorHandler);
  return app;
}
