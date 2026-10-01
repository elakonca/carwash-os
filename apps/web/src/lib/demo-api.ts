import {
  ACTIVE_WORK_ORDER_STATUSES,
  WORK_ORDER_STATUSES,
  assertTransition,
  buildCustomerJourney,
  canViewPrices,
  canViewReports,
  isZoneRequired,
  isZoneTypeAllowedForStatus,
  normalizePlate,
  shouldReleaseZone,
  type PhotoCategory,
  type UserRole,
  type WorkOrderStatus,
  type ZoneStatus,
  type ZoneType,
} from "@carwash/shared";

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  note?: string | null;
};

type Vehicle = {
  id: string;
  customerId: string;
  plate: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
};

type Service = {
  id: string;
  name: string;
  price: number;
  estimatedMinutes: number;
  zoneType: ZoneType;
  isActive: boolean;
};

type Zone = {
  id: string;
  name: string;
  type: ZoneType;
  status: ZoneStatus;
  currentWorkOrderId: string | null;
};

type Staff = {
  id: string;
  name: string;
  phone?: string;
  specialty?: string;
};

type WorkOrder = {
  id: string;
  code: string;
  status: WorkOrderStatus;
  vehicleId: string;
  customerId: string;
  currentZoneId: string | null;
  assignedStaffId: string | null;
  note?: string;
  totalAmount: number;
  paymentStatus: "UNPAID" | "PAID";
  paymentMethod: "CASH" | "CARD" | "OTHER" | null;
  estimatedDeliveryAt: string;
  acceptedAt: string;
  cancelledReason?: string | null;
  services: {
    id: string;
    nameSnapshot: string;
    priceSnapshot: number;
    estimatedMinutesSnapshot: number;
  }[];
  photos: { id: string; category: PhotoCategory; fileUrl: string }[];
  damages: { id: string; area: string; type: string; note?: string }[];
  statusLogs: {
    id: string;
    fromStatus: WorkOrderStatus | null;
    toStatus: WorkOrderStatus;
    createdAt: string;
    user: { name: string };
    zone?: { name: string } | null;
    staff?: { name: string } | null;
  }[];
};

type Appointment = {
  id: string;
  customerId: string;
  vehicleId: string;
  date: string;
  time: string;
  estimatedMinutes: number;
  note?: string;
  status: "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  workOrderId?: string | null;
  serviceIds: string[];
};

const BUSINESS = { id: "biz-1", name: "AquaShine Oto Yıkama" };

const USERS: Record<string, { password: string; user: { id: string; name: string; email: string; role: UserRole; businessId: string } }> = {
  "owner@aquashine.com": {
    password: "Owner123!",
    user: { id: "user-owner", name: "Elanur Konca", email: "owner@aquashine.com", role: "OWNER", businessId: BUSINESS.id },
  },
  "manager@aquashine.com": {
    password: "Manager123!",
    user: { id: "user-manager", name: "Selin Aksoy", email: "manager@aquashine.com", role: "MANAGER", businessId: BUSINESS.id },
  },
  "staff@aquashine.com": {
    password: "Staff123!",
    user: { id: "user-staff", name: "Ahmet Yılmaz", email: "staff@aquashine.com", role: "STAFF", businessId: BUSINESS.id },
  },
};

let currentUserEmail =
  typeof localStorage !== "undefined" ? localStorage.getItem("demoUserEmail") ?? "" : "";

const customers: Customer[] = [
  { id: "c1", firstName: "Can", lastName: "Öztürk", phone: "05320001122", email: "can@example.com" },
  { id: "c2", firstName: "Elif", lastName: "Yıldız", phone: "05321112233", email: "elif@example.com" },
  { id: "c3", firstName: "Burak", lastName: "Şahin", phone: "05324445566" },
];

const vehicles: Vehicle[] = [
  { id: "v1", customerId: "c1", plate: "34ABC123", brand: "BMW", model: "320i", year: 2021, color: "Siyah" },
  { id: "v2", customerId: "c2", plate: "06ANK45", brand: "Mercedes", model: "C200", year: 2022, color: "Beyaz" },
  { id: "v3", customerId: "c3", plate: "35IZM78", brand: "Volkswagen", model: "Golf", year: 2019, color: "Gri" },
  { id: "v4", customerId: "c1", plate: "34TS1234", brand: "Audi", model: "A4", year: 2020, color: "Lacivert" },
];

const catalog: Service[] = [
  { id: "s1", name: "Dış yıkama", price: 450, estimatedMinutes: 20, zoneType: "EXTERIOR", isActive: true },
  { id: "s2", name: "İç temizlik", price: 550, estimatedMinutes: 30, zoneType: "INTERIOR", isActive: true },
  { id: "s3", name: "Motor yıkama", price: 350, estimatedMinutes: 15, zoneType: "EXTERIOR", isActive: true },
  { id: "s4", name: "Cilalı yıkama", price: 900, estimatedMinutes: 45, zoneType: "EXTERIOR", isActive: true },
  { id: "s5", name: "Detaylı iç", price: 1200, estimatedMinutes: 60, zoneType: "DETAILING", isActive: true },
];

const zones: Zone[] = [
  { id: "z1", name: "Park 1", type: "PARK", status: "OCCUPIED", currentWorkOrderId: "wo1" },
  { id: "z2", name: "Park 2", type: "PARK", status: "EMPTY", currentWorkOrderId: null },
  { id: "z3", name: "Park 3", type: "PARK", status: "EMPTY", currentWorkOrderId: null },
  { id: "z4", name: "Dış 1", type: "EXTERIOR", status: "OCCUPIED", currentWorkOrderId: "wo2" },
  { id: "z5", name: "Dış 2", type: "EXTERIOR", status: "EMPTY", currentWorkOrderId: null },
  { id: "z6", name: "İç 1", type: "INTERIOR", status: "OCCUPIED", currentWorkOrderId: "wo3" },
  { id: "z7", name: "İç 2", type: "INTERIOR", status: "EMPTY", currentWorkOrderId: null },
  { id: "z8", name: "Detay 1", type: "DETAILING", status: "EMPTY", currentWorkOrderId: null },
  { id: "z9", name: "Teslim", type: "DELIVERY", status: "OCCUPIED", currentWorkOrderId: "wo4" },
];

const staff: Staff[] = [
  { id: "st1", name: "Ahmet Yılmaz", specialty: "Dış yıkama", phone: "05320000002" },
  { id: "st2", name: "Mehmet Demir", specialty: "İç temizlik" },
  { id: "st3", name: "Ayşe Kaya", specialty: "Detay" },
];

let seq = 1027;

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function customerOf(id: string) {
  return customers.find((c) => c.id === id)!;
}
function vehicleOf(id: string) {
  return vehicles.find((v) => v.id === id)!;
}
function zoneOf(id: string | null) {
  return id ? zones.find((z) => z.id === id) ?? null : null;
}
function staffOf(id: string | null) {
  return id ? staff.find((s) => s.id === id) ?? null : null;
}

function log(from: WorkOrderStatus | null, to: WorkOrderStatus, zoneId?: string | null, staffId?: string | null) {
  return {
    id: uid("log"),
    fromStatus: from,
    toStatus: to,
    createdAt: nowIso(),
    user: { name: currentUser()?.name ?? "Sistem" },
    zone: zoneOf(zoneId ?? null) ? { name: zoneOf(zoneId ?? null)!.name } : null,
    staff: staffOf(staffId ?? null) ? { name: staffOf(staffId ?? null)!.name } : null,
  };
}

const workOrders: WorkOrder[] = [
  {
    id: "wo1",
    code: "WO-1024",
    status: "PARKED",
    vehicleId: "v1",
    customerId: "c1",
    currentZoneId: "z1",
    assignedStaffId: null,
    totalAmount: 1000,
    paymentStatus: "UNPAID",
    paymentMethod: null,
    estimatedDeliveryAt: nowIso(),
    acceptedAt: nowIso(),
    services: [
      { id: "wos1", nameSnapshot: "Dış yıkama", priceSnapshot: 450, estimatedMinutesSnapshot: 20 },
      { id: "wos2", nameSnapshot: "İç temizlik", priceSnapshot: 550, estimatedMinutesSnapshot: 30 },
    ],
    photos: [],
    damages: [{ id: "d1", area: "Ön tampon", type: "SCRATCH", note: "Hafif çizik" }],
    statusLogs: [log(null, "ACCEPTED"), log("ACCEPTED", "PARKED", "z1")],
  },
  {
    id: "wo2",
    code: "WO-1025",
    status: "EXTERIOR_WASH",
    vehicleId: "v2",
    customerId: "c2",
    currentZoneId: "z4",
    assignedStaffId: "st1",
    totalAmount: 450,
    paymentStatus: "UNPAID",
    paymentMethod: null,
    estimatedDeliveryAt: nowIso(),
    acceptedAt: nowIso(),
    services: [{ id: "wos3", nameSnapshot: "Dış yıkama", priceSnapshot: 450, estimatedMinutesSnapshot: 20 }],
    photos: [],
    damages: [],
    statusLogs: [log(null, "ACCEPTED"), log("ACCEPTED", "EXTERIOR_WASH", "z4", "st1")],
  },
  {
    id: "wo3",
    code: "WO-1026",
    status: "INTERIOR_WASH",
    vehicleId: "v3",
    customerId: "c3",
    currentZoneId: "z6",
    assignedStaffId: "st2",
    totalAmount: 550,
    paymentStatus: "PAID",
    paymentMethod: "CARD",
    estimatedDeliveryAt: nowIso(),
    acceptedAt: nowIso(),
    services: [{ id: "wos4", nameSnapshot: "İç temizlik", priceSnapshot: 550, estimatedMinutesSnapshot: 30 }],
    photos: [],
    damages: [],
    statusLogs: [log(null, "ACCEPTED"), log("ACCEPTED", "INTERIOR_WASH", "z6", "st2")],
  },
  {
    id: "wo4",
    code: "WO-1027",
    status: "READY",
    vehicleId: "v4",
    customerId: "c1",
    currentZoneId: "z9",
    assignedStaffId: "st3",
    totalAmount: 2100,
    paymentStatus: "PAID",
    paymentMethod: "CASH",
    estimatedDeliveryAt: nowIso(),
    acceptedAt: nowIso(),
    services: [
      { id: "wos5", nameSnapshot: "Cilalı yıkama", priceSnapshot: 900, estimatedMinutesSnapshot: 45 },
      { id: "wos6", nameSnapshot: "Detaylı iç", priceSnapshot: 1200, estimatedMinutesSnapshot: 60 },
    ],
    photos: [],
    damages: [],
    statusLogs: [log(null, "ACCEPTED"), log("QUALITY_CHECK", "READY", "z9", "st3")],
  },
];

const appointments: Appointment[] = [
  {
    id: "a1",
    customerId: "c2",
    vehicleId: "v2",
    date: new Date().toISOString().slice(0, 10),
    time: "16:30",
    estimatedMinutes: 50,
    status: "CONFIRMED",
    workOrderId: null,
    serviceIds: ["s1", "s2"],
    note: "Akşam teslim",
  },
];

function currentUser() {
  return USERS[currentUserEmail]?.user ?? null;
}

function hydrateWorkOrder(wo: WorkOrder) {
  const role = currentUser()!.role;
  const vehicle = vehicleOf(wo.vehicleId);
  const customer = customerOf(wo.customerId);
  const payload = {
    ...wo,
    vehicle,
    customer,
    currentZone: zoneOf(wo.currentZoneId),
    assignedStaff: staffOf(wo.assignedStaffId),
  };
  if (canViewPrices(role)) return payload;
  const { totalAmount: _t, ...rest } = payload;
  return {
    ...rest,
    services: payload.services.map(({ priceSnapshot: _p, ...s }) => s),
  };
}

class DemoHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function parseBody(options: RequestInit) {
  if (!options.body) return {};
  if (options.body instanceof FormData) return Object.fromEntries(options.body.entries());
  if (typeof options.body === "string") return JSON.parse(options.body);
  return {};
}

function qs(path: string) {
  const url = new URL(path, "http://demo.local");
  return { pathname: url.pathname.replace(/\/$/, "") || "/", query: url.searchParams };
}

export async function handleDemoRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const full = path.startsWith("/api") ? path : `/api${path}`;
  const { pathname, query } = qs(full);
  const body = parseBody(options);

  const json = (data: unknown, status = 200) => {
    if (status >= 400) {
      const message = (data as { error?: { message?: string } })?.error?.message || "Hata";
      throw new DemoHttpError(status, message);
    }
    return data as T;
  };

  if (pathname === "/api/auth/login" && method === "POST") {
    const email = String(body.email || "").toLowerCase();
    const account = USERS[email];
    if (!account || account.password !== body.password) {
      return json({ error: { message: "Invalid credentials" } }, 401);
    }
    currentUserEmail = email;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("demoUserEmail", email);
    }
    return json({
      accessToken: "demo-access",
      user: account.user,
    });
  }
  if (pathname === "/api/auth/me") {
    const user = currentUser();
    if (!user) return json({ error: { message: "Oturum gerekli" } }, 401);
    return json({ user, business: BUSINESS });
  }
  if (pathname === "/api/auth/logout" && method === "POST") {
    currentUserEmail = "";
    if (typeof localStorage !== "undefined") localStorage.removeItem("demoUserEmail");
    return undefined as T;
  }
  if (pathname === "/api/auth/refresh" && method === "POST") {
    const user = currentUser();
    if (!user) return json({ error: { message: "Oturum gerekli" } }, 401);
    return json({ accessToken: "demo-access", user });
  }

  if (!currentUser()) {
    return json({ error: { message: "Oturum gerekli" } }, 401);
  }

  if (pathname === "/api/portal/catalog" && method === "GET") {
    return json({ items: catalog.filter((s) => s.isActive) });
  }

  if (pathname === "/api/portal/track" && method === "GET") {
    const plate = normalizePlate(query.get("plate") || "");
    if (plate.length < 5) return json({ error: { message: "Plaka gerekli" } }, 400);
    const vehicle = vehicles.find((v) => v.plate === plate);
    if (!vehicle) return json({ found: false, plate });
    const customer = customerOf(vehicle.customerId);
    const workOrder = workOrders.find(
      (wo) => wo.vehicleId === vehicle.id && wo.status !== "CANCELLED",
    );
    if (!workOrder) {
      return json({
        found: true,
        inProgress: false,
        plate,
        customer: { firstName: customer.firstName, lastName: customer.lastName },
        vehicle: { brand: vehicle.brand, model: vehicle.model, color: vehicle.color },
      });
    }
    return json({
      found: true,
      inProgress: ACTIVE_WORK_ORDER_STATUSES.includes(workOrder.status),
      plate,
      code: workOrder.code,
      status: workOrder.status,
      estimatedDeliveryAt: workOrder.estimatedDeliveryAt,
      zoneName: zoneOf(workOrder.currentZoneId)?.name ?? null,
      staffName: staffOf(workOrder.assignedStaffId)?.name ?? null,
      customer: { firstName: customer.firstName, lastName: customer.lastName },
      vehicle: { brand: vehicle.brand, model: vehicle.model, color: vehicle.color },
      steps: buildCustomerJourney(workOrder.status),
      cancelled: workOrder.status === "CANCELLED",
      delivered: workOrder.status === "DELIVERED",
    });
  }

  if (pathname === "/api/portal/appointments" && method === "POST") {
    const plate = normalizePlate(body.plate || "");
    if (!body.firstName || !body.phone || !plate || !body.serviceIds?.length) {
      return json({ error: { message: "Ad, telefon, plaka ve hizmet zorunlu" } }, 400);
    }
    let customer = customers.find((c) => c.phone === body.phone);
    if (!customer) {
      customer = {
        id: uid("c"),
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
      };
      customers.unshift(customer);
    }
    let vehicle = vehicles.find((v) => v.plate === plate);
    if (!vehicle) {
      vehicle = {
        id: uid("v"),
        customerId: customer.id,
        plate,
      };
      vehicles.unshift(vehicle);
    }
    const selected = catalog.filter((s) => body.serviceIds.includes(s.id));
    const created: Appointment = {
      id: uid("a"),
      customerId: customer.id,
      vehicleId: vehicle.id,
      date: body.date,
      time: body.time,
      estimatedMinutes: selected.reduce((sum, s) => sum + s.estimatedMinutes, 0),
      note: body.note ? `[Portal] ${body.note}` : "[Portal]",
      status: "PENDING",
      workOrderId: null,
      serviceIds: body.serviceIds,
    };
    appointments.unshift(created);
    return json(
      {
        ...created,
        customer,
        vehicle,
        totalAmount: selected.reduce((sum, s) => sum + s.price, 0),
      },
      201,
    );
  }


  if (pathname === "/api/dashboard/board") {
    const columns = Object.fromEntries(
      WORK_ORDER_STATUSES.filter((s) => s !== "DELIVERED" && s !== "CANCELLED").map((status) => [
        status,
        workOrders.filter((wo) => wo.status === status).map(hydrateWorkOrder),
      ]),
    );
    return json({
      columns,
      zones: zones.map((zone) => ({
        ...zone,
        currentWorkOrder: zone.currentWorkOrderId
          ? hydrateWorkOrder(workOrders.find((wo) => wo.id === zone.currentWorkOrderId)!)
          : null,
      })),
      staff: staff.map((member) => ({
        ...member,
        activeWorkOrders: workOrders
          .filter((wo) => wo.assignedStaffId === member.id && ACTIVE_WORK_ORDER_STATUSES.includes(wo.status))
          .map(hydrateWorkOrder),
      })),
    });
  }

  if (pathname === "/api/dashboard/summary") {
    const occupied = zones.filter((z) => z.status === "OCCUPIED").length;
    const payload: Record<string, unknown> = {
      vehiclesInProgress: workOrders.filter((wo) => ACTIVE_WORK_ORDER_STATUSES.includes(wo.status)).length,
      readyCount: workOrders.filter((wo) => wo.status === "READY").length,
      unpaidCount: workOrders.filter((wo) => wo.paymentStatus === "UNPAID" && wo.status !== "CANCELLED").length,
      zoneOccupancy: { occupied, total: zones.length, outOfService: 0 },
    };
    if (canViewReports(currentUser()!.role)) {
      payload.todayRevenue = workOrders
        .filter((wo) => wo.paymentStatus === "PAID")
        .reduce((sum, wo) => sum + wo.totalAmount, 0);
    }
    return json(payload);
  }

  if (pathname === "/api/customers" && method === "GET") {
    const q = (query.get("q") || "").toLowerCase();
    const items = customers
      .filter((c) => !q || `${c.firstName} ${c.lastName} ${c.phone}`.toLowerCase().includes(q))
      .map((c) => ({ ...c, vehicles: vehicles.filter((v) => v.customerId === c.id) }));
    return json({ items, total: items.length, page: 1, pageSize: 20 });
  }
  if (pathname === "/api/customers" && method === "POST") {
    const created: Customer = {
      id: uid("c"),
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      email: body.email || null,
    };
    customers.unshift(created);
    return json(created, 201);
  }
  const customerMatch = pathname.match(/^\/api\/customers\/([^/]+)(\/summary)?$/);
  if (customerMatch && method === "GET") {
    const customer = customers.find((c) => c.id === customerMatch[1]);
    if (!customer) return json({ error: { message: "Customer not found" } }, 404);
    const related = workOrders.filter((wo) => wo.customerId === customer.id);
    if (customerMatch[2]) {
      return json({
        customer,
        vehicles: vehicles.filter((v) => v.customerId === customer.id),
        recentWorkOrders: related.map(hydrateWorkOrder),
        visitCount: related.length,
        ...(canViewPrices(currentUser()!.role)
          ? { totalSpent: related.filter((wo) => wo.paymentStatus === "PAID").reduce((s, wo) => s + wo.totalAmount, 0) }
          : {}),
      });
    }
    return json({ ...customer, vehicles: vehicles.filter((v) => v.customerId === customer.id) });
  }

  if (pathname === "/api/vehicles" && method === "GET") {
    const plate = query.get("plate") ? normalizePlate(query.get("plate")!) : "";
    const q = query.get("q") || "";
    const customerId = query.get("customerId");
    let items = vehicles.map((v) => ({ ...v, customer: customerOf(v.customerId) }));
    if (plate) items = items.filter((v) => v.plate === plate);
    if (customerId) items = items.filter((v) => v.customerId === customerId);
    if (q) {
      const n = q.toLowerCase();
      items = items.filter((v) => v.plate.toLowerCase().includes(normalizePlate(q).toLowerCase()) || `${v.brand} ${v.model}`.toLowerCase().includes(n));
    }
    return json({ items });
  }
  if (pathname === "/api/vehicles" && method === "POST") {
    const created: Vehicle = {
      id: uid("v"),
      customerId: body.customerId,
      plate: normalizePlate(body.plate),
      brand: body.brand,
      model: body.model,
      color: body.color,
      year: body.year,
    };
    vehicles.unshift(created);
    return json({ ...created, customer: customerOf(created.customerId) }, 201);
  }
  const vehicleHistory = pathname.match(/^\/api\/vehicles\/([^/]+)\/history$/);
  if (vehicleHistory) {
    const vehicle = vehicles.find((v) => v.id === vehicleHistory[1]);
    if (!vehicle) return json({ error: { message: "Vehicle not found" } }, 404);
    return json({
      vehicle: { ...vehicle, customer: customerOf(vehicle.customerId) },
      workOrders: workOrders.filter((wo) => wo.vehicleId === vehicle.id).map(hydrateWorkOrder),
    });
  }

  if (pathname === "/api/services" && method === "GET") {
    const role = currentUser()!.role;
    const items = canViewPrices(role) ? catalog : catalog.map(({ price: _p, ...s }) => s);
    return json({ items });
  }
  if (pathname === "/api/services" && method === "POST") {
    const created: Service = {
      id: uid("s"),
      name: body.name,
      price: typeof body.price === "number" ? body.price : Number.parseFloat(String(body.price)),
      estimatedMinutes: Number(body.estimatedMinutes),
      zoneType: body.zoneType,
      isActive: true,
    };
    catalog.push(created);
    return json(created, 201);
  }

  if (pathname === "/api/staff" && method === "GET") {
    return json({
      items: staff.map((member) => ({
        ...member,
        workOrders: workOrders
          .filter((wo) => wo.assignedStaffId === member.id && ACTIVE_WORK_ORDER_STATUSES.includes(wo.status))
          .map(hydrateWorkOrder),
      })),
    });
  }
  if (pathname === "/api/staff" && method === "POST") {
    const created: Staff = { id: uid("st"), name: body.name, phone: body.phone, specialty: body.specialty };
    staff.push(created);
    return json(created, 201);
  }

  if (pathname === "/api/zones" && method === "GET") {
    return json({
      items: zones.map((zone) => ({
        ...zone,
        currentWorkOrder: zone.currentWorkOrderId
          ? hydrateWorkOrder(workOrders.find((wo) => wo.id === zone.currentWorkOrderId)!)
          : null,
      })),
    });
  }
  if (pathname === "/api/zones" && method === "POST") {
    const created: Zone = { id: uid("z"), name: body.name, type: body.type, status: "EMPTY", currentWorkOrderId: null };
    zones.push(created);
    return json(created, 201);
  }
  const zonePut = pathname.match(/^\/api\/zones\/([^/]+)$/);
  if (zonePut && method === "PUT") {
    const zone = zones.find((z) => z.id === zonePut[1]);
    if (!zone) return json({ error: { message: "Zone not found" } }, 404);
    if (body.status === "EMPTY" && zone.currentWorkOrderId) {
      return json({ error: { message: "Cannot mark occupied zone as empty" } }, 422);
    }
    Object.assign(zone, body);
    return json(zone);
  }

  if (pathname === "/api/appointments" && method === "GET") {
    return json({
      items: appointments.map((a) => ({
        ...a,
        customer: customerOf(a.customerId),
        vehicle: vehicleOf(a.vehicleId),
        services: catalog
          .filter((s) => a.serviceIds.includes(s.id))
          .map((s) => ({ service: { name: s.name } })),
        source: a.note?.startsWith("[Portal]") ? "portal" : "staff",
      })),
    });
  }
  if (pathname === "/api/appointments" && method === "POST") {
    const created: Appointment = {
      id: uid("a"),
      customerId: body.customerId,
      vehicleId: body.vehicleId,
      date: body.date,
      time: body.time,
      estimatedMinutes: body.estimatedMinutes ?? 40,
      note: body.note,
      status: "PENDING",
      workOrderId: null,
      serviceIds: body.serviceIds || [],
    };
    appointments.unshift(created);
    return json({
      ...created,
      customer: customerOf(created.customerId),
      vehicle: vehicleOf(created.vehicleId),
    }, 201);
  }
  const convert = pathname.match(/^\/api\/appointments\/([^/]+)\/convert$/);
  if (convert && method === "POST") {
    const appointment = appointments.find((a) => a.id === convert[1]);
    if (!appointment) return json({ error: { message: "Appointment not found" } }, 404);
    if (appointment.workOrderId) return json({ error: { message: "Appointment already converted" } }, 422);
    const wo = createWorkOrder({
      vehicleId: appointment.vehicleId,
      customerId: appointment.customerId,
      serviceIds: appointment.serviceIds,
      note: appointment.note,
    });
    appointment.workOrderId = wo.id;
    appointment.status = "IN_PROGRESS";
    return json({ appointment, workOrder: hydrateWorkOrder(wo) }, 201);
  }

  if (pathname === "/api/work-orders" && method === "POST") {
    const wo = createWorkOrder(body);
    return json(hydrateWorkOrder(wo), 201);
  }
  if (pathname === "/api/work-orders" && method === "GET") {
    return json({ items: workOrders.map(hydrateWorkOrder) });
  }

  const woMatch = pathname.match(/^\/api\/work-orders\/([^/]+)(?:\/(transition|assign-staff|photos|damages|payment|cancel))?$/);
  if (woMatch) {
    const wo = workOrders.find((item) => item.id === woMatch[1]);
    if (!wo) return json({ error: { message: "Work order not found" } }, 404);
    const action = woMatch[2];

    if (!action && method === "GET") return json(hydrateWorkOrder(wo));

    if (action === "transition" && method === "POST") {
      try {
        assertTransition(wo.status, body.toStatus);
      } catch {
        return json({ error: { message: `Invalid work order transition: ${wo.status} → ${body.toStatus}` } }, 422);
      }
      const nextStatus = body.toStatus as WorkOrderStatus;
      if (body.zoneId) {
        const zone = zones.find((z) => z.id === body.zoneId);
        if (!zone) return json({ error: { message: "Zone not found" } }, 404);
        if (zone.status === "OUT_OF_SERVICE") {
          return json({ error: { message: "Zone is out of service" } }, 422);
        }
        if (zone.currentWorkOrderId && zone.currentWorkOrderId !== wo.id) {
          return json({ error: { message: "Zone is occupied" } }, 409);
        }
        if (!isZoneTypeAllowedForStatus(nextStatus, zone.type) && !shouldReleaseZone(nextStatus)) {
          return json({ error: { message: `Zone type ${zone.type} is not valid for status ${nextStatus}` } }, 422);
        }
        if (wo.currentZoneId && wo.currentZoneId !== zone.id) {
          const prev = zoneOf(wo.currentZoneId);
          if (prev) {
            prev.status = "EMPTY";
            prev.currentWorkOrderId = null;
          }
        }
        zone.status = "OCCUPIED";
        zone.currentWorkOrderId = wo.id;
        wo.currentZoneId = zone.id;
      } else if (isZoneRequired(nextStatus)) {
        return json({ error: { message: "zoneId is required for this status" } }, 422);
      } else if (shouldReleaseZone(nextStatus) && wo.currentZoneId) {
        const prev = zoneOf(wo.currentZoneId);
        if (prev) {
          prev.status = "EMPTY";
          prev.currentWorkOrderId = null;
        }
        wo.currentZoneId = null;
      }
      if (body.staffId) wo.assignedStaffId = body.staffId;
      wo.statusLogs.unshift(log(wo.status, nextStatus, wo.currentZoneId, wo.assignedStaffId));
      wo.status = nextStatus;
      return json(hydrateWorkOrder(wo));
    }

    if (action === "assign-staff" && method === "POST") {
      wo.assignedStaffId = body.staffId;
      return json(hydrateWorkOrder(wo));
    }
    if (action === "payment" && method === "POST") {
      wo.paymentMethod = body.method;
      wo.paymentStatus = body.status;
      return json(hydrateWorkOrder(wo));
    }
    if (action === "cancel" && method === "POST") {
      if (wo.currentZoneId) {
        const prev = zoneOf(wo.currentZoneId);
        if (prev) {
          prev.status = "EMPTY";
          prev.currentWorkOrderId = null;
        }
      }
      wo.statusLogs.unshift(log(wo.status, "CANCELLED"));
      wo.status = "CANCELLED";
      wo.currentZoneId = null;
      wo.cancelledReason = body.reason;
      return json(hydrateWorkOrder(wo));
    }
    if (action === "photos" && method === "POST") {
      const photo = {
        id: uid("ph"),
        category: (body.category || "FRONT") as PhotoCategory,
        fileUrl:
          "data:image/svg+xml," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect fill="#115e59" width="640" height="400"/><text x="50%" y="50%" fill="white" font-size="28" text-anchor="middle" font-family="sans-serif">Demo fotoğraf</text></svg>`,
          ),
      };
      wo.photos.push(photo);
      return json(photo, 201);
    }
    if (action === "damages" && method === "POST") {
      const damage = { id: uid("dm"), area: body.area, type: body.type, note: body.note };
      wo.damages.push(damage);
      return json(damage, 201);
    }
  }

  return json({ error: { message: `Demo endpoint yok: ${method} ${pathname}` } }, 404);
}

function createWorkOrder(body: {
  vehicleId?: string;
  customerId?: string;
  plate?: string;
  serviceIds: string[];
  note?: string;
  customer?: { firstName: string; lastName: string; phone: string };
  vehicle?: { plate?: string; brand?: string; model?: string; color?: string; year?: number };
}) {
  let vehicle = body.vehicleId ? vehicles.find((v) => v.id === body.vehicleId) : undefined;
  if (!vehicle) {
    const plate = normalizePlate(body.plate || body.vehicle?.plate || "");
    vehicle = vehicles.find((v) => v.plate === plate);
    if (!vehicle) {
      let customer = body.customerId ? customers.find((c) => c.id === body.customerId) : undefined;
      if (!customer && body.customer) {
        customer = {
          id: uid("c"),
          firstName: body.customer.firstName,
          lastName: body.customer.lastName,
          phone: body.customer.phone,
        };
        customers.unshift(customer);
      }
      if (!customer) throw new DemoHttpError(422, "Customer is required for a new vehicle");
      vehicle = {
        id: uid("v"),
        customerId: customer.id,
        plate,
        brand: body.vehicle?.brand,
        model: body.vehicle?.model,
        color: body.vehicle?.color,
        year: body.vehicle?.year,
      };
      vehicles.unshift(vehicle);
    }
  }
  const selected = catalog.filter((s) => body.serviceIds?.includes(s.id));
  seq += 1;
  const wo: WorkOrder = {
    id: uid("wo"),
    code: `WO-${seq}`,
    status: "ACCEPTED",
    vehicleId: vehicle.id,
    customerId: vehicle.customerId,
    currentZoneId: null,
    assignedStaffId: null,
    note: body.note,
    totalAmount: selected.reduce((sum, s) => sum + s.price, 0),
    paymentStatus: "UNPAID",
    paymentMethod: null,
    estimatedDeliveryAt: nowIso(),
    acceptedAt: nowIso(),
    services: selected.map((s) => ({
      id: uid("wos"),
      nameSnapshot: s.name,
      priceSnapshot: s.price,
      estimatedMinutesSnapshot: s.estimatedMinutes,
    })),
    photos: [],
    damages: [],
    statusLogs: [log(null, "ACCEPTED")],
  };
  workOrders.unshift(wo);
  return wo;
}
