import { PrismaClient, RoleKey, ShiftStatus, SwapStatus } from "@prisma/client";
import { faker } from "@faker-js/faker";
import * as argon2 from "argon2";
import { clearSeedData } from "./seed-clear";
import { parseSeedArgs, type SeedOptions } from "./seed-cli";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Admin123!";

/** Fixed UUIDs for idempotent re-seeds */
const SITE_IDS = {
  nyc: "00000000-0000-4000-8000-000000000001",
  chi: "00000000-0000-4000-8000-000000000002",
  la: "00000000-0000-4000-8000-000000000003",
} as const;

type SeedUser = { email: string; name: string };

let demoPasswordHash: string | null = null;

async function passwordHash(): Promise<string> {
  if (!demoPasswordHash) {
    demoPasswordHash = await argon2.hash(DEMO_PASSWORD);
  }
  return demoPasswordHash;
}

function personName(useFaker: boolean, fallback: string): string {
  if (!useFaker) return fallback;
  return faker.person.fullName();
}

function shiftTitle(useFaker: boolean, fallback: string): string {
  if (!useFaker) return fallback;
  return `${faker.company.buzzAdjective()} ${faker.company.buzzNoun()} shift`;
}

function buildAcmeRoster(options: SeedOptions) {
  if (options.useFaker) {
    faker.seed(42);
  }

  const employees: SeedUser[] = Array.from({ length: options.employeeCount }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    return {
      email: `employee${n}@acme.demo`,
      name: personName(options.useFaker, `Acme Employee ${n}`),
    };
  });

  return {
    admin: [{ email: "admin@acme.demo", name: personName(options.useFaker, "Acme Admin") }],
    managers: [
      { email: "manager1@acme.demo", name: personName(options.useFaker, "Jordan Lee") },
      { email: "manager2@acme.demo", name: personName(options.useFaker, "Sam Rivera") },
    ],
    schedulers: [
      { email: "scheduler1@acme.demo", name: personName(options.useFaker, "Alex Chen") },
      { email: "scheduler2@acme.demo", name: personName(options.useFaker, "Morgan Blake") },
    ],
    employees,
    viewer: [{ email: "viewer@acme.demo", name: personName(options.useFaker, "Acme Viewer") }],
  };
}

async function upsertUser(email: string, name: string) {
  const passwordHashValue = await passwordHash();
  return prisma.user.upsert({
    where: { email },
    create: { email, name, passwordHash: passwordHashValue },
    update: { name, passwordHash: passwordHashValue },
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

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function shiftWindow(base: Date, dayOffset: number, startHour: number, durationHours: number) {
  const starts = addDays(base, dayOffset);
  starts.setUTCHours(startHour, 0, 0, 0);
  const ends = new Date(starts);
  ends.setUTCHours(startHour + durationHours, 0, 0, 0);
  return { starts, ends };
}

/** Spread employees across shifts without exceeding roster size. */
function assigneeIndicesForShift(
  shiftIndex: number,
  employeeCount: number,
  slotsPerShift: number,
): number[] {
  const indices = new Set<number>();
  for (let k = 0; k < slotsPerShift && indices.size < employeeCount; k++) {
    indices.add((shiftIndex * slotsPerShift + k) % employeeCount);
  }
  return [...indices].sort((a, b) => a - b);
}

type ShiftSpecTemplate = {
  id: string;
  siteKey: keyof typeof SITE_IDS;
  title: string;
  dayOffset: number;
  startHour: number;
  durationHours: number;
  status: ShiftStatus;
  recurrenceRule?: string;
};

function buildShiftTemplates(useFaker: boolean): ShiftSpecTemplate[] {
  const titles = [
    "Floor coverage",
    "Opening shift",
    "Midwest floor",
    "Weekend prep",
    "West coast coverage",
    "Draft shift",
  ];
  return [
    {
      id: "00000000-0000-4000-8000-0000000000a1",
      siteKey: "nyc",
      title: shiftTitle(useFaker, titles[0]),
      dayOffset: 1,
      startHour: 14,
      durationHours: 8,
      status: ShiftStatus.PUBLISHED,
      recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
    },
    {
      id: "00000000-0000-4000-8000-0000000000a2",
      siteKey: "nyc",
      title: shiftTitle(useFaker, titles[1]),
      dayOffset: 2,
      startHour: 12,
      durationHours: 8,
      status: ShiftStatus.PUBLISHED,
    },
    {
      id: "00000000-0000-4000-8000-0000000000a3",
      siteKey: "chi",
      title: shiftTitle(useFaker, titles[2]),
      dayOffset: 1,
      startHour: 15,
      durationHours: 8,
      status: ShiftStatus.PUBLISHED,
    },
    {
      id: "00000000-0000-4000-8000-0000000000a4",
      siteKey: "chi",
      title: shiftTitle(useFaker, titles[3]),
      dayOffset: 3,
      startHour: 16,
      durationHours: 6,
      status: ShiftStatus.PUBLISHED,
    },
    {
      id: "00000000-0000-4000-8000-0000000000a5",
      siteKey: "la",
      title: shiftTitle(useFaker, titles[4]),
      dayOffset: 2,
      startHour: 18,
      durationHours: 8,
      status: ShiftStatus.PUBLISHED,
    },
    {
      id: "00000000-0000-4000-8000-0000000000a6",
      siteKey: "nyc",
      title: shiftTitle(useFaker, titles[5]),
      dayOffset: 4,
      startHour: 14,
      durationHours: 8,
      status: ShiftStatus.DRAFT,
    },
  ];
}

async function seedAcmeTenant(options: SeedOptions) {
  const acmeUsers = buildAcmeRoster(options);
  const employeeCount = acmeUsers.employees.length;
  const slotsPerShift = Math.max(2, Math.ceil(employeeCount / 6));

  const adminUser = await upsertUser(acmeUsers.admin[0].email, acmeUsers.admin[0].name);
  const managerUsers = await Promise.all(
    acmeUsers.managers.map((u) => upsertUser(u.email, u.name)),
  );
  const schedulerUsers = await Promise.all(
    acmeUsers.schedulers.map((u) => upsertUser(u.email, u.name)),
  );
  const employeeUsers = await Promise.all(
    acmeUsers.employees.map((u) => upsertUser(u.email, u.name)),
  );
  const viewerUser = await upsertUser(acmeUsers.viewer[0].email, acmeUsers.viewer[0].name);

  const tenant = await prisma.tenant.upsert({
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
    where: { id: SITE_IDS.nyc },
    create: {
      id: SITE_IDS.nyc,
      tenantId: tenant.id,
      name: "NYC HQ",
      timezone: "America/New_York",
    },
    update: { name: "NYC HQ", timezone: "America/New_York" },
  });

  const siteChi = await prisma.site.upsert({
    where: { id: SITE_IDS.chi },
    create: {
      id: SITE_IDS.chi,
      tenantId: tenant.id,
      name: "Chicago",
      timezone: "America/Chicago",
    },
    update: { name: "Chicago", timezone: "America/Chicago" },
  });

  const siteLa = await prisma.site.upsert({
    where: { id: SITE_IDS.la },
    create: {
      id: SITE_IDS.la,
      tenantId: tenant.id,
      name: "Los Angeles",
      timezone: "America/Los_Angeles",
    },
    update: { name: "Los Angeles", timezone: "America/Los_Angeles" },
  });

  const siteByKey = { nyc: siteNy, chi: siteChi, la: siteLa };
  const sites = [siteNy, siteChi, siteLa];

  await prisma.department.upsert({
    where: { id: "00000000-0000-4000-8000-000000000010" },
    create: {
      id: "00000000-0000-4000-8000-000000000010",
      tenantId: tenant.id,
      siteId: siteNy.id,
      name: "Operations",
    },
    update: { name: "Operations" },
  });

  await prisma.department.upsert({
    where: { id: "00000000-0000-4000-8000-000000000011" },
    create: {
      id: "00000000-0000-4000-8000-000000000011",
      tenantId: tenant.id,
      siteId: siteChi.id,
      name: "Floor",
    },
    update: { name: "Floor" },
  });

  const adminTu = await upsertTenantUser(tenant.id, adminUser.id);
  const managerTus = await Promise.all(managerUsers.map((u) => upsertTenantUser(tenant.id, u.id)));
  const schedulerTus = await Promise.all(
    schedulerUsers.map((u) => upsertTenantUser(tenant.id, u.id)),
  );
  const employeeTus = await Promise.all(
    employeeUsers.map((u) => upsertTenantUser(tenant.id, u.id)),
  );
  const viewerTu = await upsertTenantUser(tenant.id, viewerUser.id);

  const allTenantUsers = [adminTu, ...managerTus, ...schedulerTus, ...employeeTus, viewerTu];

  for (const site of sites) {
    await upsertSiteMembership(adminTu.id, site.id, RoleKey.TENANT_ADMIN);
  }

  await upsertSiteMembership(managerTus[0].id, siteNy.id, RoleKey.MANAGER);
  await upsertSiteMembership(managerTus[0].id, siteChi.id, RoleKey.MANAGER);
  await upsertSiteMembership(managerTus[1].id, siteChi.id, RoleKey.MANAGER);
  await upsertSiteMembership(managerTus[1].id, siteLa.id, RoleKey.MANAGER);

  await upsertSiteMembership(schedulerTus[0].id, siteNy.id, RoleKey.SCHEDULER);
  await upsertSiteMembership(schedulerTus[0].id, siteLa.id, RoleKey.SCHEDULER);
  await upsertSiteMembership(schedulerTus[1].id, siteChi.id, RoleKey.SCHEDULER);
  await upsertSiteMembership(schedulerTus[1].id, siteLa.id, RoleKey.SCHEDULER);

  await Promise.all(
    employeeTus.flatMap((tu, i) => {
      const primary = sites[i % sites.length];
      const secondary = sites[(i + 1) % sites.length];
      const memberships = [upsertSiteMembership(tu.id, primary.id, RoleKey.EMPLOYEE)];
      if (i % 3 === 0) {
        memberships.push(upsertSiteMembership(tu.id, secondary.id, RoleKey.EMPLOYEE));
      }
      return memberships;
    }),
  );

  await upsertSiteMembership(viewerTu.id, siteNy.id, RoleKey.VIEWER);

  for (const tuRow of allTenantUsers) {
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

  const scheduleBase = new Date();
  scheduleBase.setUTCHours(0, 0, 0, 0);

  const shiftTemplates = buildShiftTemplates(options.useFaker);
  const shiftSpecs = shiftTemplates.map((template, shiftIndex) => ({
    ...template,
    siteId: siteByKey[template.siteKey].id,
    assigneeIndices: assigneeIndicesForShift(shiftIndex, employeeCount, slotsPerShift),
  }));

  const shifts = await Promise.all(
    shiftSpecs.map(async (spec) => {
      const { starts, ends } = shiftWindow(
        scheduleBase,
        spec.dayOffset,
        spec.startHour,
        spec.durationHours,
      );
      return prisma.shift.upsert({
        where: { id: spec.id },
        create: {
          id: spec.id,
          tenantId: tenant.id,
          siteId: spec.siteId,
          title: spec.title,
          startsAt: starts,
          endsAt: ends,
          status: spec.status,
          recurrenceRule: spec.recurrenceRule,
          recurrenceEnd: spec.recurrenceRule
            ? new Date(starts.getTime() + 90 * 24 * 60 * 60 * 1000)
            : undefined,
        },
        update: {
          title: spec.title,
          startsAt: starts,
          endsAt: ends,
          status: spec.status,
          siteId: spec.siteId,
        },
      });
    }),
  );

  const publishedShift = shifts[0];
  const swapTargetShift = shifts[1];

  const assignments: { shiftId: string; userId: string }[] = [];
  for (const spec of shiftSpecs) {
    for (const idx of spec.assigneeIndices) {
      assignments.push({
        shiftId: spec.id,
        userId: employeeUsers[idx].id,
      });
    }
  }

  await Promise.all(
    assignments.map(({ shiftId, userId }) =>
      prisma.shiftAssignment.upsert({
        where: { shiftId_userId: { shiftId, userId } },
        create: { tenantId: tenant.id, shiftId, userId },
        update: {},
      }),
    ),
  );

  const assignEmployee0 = await prisma.shiftAssignment.findFirst({
    where: { shiftId: publishedShift.id, userId: employeeUsers[0].id },
  });
  const swapTargetUser = employeeUsers[Math.min(1, employeeCount - 1)];
  const assignEmployee1Target = await prisma.shiftAssignment.upsert({
    where: {
      shiftId_userId: { shiftId: swapTargetShift.id, userId: swapTargetUser.id },
    },
    create: {
      tenantId: tenant.id,
      shiftId: swapTargetShift.id,
      userId: swapTargetUser.id,
    },
    update: {},
  });

  if (assignEmployee0) {
    const existingSwap = await prisma.shiftSwap.findFirst({
      where: { tenantId: tenant.id, requesterAssignmentId: assignEmployee0.id },
    });
    if (!existingSwap) {
      await prisma.shiftSwap.create({
        data: {
          tenantId: tenant.id,
          status: SwapStatus.REQUESTED,
          requesterAssignmentId: assignEmployee0.id,
          targetAssignmentId: assignEmployee1Target.id,
          fromShiftId: publishedShift.id,
          toShiftId: swapTargetShift.id,
          message: "Demo swap request",
        },
      });
    }
  }

  const sampleEmployeeTu = employeeTus[0];
  await prisma.availabilityRule.deleteMany({ where: { tenantUserId: sampleEmployeeTu.id } });
  await prisma.availabilityRule.createMany({
    data: [
      { tenantUserId: sampleEmployeeTu.id, dayOfWeek: 1, startMinute: 9 * 60, endMinute: 17 * 60 },
      { tenantUserId: sampleEmployeeTu.id, dayOfWeek: 3, startMinute: 9 * 60, endMinute: 17 * 60 },
    ],
  });

  const ptoStart = new Date();
  ptoStart.setUTCMonth(ptoStart.getUTCMonth() + 2, 1);
  const ptoEnd = new Date(ptoStart);
  ptoEnd.setUTCDate(ptoEnd.getUTCDate() + 4);

  const existingPto = await prisma.ptoRequest.findFirst({
    where: { tenantUserId: sampleEmployeeTu.id, reason: "Demo PTO" },
  });
  if (!existingPto) {
    await prisma.ptoRequest.create({
      data: {
        tenantId: tenant.id,
        tenantUserId: sampleEmployeeTu.id,
        startsOn: ptoStart,
        endsOn: ptoEnd,
        reason: "Demo PTO",
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorUserId: adminUser.id,
      action: "seed.completed",
      entityType: "system",
      metadata: {
        version: 3,
        users: allTenantUsers.length,
        sites: sites.length,
        employeeCount,
        useFaker: options.useFaker,
      },
    },
  });

  return { tenant, adminUser, employeeUsers, sites: sites.length, employeeCount };
}

async function seedMinimalTenants() {
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
}

async function main() {
  const options = parseSeedArgs();

  console.info("Seeding StaffStack demo data…", {
    clear: options.clear,
    useFaker: options.useFaker,
    employeeCount: options.employeeCount,
  });

  if (options.clear) {
    console.info("Clearing existing data…");
    await clearSeedData(prisma);
  }

  const acme = await seedAcmeTenant(options);
  await seedMinimalTenants();

  console.info("Done. Demo password for all demo users:", DEMO_PASSWORD);
  console.info(
    `Acme (${acme.tenant.slug}): 1 admin, 2 managers, 2 schedulers, ${acme.employeeCount} employees, 1 viewer across ${acme.sites} sites`,
  );
  console.info("Employee logins: employee01@acme.demo … employeeNN@acme.demo");
  console.info("Tenants: acme, medstaff, neon-cyber — sign in at /login");
  console.info("Flags: --clear  --use-faker  --count <n>  (npm run db:seed -- --help)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
