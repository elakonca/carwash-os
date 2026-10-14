import bcrypt from "bcryptjs";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";

const app = createApp();

describe("critical API flows", () => {
  const stamp = `${Date.now()}`;
  const password = "Test123!";
  let businessA = "";
  let businessB = "";
  let userAEmail = "";
  let userBEmail = "";
  let vehicleA = "";
  let vehicleB = "";
  let serviceId = "";
  let parkZone = "";
  let lockZone = "";
  let accessA = "";

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(password, 4);
    const a = await prisma.business.create({ data: { name: `Wash A ${stamp}` } });
    const b = await prisma.business.create({ data: { name: `Wash B ${stamp}` } });
    businessA = a.id;
    businessB = b.id;
    userAEmail = `owner-a-${stamp}@test.local`;
    userBEmail = `owner-b-${stamp}@test.local`;

    await prisma.user.create({
      data: {
        businessId: businessA,
        name: "Owner A",
        email: userAEmail,
        passwordHash,
        role: "OWNER",
      },
    });
    await prisma.user.create({
      data: {
        businessId: businessB,
        name: "Owner B",
        email: userBEmail,
        passwordHash,
        role: "OWNER",
      },
    });

    const customer = await prisma.customer.create({
      data: {
        businessId: businessA,
        firstName: "Can",
        lastName: "Test",
        phone: `05${stamp.slice(-9)}`,
      },
    });
    const firstVehicle = await prisma.vehicle.create({
      data: {
        businessId: businessA,
        customerId: customer.id,
        plate: `34T${stamp.slice(-5)}`,
      },
    });
    const secondVehicle = await prisma.vehicle.create({
      data: {
        businessId: businessA,
        customerId: customer.id,
        plate: `06T${stamp.slice(-5)}`,
      },
    });
    vehicleA = firstVehicle.id;
    vehicleB = secondVehicle.id;

    const service = await prisma.service.create({
      data: {
        businessId: businessA,
        name: "Dış yıkama",
        price: "150.00",
        estimatedMinutes: 20,
        zoneType: "EXTERIOR",
      },
    });
    serviceId = service.id;

    const park = await prisma.zone.create({
      data: { businessId: businessA, name: "Park A", type: "PARK" },
    });
    const other = await prisma.zone.create({
      data: { businessId: businessA, name: "Park B", type: "PARK" },
    });
    parkZone = park.id;
    lockZone = other.id;
  });

  afterAll(async () => {
    for (const businessId of [businessA, businessB].filter(Boolean)) {
      await prisma.zone.updateMany({ where: { businessId }, data: { currentWorkOrderId: null } });
      await prisma.workOrderStatusLog.deleteMany({ where: { businessId } });
      await prisma.workOrderService.deleteMany({ where: { businessId } });
      await prisma.damageRecord.deleteMany({ where: { businessId } });
      await prisma.workOrderPhoto.deleteMany({ where: { businessId } });
      await prisma.workOrder.deleteMany({ where: { businessId } });
      await prisma.zone.deleteMany({ where: { businessId } });
      await prisma.service.deleteMany({ where: { businessId } });
      await prisma.vehicle.deleteMany({ where: { businessId } });
      await prisma.customer.deleteMany({ where: { businessId } });
      const users = await prisma.user.findMany({ where: { businessId }, select: { id: true } });
      await prisma.refreshToken.deleteMany({ where: { userId: { in: users.map((user) => user.id) } } });
      await prisma.user.deleteMany({ where: { businessId } });
      await prisma.business.delete({ where: { id: businessId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it("starts and completes the cookie-based auth flow", async () => {
    const health = await request(app).get("/health");
    expect(health.status).toBe(200);
    expect(health.body.ok).toBe(true);

    const denied = await request(app).post("/api/auth/login").send({
      email: userAEmail,
      password: "wrong-password",
    });
    expect(denied.status).toBe(401);

    const agent = request.agent(app);
    const login = await agent.post("/api/auth/login").send({ email: userAEmail, password });
    expect(login.status).toBe(200);
    expect(login.body.accessToken).toEqual(expect.any(String));
    expect(login.body.refreshToken).toBeUndefined();
    expect(login.body.user.businessId).toBe(businessA);
    const cookie = (login.headers["set-cookie"] ?? []).join(";");
    expect(cookie).toMatch(/refresh_token=/);
    expect(cookie).toMatch(/HttpOnly/i);

    accessA = login.body.accessToken as string;
    const me = await agent.get("/api/auth/me").set("Authorization", `Bearer ${accessA}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(userAEmail);

    const refreshed = await agent.post("/api/auth/refresh").send({});
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).toEqual(expect.any(String));
    expect(refreshed.body.refreshToken).toBeUndefined();
    accessA = refreshed.body.accessToken as string;
  });

  it("rejects illegal state transitions and accepts a legal one", async () => {
    const created = await request(app)
      .post("/api/work-orders")
      .set("Authorization", `Bearer ${accessA}`)
      .send({ vehicleId: vehicleA, serviceIds: [serviceId] });
    expect(created.status).toBe(201);

    const illegal = await request(app)
      .post(`/api/work-orders/${created.body.id}/transition`)
      .set("Authorization", `Bearer ${accessA}`)
      .send({ toStatus: "DELIVERED" });
    expect(illegal.status).toBe(422);
    expect(illegal.body.error.code).toBe("INVALID_TRANSITION");

    const parked = await request(app)
      .post(`/api/work-orders/${created.body.id}/transition`)
      .set("Authorization", `Bearer ${accessA}`)
      .send({ toStatus: "PARKED", zoneId: parkZone });
    expect(parked.status).toBe(200);
    expect(parked.body.status).toBe("PARKED");
    expect(parked.body.currentZoneId).toBe(parkZone);
  });

  it("refuses a second work order that tries to occupy a locked zone", async () => {
    const first = await request(app)
      .post("/api/work-orders")
      .set("Authorization", `Bearer ${accessA}`)
      .send({ vehicleId: vehicleA, serviceIds: [serviceId] });
    const second = await request(app)
      .post("/api/work-orders")
      .set("Authorization", `Bearer ${accessA}`)
      .send({ vehicleId: vehicleB, serviceIds: [serviceId] });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const occupy = await request(app)
      .post(`/api/work-orders/${first.body.id}/transition`)
      .set("Authorization", `Bearer ${accessA}`)
      .send({ toStatus: "PARKED", zoneId: lockZone });
    expect(occupy.status).toBe(200);

    const conflict = await request(app)
      .post(`/api/work-orders/${second.body.id}/transition`)
      .set("Authorization", `Bearer ${accessA}`)
      .send({ toStatus: "PARKED", zoneId: lockZone });
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe("ZONE_OCCUPIED");
  });

  it("hides another tenant's work order", async () => {
    const created = await request(app)
      .post("/api/work-orders")
      .set("Authorization", `Bearer ${accessA}`)
      .send({ vehicleId: vehicleB, serviceIds: [serviceId] });
    expect(created.status).toBe(201);

    const other = await request(app).post("/api/auth/login").send({ email: userBEmail, password });
    expect(other.status).toBe(200);

    const hidden = await request(app)
      .get(`/api/work-orders/${created.body.id}`)
      .set("Authorization", `Bearer ${other.body.accessToken}`);
    expect(hidden.status).toBe(404);
  });
});
