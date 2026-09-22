import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  assignStaffSchema,
  cancelWorkOrderSchema,
  createDamageSchema,
  createWorkOrderSchema,
  listWorkOrdersQuerySchema,
  paymentSchema,
  PHOTO_CATEGORIES,
  transitionWorkOrderSchema,
} from "@carwash/shared";
import { env } from "../../config/env.js";
import { UnprocessableEntityError } from "../../lib/errors.js";
import { routeId } from "../../lib/http.js";
import { currentUser, requireAuth } from "../../middleware/auth.js";
import { asyncHandler, validateBody, validateQuery } from "../../middleware/error-handler.js";
import * as service from "./work-orders.service.js";

export const workOrdersRouter = Router();
workOrdersRouter.use(requireAuth);

const storage = multer.diskStorage({
  destination: env.UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new UnprocessableEntityError("Only image uploads are allowed"));
      return;
    }
    cb(null, true);
  },
});

workOrdersRouter.post(
  "/",
  validateBody(createWorkOrderSchema),
  asyncHandler(async (req, res) => {
    const created = await service.createWorkOrder(currentUser(req), req.body);
    res.status(201).json(created);
  }),
);

workOrdersRouter.get(
  "/",
  validateQuery(listWorkOrdersQuerySchema),
  asyncHandler(async (req, res) => {
    const items = await service.listWorkOrders(currentUser(req), req.query as never);
    res.json({ items });
  }),
);

workOrdersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const item = await service.getWorkOrder(currentUser(req), routeId(req));
    res.json(item);
  }),
);

workOrdersRouter.post(
  "/:id/transition",
  validateBody(transitionWorkOrderSchema),
  asyncHandler(async (req, res) => {
    const item = await service.transitionWorkOrder(
      currentUser(req),
      routeId(req),
      req.body,
    );
    res.json(item);
  }),
);

workOrdersRouter.post(
  "/:id/assign-staff",
  validateBody(assignStaffSchema),
  asyncHandler(async (req, res) => {
    const item = await service.assignStaff(
      currentUser(req),
      routeId(req),
      req.body.staffId,
    );
    res.json(item);
  }),
);

workOrdersRouter.post(
  "/:id/photos",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new UnprocessableEntityError("file is required");
    const category = String(req.body.category ?? "");
    if (!PHOTO_CATEGORIES.includes(category as (typeof PHOTO_CATEGORIES)[number])) {
      throw new UnprocessableEntityError("Invalid photo category");
    }
    const photo = await service.addPhoto({
      user: currentUser(req),
      workOrderId: routeId(req),
      category: category as (typeof PHOTO_CATEGORIES)[number],
      fileUrl: `/uploads/${req.file.filename}`,
    });
    res.status(201).json(photo);
  }),
);

workOrdersRouter.post(
  "/:id/damages",
  validateBody(createDamageSchema),
  asyncHandler(async (req, res) => {
    const damage = await service.addDamage(currentUser(req), routeId(req), req.body);
    res.status(201).json(damage);
  }),
);

workOrdersRouter.post(
  "/:id/payment",
  validateBody(paymentSchema),
  asyncHandler(async (req, res) => {
    const item = await service.recordPayment(currentUser(req), routeId(req), req.body);
    res.json(item);
  }),
);

workOrdersRouter.post(
  "/:id/cancel",
  validateBody(cancelWorkOrderSchema),
  asyncHandler(async (req, res) => {
    const item = await service.cancelWorkOrder(
      currentUser(req),
      routeId(req),
      req.body.reason,
    );
    res.json(item);
  }),
);
