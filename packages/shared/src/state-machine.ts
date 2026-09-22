import type { WorkOrderStatus, ZoneType } from "./enums.js";

/**
 * Allowed work-order status transitions.
 * Enforced on the API; the UI only uses this for enabling actions.
 */
export const WORK_ORDER_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  ACCEPTED: ["PARKED", "EXTERIOR_WASH", "INTERIOR_WASH", "CANCELLED"],
  PARKED: ["EXTERIOR_WASH", "INTERIOR_WASH", "CANCELLED"],
  EXTERIOR_WASH: ["PARKED", "INTERIOR_WASH", "DRYING", "CANCELLED"],
  INTERIOR_WASH: ["EXTERIOR_WASH", "DRYING", "DETAILING", "CANCELLED"],
  DRYING: ["INTERIOR_WASH", "DETAILING", "QUALITY_CHECK", "CANCELLED"],
  DETAILING: ["DRYING", "QUALITY_CHECK", "CANCELLED"],
  QUALITY_CHECK: ["DETAILING", "EXTERIOR_WASH", "INTERIOR_WASH", "READY", "CANCELLED"],
  READY: ["DELIVERED", "QUALITY_CHECK", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

/** Zone types that are valid for a given work-order status. Empty = zone must be released. */
export const STATUS_ALLOWED_ZONE_TYPES: Record<WorkOrderStatus, ZoneType[]> = {
  ACCEPTED: ["PARK"],
  PARKED: ["PARK"],
  EXTERIOR_WASH: ["EXTERIOR"],
  INTERIOR_WASH: ["INTERIOR"],
  DRYING: ["EXTERIOR", "INTERIOR", "DETAILING"],
  DETAILING: ["DETAILING"],
  QUALITY_CHECK: ["DETAILING", "DELIVERY", "PARK"],
  READY: ["DELIVERY", "PARK"],
  DELIVERED: [],
  CANCELLED: [],
};

export const TERMINAL_STATUSES: WorkOrderStatus[] = ["DELIVERED", "CANCELLED"];

export function isTerminalStatus(status: WorkOrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function getNextStatuses(from: WorkOrderStatus): WorkOrderStatus[] {
  return WORK_ORDER_TRANSITIONS[from];
}

export function canTransition(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
  return WORK_ORDER_TRANSITIONS[from].includes(to);
}

export function isZoneRequired(status: WorkOrderStatus): boolean {
  return status !== "ACCEPTED" && !isTerminalStatus(status);
}

export function isZoneTypeAllowedForStatus(
  status: WorkOrderStatus,
  zoneType: ZoneType,
): boolean {
  const allowed = STATUS_ALLOWED_ZONE_TYPES[status];
  if (allowed.length === 0) return false;
  return allowed.includes(zoneType);
}

export function shouldReleaseZone(status: WorkOrderStatus): boolean {
  return isTerminalStatus(status);
}

export class InvalidTransitionError extends Error {
  readonly from: WorkOrderStatus;
  readonly to: WorkOrderStatus;

  constructor(from: WorkOrderStatus, to: WorkOrderStatus) {
    super(`Invalid work order transition: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
    this.from = from;
    this.to = to;
  }
}

export class ZoneStatusMismatchError extends Error {
  constructor(status: WorkOrderStatus, zoneType: ZoneType) {
    super(`Zone type ${zoneType} is not valid for status ${status}`);
    this.name = "ZoneStatusMismatchError";
  }
}

export function assertTransition(from: WorkOrderStatus, to: WorkOrderStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}

export function assertZoneMatchesStatus(
  status: WorkOrderStatus,
  zoneType: ZoneType,
): void {
  if (!isZoneTypeAllowedForStatus(status, zoneType)) {
    throw new ZoneStatusMismatchError(status, zoneType);
  }
}
