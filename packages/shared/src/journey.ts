import type { WorkOrderStatus } from "./enums.js";

export const CUSTOMER_JOURNEY_STEPS = [
  { key: "ACCEPTED", label: "Araç Kabul", statuses: ["ACCEPTED"] },
  { key: "PARKED", label: "Park Area", statuses: ["PARKED"] },
  { key: "EXTERIOR_WASH", label: "Dış Yıkama", statuses: ["EXTERIOR_WASH"] },
  { key: "INTERIOR_WASH", label: "İç Yıkama", statuses: ["INTERIOR_WASH", "DRYING"] },
  { key: "DETAILING", label: "Detailing", statuses: ["DETAILING"] },
  { key: "QUALITY_CHECK", label: "Kalite Kontrol", statuses: ["QUALITY_CHECK"] },
  { key: "READY", label: "Teslime Hazır", statuses: ["READY", "DELIVERED"] },
] as const;

export type JourneyStepState = "done" | "current" | "upcoming";

export type JourneyStepView = {
  key: string;
  label: string;
  state: JourneyStepState;
};

export function journeyStepIndex(status: WorkOrderStatus): number {
  if (status === "CANCELLED") return -1;
  const index = CUSTOMER_JOURNEY_STEPS.findIndex((step) =>
    (step.statuses as readonly string[]).includes(status),
  );
  return index;
}

export function buildCustomerJourney(status: WorkOrderStatus): JourneyStepView[] {
  if (status === "CANCELLED") {
    return CUSTOMER_JOURNEY_STEPS.map((step) => ({
      key: step.key,
      label: step.label,
      state: "upcoming" as const,
    }));
  }
  if (status === "DELIVERED") {
    return CUSTOMER_JOURNEY_STEPS.map((step) => ({
      key: step.key,
      label: step.label,
      state: "done" as const,
    }));
  }
  const current = journeyStepIndex(status);
  return CUSTOMER_JOURNEY_STEPS.map((step, index) => ({
    key: step.key,
    label: step.label,
    state: index < current ? "done" : index === current ? "current" : "upcoming",
  }));
}
