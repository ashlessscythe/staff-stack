import { PrismaClient, RoleKey, ShiftStatus, SwapStatus } from "@prisma/client";
import { faker } from "@faker-js/faker";
import * as argon2 from "argon2";
import { fromZonedTime } from "date-fns-tz";

import { evaluateScheduleConstraints } from "../src/lib/scheduling-constraints";
import { schedulingSettingsFromTenant } from "../src/lib/scheduling-settings";
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

const SITE_TIMEZONES: Record<keyof typeof SITE_IDS, string> = {
  nyc: "America/New_York",
  chi: "America/Chicago",
  la: "America/Los_Angeles",
};

function shiftWindowInSite(
  base: Date,
  dayOffset: number,
  startHourLocal: number,
  durationHours: number,
  timeZone: string,
) {
  const day = addDays(base, dayOffset);
  const y = day.getUTCFullYear();
  const m = String(day.getUTCMonth() + 1).padStart(2, "0");
  const d = String(day.getUTCDate()).padStart(2, "0");
  const h = (n: number) => String(n).padStart(2, "0");
  const startLocal = `${y}-${m}-${d}T${h(startHourLocal)}:00:00`;
  const endLocal = `${y}-${m}-${d}T${h(startHourLocal + durationHours)}:00:00`;
  return {
    starts: fromZonedTime(startLocal, timeZone),
    ends: fromZonedTime(endLocal, timeZone),
  };
}

function seedCanAssign(
  shift: { startsAt: Date; endsAt: Date; siteTimezone: string },
  ctx: EmployeeConstraintCtx,
  settings: ReturnType<typeof schedulingSettingsFromTenant>,
): boolean {
  const violations = evaluateScheduleConstraints({
    shiftStartsAt: shift.startsAt,
    shiftEndsAt: shift.endsAt,
    siteTimezone: shift.siteTimezone,
    rules: ctx.rules,
    exceptions: ctx.exceptions,
    ptoRequests: ctx.ptoRequests,
    settings,
  });
  return !violations.some((v) => v.severity === "error");
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
  startHourLocal: number;
  durationHours: number;
  status: ShiftStatus;
  recurrenceRule?: string;
};

type EmployeeConstraintCtx = {
  rules: { dayOfWeek: number; startMinute: number; endMinute: number }[];
  exceptions: { date: Date; available: boolean }[];
  ptoRequests: {
    startsOn: Date;
    endsOn: Date;
    status: "REQUESTED" | "APPROVED" | "DENIED" | "CANCELLED";
  }[];
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
      startHourLocal: 10,
      durationHours: 8,
      status: ShiftStatus.PUBLISHED,
      recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
    },
    {
      id: "00000000-0000-4000-8000-0000000000a2",
      siteKey: "nyc",
      title: shiftTitle(useFaker, titles[1]),
      dayOffset: 2,
      startHourLocal: 10,
      durationHours: 8,
      status: ShiftStatus.PUBLISHED,
    },
    {
      id: "00000000-0000-4000-8000-0000000000a3",
      siteKey: "chi",
      title: shiftTitle(useFaker, titles[2]),
      dayOffset: 1,
      startHourLocal: 10,
      durationHours: 8,
      status: ShiftStatus.PUBLISHED,
    },
    {
      id: "00000000-0000-4000-8000-0000000000a4",
      siteKey: "chi",
      title: shiftTitle(useFaker, titles[3]),
      dayOffset: 3,
      startHourLocal: 12,
      durationHours: 6,
      status: ShiftStatus.PUBLISHED,
    },
    {
      id: "00000000-0000-4000-8000-0000000000a5",
      siteKey: "la",
      title: shiftTitle(useFaker, titles[4]),
      dayOffset: 2,
      startHourLocal: 11,
      durationHours: 8,
      status: ShiftStatus.PUBLISHED,
    },
    {
      id: "00000000-0000-4000-8000-0000000000a6",
      siteKey: "nyc",
      title: shiftTitle(useFaker, titles[5]),
      dayOffset: 4,
      startHourLocal: 10,
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
      const tz = SITE_TIMEZONES[spec.siteKey];
      const { starts, ends } = shiftWindowInSite(
        scheduleBase,
        spec.dayOffset,
        spec.startHourLocal,
        spec.durationHours,
        tz,
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

  const schedulingSettings = schedulingSettingsFromTenant(tenant.settings);

  await prisma.availabilityRule.deleteMany({
    where: { tenantUserId: { in: employeeTus.map((tu) => tu.id) } },
  });
  for (const tu of employeeTus) {
    await prisma.availabilityRule.createMany({
      data: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        tenantUserId: tu.id,
        dayOfWeek,
        startMinute: 6 * 60,
        endMinute: 22 * 60,
      })),
    });
  }

  const sampleEmployeeTu = employeeTus[0];
  await prisma.availabilityRule.deleteMany({ where: { tenantUserId: sampleEmployeeTu.id } });
  await prisma.availabilityRule.createMany({
    data: [
      { tenantUserId: sampleEmployeeTu.id, dayOfWeek: 1, startMinute: 9 * 60, endMinute: 17 * 60 },
      { tenantUserId: sampleEmployeeTu.id, dayOfWeek: 2, startMinute: 9 * 60, endMinute: 17 * 60 },
      { tenantUserId: sampleEmployeeTu.id, dayOfWeek: 3, startMinute: 9 * 60, endMinute: 17 * 60 },
      { tenantUserId: sampleEmployeeTu.id, dayOfWeek: 4, startMinute: 9 * 60, endMinute: 17 * 60 },
      { tenantUserId: sampleEmployeeTu.id, dayOfWeek: 5, startMinute: 9 * 60, endMinute: 17 * 60 },
    ],
  });

  const ptoEmployeeTu = employeeTus[Math.min(1, employeeCount - 1)];
  const ptoStart = addDays(scheduleBase, 14);
  const ptoEnd = addDays(scheduleBase, 18);
  await prisma.ptoRequest.deleteMany({
    where: { tenantUserId: ptoEmployeeTu.id, reason: "Demo PTO" },
  });
  await prisma.ptoRequest.create({
    data: {
      tenantId: tenant.id,
      tenantUserId: ptoEmployeeTu.id,
      startsOn: ptoStart,
      endsOn: ptoEnd,
      status: "APPROVED",
      reason: "Demo PTO",
    },
  });

  const exceptionTu = employeeTus[Math.min(2, employeeCount - 1)];
  const exceptionDate = addDays(scheduleBase, 3);
  exceptionDate.setUTCHours(0, 0, 0, 0);
  await prisma.availabilityException.deleteMany({
    where: { tenantUserId: exceptionTu.id, date: exceptionDate },
  });
  await prisma.availabilityException.create({
    data: {
      tenantUserId: exceptionTu.id,
      date: exceptionDate,
      available: false,
      note: "Demo day off",
    },
  });

  const constraintCtxByTu = new Map<string, EmployeeConstraintCtx>();
  for (const tu of employeeTus) {
    const [rules, exceptions, ptoRequests] = await Promise.all([
      prisma.availabilityRule.findMany({ where: { tenantUserId: tu.id } }),
      prisma.availabilityException.findMany({ where: { tenantUserId: tu.id } }),
      prisma.ptoRequest.findMany({
        where: { tenantUserId: tu.id, status: { in: ["REQUESTED", "APPROVED"] } },
      }),
    ]);
    constraintCtxByTu.set(tu.id, {
      rules,
      exceptions,
      ptoRequests: ptoRequests.map((p) => ({
        startsOn: p.startsOn,
        endsOn: p.endsOn,
        status: p.status,
      })),
    });
  }

  const shiftById = new Map(shifts.map((s) => [s.id, s]));
  const specById = new Map(shiftSpecs.map((s) => [s.id, s]));

  for (const spec of shiftSpecs) {
    const shift = shiftById.get(spec.id)!;
    const tz = SITE_TIMEZONES[spec.siteKey];
    const shiftPayload = {
      startsAt: shift.startsAt,
      endsAt: shift.endsAt,
      siteTimezone: tz,
    };
    for (const idx of spec.assigneeIndices) {
      const tu = employeeTus[idx];
      const ctx = constraintCtxByTu.get(tu.id)!;
      if (!seedCanAssign(shiftPayload, ctx, schedulingSettings)) {
        console.warn(
          `Seed skip assign: employee${idx + 1} blocked on shift ${spec.title} (${spec.id})`,
        );
        continue;
      }
      await prisma.shiftAssignment.upsert({
        where: { shiftId_userId: { shiftId: spec.id, userId: employeeUsers[idx].id } },
        create: { tenantId: tenant.id, shiftId: spec.id, userId: employeeUsers[idx].id },
        update: {},
      });
    }
  }

  const publishedShift = shifts[0];
  const swapTargetShift = shifts[1];

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

  const swapTargetSpec = specById.get(swapTargetShift.id)!;
  const publishedSpec = specById.get(publishedShift.id)!;
  const reqCtx = constraintCtxByTu.get(employeeTus[0].id)!;
  const tgtCtx = constraintCtxByTu.get(employeeTus[Math.min(1, employeeCount - 1)].id)!;
  if (
    !seedCanAssign(
      {
        startsAt: swapTargetShift.startsAt,
        endsAt: swapTargetShift.endsAt,
        siteTimezone: SITE_TIMEZONES[swapTargetSpec.siteKey],
      },
      reqCtx,
      schedulingSettings,
    ) ||
    !seedCanAssign(
      {
        startsAt: publishedShift.startsAt,
        endsAt: publishedShift.endsAt,
        siteTimezone: SITE_TIMEZONES[publishedSpec.siteKey],
      },
      tgtCtx,
      schedulingSettings,
    )
  ) {
    console.warn("Seed: demo swap legs failed constraint check");
  }

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorUserId: adminUser.id,
      action: "seed.completed",
      entityType: "system",
      metadata: {
        version: 4,
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
