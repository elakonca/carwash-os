export const USER_ROLES = ["OWNER", "MANAGER", "STAFF"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ZONE_TYPES = [
  "PARK",
  "EXTERIOR",
  "INTERIOR",
  "DETAILING",
  "DELIVERY",
] as const;
export type ZoneType = (typeof ZONE_TYPES)[number];

export const ZONE_STATUSES = ["EMPTY", "OCCUPIED", "OUT_OF_SERVICE"] as const;
export type ZoneStatus = (typeof ZONE_STATUSES)[number];

export const WORK_ORDER_STATUSES = [
  "ACCEPTED",
  "PARKED",
  "EXTERIOR_WASH",
  "INTERIOR_WASH",
  "DRYING",
  "DETAILING",
  "QUALITY_CHECK",
  "READY",
  "DELIVERED",
  "CANCELLED",
] as const;
export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export const ACTIVE_WORK_ORDER_STATUSES = WORK_ORDER_STATUSES.filter(
  (status) => status !== "DELIVERED" && status !== "CANCELLED",
);

export const PAYMENT_STATUSES = ["UNPAID", "PAID"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["CASH", "CARD", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PHOTO_CATEGORIES = [
  "FRONT",
  "BACK",
  "LEFT",
  "RIGHT",
  "INTERIOR",
  "DELIVERY",
] as const;
export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];

export const DAMAGE_TYPES = ["SCRATCH", "DENT", "BROKEN", "PAINT"] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

export const APPOINTMENT_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const WORK_ORDER_SOURCES = ["staff", "camera"] as const;
export type WorkOrderSource = (typeof WORK_ORDER_SOURCES)[number];

export const DOMAIN_EVENTS = {
  WORK_ORDER_CREATED: "work_order.created",
  WORK_ORDER_STATUS_CHANGED: "work_order.status_changed",
  WORK_ORDER_READY: "work_order.ready",
} as const;
export type DomainEventName = (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS];
