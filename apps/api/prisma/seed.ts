import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Owner123!", 10);
  const staffHash = await bcrypt.hash("Staff123!", 10);

  const business = await prisma.business.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      name: "AquaShine Oto Yıkama",
      phone: "+90 212 000 00 00",
      address: "Maslak, İstanbul",
      workingHours: {
        mon: { open: "08:00", close: "20:00", closed: false },
        tue: { open: "08:00", close: "20:00", closed: false },
        wed: { open: "08:00", close: "20:00", closed: false },
        thu: { open: "08:00", close: "20:00", closed: false },
        fri: { open: "08:00", close: "20:00", closed: false },
        sat: { open: "09:00", close: "19:00", closed: false },
        sun: { open: "10:00", close: "18:00", closed: false },
      },
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: "owner@aquashine.com" },
    update: {},
    create: {
      businessId: business.id,
      name: "Elanur Konca",
      email: "owner@aquashine.com",
      phone: "+90 532 000 00 01",
      passwordHash,
      role: "OWNER",
    },
  });

  await prisma.user.upsert({
    where: { email: "staff@aquashine.com" },
    update: {},
    create: {
      businessId: business.id,
      name: "Ahmet Yılmaz",
      email: "staff@aquashine.com",
      phone: "+90 532 000 00 02",
      passwordHash: staffHash,
      role: "STAFF",
    },
  });

  const managerHash = await bcrypt.hash("Manager123!", 10);
  await prisma.user.upsert({
    where: { email: "manager@aquashine.com" },
    update: {},
    create: {
      businessId: business.id,
      name: "Selin Aksoy",
      email: "manager@aquashine.com",
      phone: "+90 532 000 00 03",
      passwordHash: managerHash,
      role: "MANAGER",
    },
  });

  const staffUser = await prisma.user.findUniqueOrThrow({
    where: { email: "staff@aquashine.com" },
  });

  const staffMembers = [
    { name: "Ahmet Yılmaz", specialty: "Dış yıkama", userId: staffUser.id },
    { name: "Mehmet Demir", specialty: "İç temizlik", userId: null },
    { name: "Ayşe Kaya", specialty: "Detay", userId: null },
  ];

  for (const member of staffMembers) {
    const existing = await prisma.staff.findFirst({
      where: { businessId: business.id, name: member.name },
    });
    if (!existing) {
      await prisma.staff.create({
        data: { businessId: business.id, ...member, isActive: true },
      });
    }
  }

  const zoneDefs = [
    { name: "Park 1", type: "PARK" as const },
    { name: "Park 2", type: "PARK" as const },
    { name: "Park 3", type: "PARK" as const },
    { name: "Dış 1", type: "EXTERIOR" as const },
    { name: "Dış 2", type: "EXTERIOR" as const },
    { name: "İç 1", type: "INTERIOR" as const },
    { name: "İç 2", type: "INTERIOR" as const },
    { name: "Detay 1", type: "DETAILING" as const },
    { name: "Teslim", type: "DELIVERY" as const },
  ];

  for (const zone of zoneDefs) {
    const existing = await prisma.zone.findFirst({
      where: { businessId: business.id, name: zone.name },
    });
    if (!existing) {
      await prisma.zone.create({ data: { businessId: business.id, ...zone } });
    }
  }

  const serviceDefs = [
    { name: "Dış yıkama", price: 450, estimatedMinutes: 20, zoneType: "EXTERIOR" as const },
    { name: "İç temizlik", price: 550, estimatedMinutes: 30, zoneType: "INTERIOR" as const },
    { name: "Motor yıkama", price: 350, estimatedMinutes: 15, zoneType: "EXTERIOR" as const },
    { name: "Cilalı yıkama", price: 900, estimatedMinutes: 45, zoneType: "EXTERIOR" as const },
    { name: "Detaylı iç", price: 1200, estimatedMinutes: 60, zoneType: "DETAILING" as const },
  ];

  for (const service of serviceDefs) {
    const existing = await prisma.service.findFirst({
      where: { businessId: business.id, name: service.name },
    });
    if (!existing) {
      await prisma.service.create({ data: { businessId: business.id, ...service } });
    }
  }

  const customer = await prisma.customer.upsert({
    where: {
      businessId_phone: { businessId: business.id, phone: "05320001122" },
    },
    update: {},
    create: {
      businessId: business.id,
      firstName: "Can",
      lastName: "Öztürk",
      phone: "05320001122",
      email: "can@example.com",
    },
  });

  await prisma.vehicle.upsert({
    where: {
      businessId_plate: { businessId: business.id, plate: "34ABC123" },
    },
    update: {},
    create: {
      businessId: business.id,
      customerId: customer.id,
      plate: "34ABC123",
      brand: "BMW",
      model: "320i",
      year: 2021,
      color: "Siyah",
    },
  });

  console.log("Seed complete.");
  console.log("OWNER    owner@aquashine.com / Owner123!");
  console.log("MANAGER  manager@aquashine.com / Manager123!");
  console.log("STAFF    staff@aquashine.com / Staff123!");
  console.log("Owner user id:", owner.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
