import type { Prisma, Zone, ZoneStatus, ZoneType } from "@prisma/client";
import {
  assertZoneMatchesStatus,
  isZoneRequired,
  shouldReleaseZone,
  type WorkOrderStatus,
} from "@carwash/shared";
import { ConflictError, NotFoundError, UnprocessableEntityError } from "./errors.js";

type Tx = Prisma.TransactionClient;

type LockedZone = {
  id: string;
  business_id: string;
  name: string;
  type: ZoneType;
  status: ZoneStatus;
  current_work_order_id: string | null;
  deleted_at: Date | null;
};

export async function lockZone(tx: Tx, zoneId: string): Promise<LockedZone> {
  const rows = await tx.$queryRaw<LockedZone[]>`
    SELECT id, business_id, name, type, status, current_work_order_id, deleted_at
    FROM zones
    WHERE id = ${zoneId}::uuid
    FOR UPDATE
  `;
  const zone = rows[0];
  if (!zone || zone.deleted_at) {
    throw new NotFoundError("Zone not found");
  }
  return zone;
}

export async function releaseZoneIfOccupied(
  tx: Tx,
  zoneId: string | null | undefined,
  workOrderId: string,
): Promise<void> {
  if (!zoneId) return;
  const zone = await lockZone(tx, zoneId);
  if (zone.current_work_order_id === workOrderId) {
    await tx.zone.update({
      where: { id: zoneId },
      data: { status: "EMPTY", currentWorkOrderId: null },
    });
  }
}

export async function occupyZone(params: {
  tx: Tx;
  zoneId: string;
  businessId: string;
  workOrderId: string;
  status: WorkOrderStatus;
}): Promise<Zone> {
  const { tx, zoneId, businessId, workOrderId, status } = params;
  const zone = await lockZone(tx, zoneId);

  if (zone.business_id !== businessId) {
    throw new NotFoundError("Zone not found");
  }
  if (zone.status === "OUT_OF_SERVICE") {
    throw new UnprocessableEntityError("Zone is out of service", "ZONE_OUT_OF_SERVICE");
  }
  if (zone.current_work_order_id && zone.current_work_order_id !== workOrderId) {
    throw new ConflictError("Zone is occupied", "ZONE_OCCUPIED", {
      zoneId,
      currentWorkOrderId: zone.current_work_order_id,
    });
  }

  try {
    assertZoneMatchesStatus(status, zone.type);
  } catch {
    throw new UnprocessableEntityError(
      `Zone type ${zone.type} is not valid for status ${status}`,
      "ZONE_STATUS_MISMATCH",
    );
  }

  return tx.zone.update({
    where: { id: zoneId },
    data: { status: "OCCUPIED", currentWorkOrderId: workOrderId },
  });
}

export async function syncWorkOrderZone(params: {
  tx: Tx;
  businessId: string;
  workOrderId: string;
  previousZoneId: string | null;
  nextZoneId: string | null | undefined;
  nextStatus: WorkOrderStatus;
}): Promise<string | null> {
  const { tx, businessId, workOrderId, previousZoneId, nextStatus } = params;
  let nextZoneId = params.nextZoneId;

  if (shouldReleaseZone(nextStatus)) {
    await releaseZoneIfOccupied(tx, previousZoneId, workOrderId);
    return null;
  }

  if (!nextZoneId) {
    if (isZoneRequired(nextStatus)) {
      throw new UnprocessableEntityError(
        "zoneId is required for this status",
        "ZONE_REQUIRED",
      );
    }
    await releaseZoneIfOccupied(tx, previousZoneId, workOrderId);
    return null;
  }

  if (previousZoneId && previousZoneId !== nextZoneId) {
    await releaseZoneIfOccupied(tx, previousZoneId, workOrderId);
  }

  await occupyZone({
    tx,
    zoneId: nextZoneId,
    businessId,
    workOrderId,
    status: nextStatus,
  });

  return nextZoneId;
}
