import { prisma } from "@/lib/db";

export const DEFAULT_EMAIL_TEMPLATE_NAME = "__staffstack_default_shift_email_v1__";
export const DEFAULT_SMS_TEMPLATE_NAME = "__staffstack_default_shift_sms_v1__";

const defaultEmailBody = `Reminder: <strong>{{shiftTitle}}</strong> starts at {{startsAt}}.`;

const defaultSmsBody = `Reminder: {{shiftTitle}} at {{startsAt}}`;

export async function ensureReminderTemplatesForTenant(tenantId: string) {
  const existing = await prisma.reminderTemplate.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
  });
  if (existing.length > 0) return existing;

  await prisma.reminderTemplate.upsert({
    where: { tenantId_name: { tenantId, name: DEFAULT_EMAIL_TEMPLATE_NAME } },
    create: {
      tenantId,
      name: DEFAULT_EMAIL_TEMPLATE_NAME,
      channel: "email",
      offsetMinutes: -60,
      body: defaultEmailBody,
    },
    update: {},
  });
  await prisma.reminderTemplate.upsert({
    where: { tenantId_name: { tenantId, name: DEFAULT_SMS_TEMPLATE_NAME } },
    create: {
      tenantId,
      name: DEFAULT_SMS_TEMPLATE_NAME,
      channel: "sms",
      offsetMinutes: -60,
      body: defaultSmsBody,
    },
    update: {},
  });

  return prisma.reminderTemplate.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
  });
}
