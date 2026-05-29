import { PrismaClient, RoleKey, ShiftStatus, SwapStatus } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Admin123!";

async function upsertUser(email: string, name: string) {
  const passwordHash = await argon2.hash(DEMO_PASSWORD);
  return prisma.user.upsert({
    where: { email },
    create: { email, name, passwordHash },
    update: { name, passwordHash },
  });
}

async function upsertTenantUser(tenantId: string, userId: string) {
  return prisma.tenantUser.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    create: { tenantId, userId },
    update: {},
  });
}

async function upsertSiteMembership(
  tenantUserId: string,
  siteId: string,
  role: RoleKey,
  permissions: string[] = [],
) {
  const existing = await prisma.siteMembership.findFirst({
    where: { tenantUserId, siteId },
  });
  if (existing) {
    return prisma.siteMembership.update({
      where: { id: existing.id },
      data: { role, permissions },
    });
  }
  return prisma.siteMembership.create({
    data: { tenantUserId, siteId, role, permissions },
  });
}

async function main() {
  console.info("Seeding StaffStack demo data…");

  const admin = await upsertUser("admin@acme.demo", "Acme Admin");
  const manager = await upsertUser("manager@acme.demo", "Acme Manager");
  const scheduler = await upsertUser("scheduler@acme.demo", "Acme Scheduler");
  const employee = await upsertUser("employee@acme.demo", "Acme Employee");
  const viewer = await upsertUser("viewer@acme.demo", "Acme Viewer");

  const tenantA = await prisma.tenant.upsert({
    where: { slug: "acme" },
    create: {
      name: "Acme Corp",
      slug: "acme",
      settings: { theme: "corporate", weekStartsOn: 1 },
      features: { analytics: false, apiKeys: true, sso: false },
    },
    update: {
      settings: { theme: "corporate", weekStartsOn: 1 },
      features: { analytics: false, apiKeys: true, sso: false },
    },
  });

  const siteNy = await prisma.site.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      tenantId: tenantA.id,
      name: "NYC HQ",
      timezone: "America/New_York",
    },
    update: { name: "NYC HQ", timezone: "America/New_York" },
  });

  const siteChi = await prisma.site.upsert({
    where: { id: "00000000-0000-4000-8000-000000000002" },
    create: {
      id: "00000000-0000-4000-8000-000000000002",
      tenantId: tenantA.id,
      name: "Chicago",
      timezone: "America/Chicago",
    },
    update: { name: "Chicago", timezone: "America/Chicago" },
  });

  await prisma.department.upsert({
    where: { id: "00000000-0000-4000-8000-000000000010" },
    create: {
      id: "00000000-0000-4000-8000-000000000010",
      tenantId: tenantA.id,
      siteId: siteNy.id,
      name: "Operations",
    },
    update: { name: "Operations" },
  });

  const adminTu = await upsertTenantUser(tenantA.id, admin.id);
  const managerTu = await upsertTenantUser(tenantA.id, manager.id);
  const schedulerTu = await upsertTenantUser(tenantA.id, scheduler.id);
  const employeeTu = await upsertTenantUser(tenantA.id, employee.id);
  const viewerTu = await upsertTenantUser(tenantA.id, viewer.id);

  await upsertSiteMembership(adminTu.id, siteNy.id, RoleKey.TENANT_ADMIN);
  await upsertSiteMembership(managerTu.id, siteNy.id, RoleKey.MANAGER);
  await upsertSiteMembership(schedulerTu.id, siteNy.id, RoleKey.SCHEDULER);
  await upsertSiteMembership(employeeTu.id, siteNy.id, RoleKey.EMPLOYEE);
  await upsertSiteMembership(viewerTu.id, siteNy.id, RoleKey.VIEWER);
  await upsertSiteMembership(managerTu.id, siteChi.id, RoleKey.MANAGER);
  await upsertSiteMembership(employeeTu.id, siteChi.id, RoleKey.EMPLOYEE);

  for (const tuRow of [adminTu, managerTu, schedulerTu, employeeTu, viewerTu]) {
    await prisma.notificationPreference.upsert({
      where: { tenantUserId: tuRow.id },
      create: {
        userId: tuRow.userId,
        tenantUserId: tuRow.id,
        emailEnabled: true,
        smsEnabled: false,
      },
      update: { emailEnabled: true },
    });
  }

  const starts = new Date();
  starts.setUTCDate(starts.getUTCDate() + 1);
  starts.setUTCHours(14, 0, 0, 0);
  const ends = new Date(starts);
  ends.setUTCHours(22, 0, 0, 0);

  const shiftId = "00000000-0000-4000-8000-0000000000a1";
  const draftShiftId = "00000000-0000-4000-8000-0000000000a2";

  const shift = await prisma.shift.upsert({
    where: { id: shiftId },
    create: {
      id: shiftId,
      tenantId: tenantA.id,
      siteId: siteNy.id,
      title: "Floor coverage",
      startsAt: starts,
      endsAt: ends,
      status: ShiftStatus.PUBLISHED,
      recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
      recurrenceEnd: new Date(starts.getTime() + 90 * 24 * 60 * 60 * 1000),
    },
    update: {
      title: "Floor coverage",
      startsAt: starts,
      endsAt: ends,
      status: ShiftStatus.PUBLISHED,
    },
  });

  await prisma.shiftAssignment.upsert({
    where: { shiftId_userId: { shiftId: shift.id, userId: employee.id } },
    create: { tenantId: tenantA.id, shiftId: shift.id, userId: employee.id },
    update: {},
  });

  const draftShift = await prisma.shift.upsert({
    where: { id: draftShiftId },
    create: {
      id: draftShiftId,
      tenantId: tenantA.id,
      siteId: siteNy.id,
      title: "Draft shift",
      startsAt: new Date(starts.getTime() + 86400000),
      endsAt: new Date(ends.getTime() + 86400000),
      status: ShiftStatus.DRAFT,
    },
    update: {
      startsAt: new Date(starts.getTime() + 86400000),
      endsAt: new Date(ends.getTime() + 86400000),
    },
  });

  const assign = await prisma.shiftAssignment.findFirst({
    where: { shiftId: shift.id, userId: employee.id },
  });

  const managerAssign = await prisma.shiftAssignment.upsert({
    where: { shiftId_userId: { shiftId: draftShift.id, userId: manager.id } },
    create: { tenantId: tenantA.id, shiftId: draftShift.id, userId: manager.id },
    update: {},
  });

  if (assign) {
    const existingSwap = await prisma.shiftSwap.findFirst({
      where: { tenantId: tenantA.id, requesterAssignmentId: assign.id },
    });
    if (!existingSwap) {
      await prisma.shiftSwap.create({
        data: {
          tenantId: tenantA.id,
          status: SwapStatus.REQUESTED,
          requesterAssignmentId: assign.id,
          targetAssignmentId: managerAssign.id,
          fromShiftId: shift.id,
          toShiftId: draftShift.id,
          message: "Demo swap request",
        },
      });
    }
  }

  await prisma.availabilityRule.deleteMany({ where: { tenantUserId: employeeTu.id } });
  await prisma.availabilityRule.createMany({
    data: [
      { tenantUserId: employeeTu.id, dayOfWeek: 1, startMinute: 9 * 60, endMinute: 17 * 60 },
      { tenantUserId: employeeTu.id, dayOfWeek: 3, startMinute: 9 * 60, endMinute: 17 * 60 },
    ],
  });

  const ptoStart = new Date();
  ptoStart.setUTCMonth(ptoStart.getUTCMonth() + 2, 1);
  const ptoEnd = new Date(ptoStart);
  ptoEnd.setUTCDate(ptoEnd.getUTCDate() + 4);

  const existingPto = await prisma.ptoRequest.findFirst({
    where: { tenantUserId: employeeTu.id, reason: "Demo PTO" },
  });
  if (!existingPto) {
    await prisma.ptoRequest.create({
      data: {
        tenantId: tenantA.id,
        tenantUserId: employeeTu.id,
        startsOn: ptoStart,
        endsOn: ptoEnd,
        reason: "Demo PTO",
      },
    });
  }

  const tenantB = await prisma.tenant.upsert({
    where: { slug: "medstaff" },
    create: {
      name: "MedStaff Partners",
      slug: "medstaff",
      settings: { theme: "day", weekStartsOn: 0 },
      features: { analytics: false },
      timeDisplayFormat: "TWENTY_FOUR_HOUR",
    },
    update: {
      timeDisplayFormat: "TWENTY_FOUR_HOUR",
    },
  });

  const medSite = await prisma.site.upsert({
    where: { id: "00000000-0000-4000-8000-0000000000b1" },
    create: {
      id: "00000000-0000-4000-8000-0000000000b1",
      tenantId: tenantB.id,
      name: "Urgent Care North",
      timezone: "America/Los_Angeles",
    },
    update: { name: "Urgent Care North" },
  });

  const medAdmin = await upsertUser("admin@medstaff.demo", "Med Admin");
  const medTu = await upsertTenantUser(tenantB.id, medAdmin.id);
  await upsertSiteMembership(medTu.id, medSite.id, RoleKey.TENANT_ADMIN);

  await prisma.tenant.upsert({
    where: { slug: "neon-cyber" },
    create: {
      name: "Neon Cyber Demo",
      slug: "neon-cyber",
      settings: { theme: "cyberpunk" },
      features: { analytics: true, apiKeys: true },
    },
    update: {
      settings: { theme: "cyberpunk" },
      features: { analytics: true, apiKeys: true },
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenantA.id,
      actorUserId: admin.id,
      action: "seed.completed",
      entityType: "system",
      metadata: { version: 1 },
    },
  });

  console.info("Done. Demo password for all demo users:", DEMO_PASSWORD);
  console.info("Tenants: acme, medstaff, neon-cyber — sign in at /login");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
