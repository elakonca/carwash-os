import { EventEmitter } from "node:events";
import { DOMAIN_EVENTS, type DomainEventName } from "@carwash/shared";

export type WorkOrderCreatedEvent = {
  workOrderId: string;
  businessId: string;
  code: string;
  source: "staff" | "camera";
};

export type WorkOrderStatusChangedEvent = {
  workOrderId: string;
  businessId: string;
  fromStatus: string | null;
  toStatus: string;
};

export type DomainEventMap = {
  [DOMAIN_EVENTS.WORK_ORDER_CREATED]: WorkOrderCreatedEvent;
  [DOMAIN_EVENTS.WORK_ORDER_STATUS_CHANGED]: WorkOrderStatusChangedEvent;
  [DOMAIN_EVENTS.WORK_ORDER_READY]: WorkOrderStatusChangedEvent;
};

class DomainEventBus extends EventEmitter {
  emitEvent<K extends DomainEventName>(name: K, payload: DomainEventMap[K]): void {
    this.emit(name, payload);
  }
}

export const domainEvents = new DomainEventBus();

domainEvents.on(DOMAIN_EVENTS.WORK_ORDER_CREATED, (event) => {
  console.info("[event]", DOMAIN_EVENTS.WORK_ORDER_CREATED, event);
});

domainEvents.on(DOMAIN_EVENTS.WORK_ORDER_STATUS_CHANGED, (event) => {
  console.info("[event]", DOMAIN_EVENTS.WORK_ORDER_STATUS_CHANGED, event);
});

domainEvents.on(DOMAIN_EVENTS.WORK_ORDER_READY, (event) => {
  console.info("[event]", DOMAIN_EVENTS.WORK_ORDER_READY, event);
});
