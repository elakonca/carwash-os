import type {
  AppointmentStatus,
  DamageType,
  PaymentMethod,
  PaymentStatus,
  PhotoCategory,
  UserRole,
  WorkOrderStatus,
  ZoneStatus,
  ZoneType,
} from "./enums.js";

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  ACCEPTED: "Kabul",
  PARKED: "Park",
  EXTERIOR_WASH: "Dış yıkama",
  INTERIOR_WASH: "İç temizlik",
  DRYING: "Kurutma",
  DETAILING: "Detay",
  QUALITY_CHECK: "Kalite",
  READY: "Hazır",
  DELIVERED: "Teslim",
  CANCELLED: "İptal",
};

export const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  PARK: "Park",
  EXTERIOR: "Dış yıkama",
  INTERIOR: "İç temizlik",
  DETAILING: "Detay",
  DELIVERY: "Teslim",
};

export const ZONE_STATUS_LABELS: Record<ZoneStatus, string> = {
  EMPTY: "Boş",
  OCCUPIED: "Dolu",
  OUT_OF_SERVICE: "Hizmet dışı",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: "Sahip",
  MANAGER: "Yönetici",
  STAFF: "Personel",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: "Ödenmedi",
  PAID: "Ödendi",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Nakit",
  CARD: "Kart",
  OTHER: "Diğer",
};

export const PHOTO_CATEGORY_LABELS: Record<PhotoCategory, string> = {
  FRONT: "Ön",
  BACK: "Arka",
  LEFT: "Sol",
  RIGHT: "Sağ",
  INTERIOR: "İç",
  DELIVERY: "Teslim",
};

export const DAMAGE_TYPE_LABELS: Record<DamageType, string> = {
  SCRATCH: "Çizik",
  DENT: "Göçük",
  BROKEN: "Kırık",
  PAINT: "Boya",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: "Beklemede",
  CONFIRMED: "Onaylı",
  IN_PROGRESS: "İşlemde",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};
