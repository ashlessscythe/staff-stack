import { prisma } from "@/lib/db";
import { sendEmail, sendSms } from "@/server/services/notify";

import { formatShiftStartsAt, renderReminderBody } from "./render";

const BATCH = 100;

export async function processDueReminders(now = new Date()) {
  const stale = new Date(now.getTime() - 15 * 60 * 1000);
  await prisma.reminderScheduled.updateMany({
    where: { status: "processing", updatedAt: { lt: stale } },
    data: { status: "pending" },
  });

  const rows = await prisma.reminderScheduled.findMany({
    where: { status: "pending", sendAt: { lte: now } },
    orderBy: { sendAt: "asc" },
    take: BATCH,
    include: {
      template: true,
      shift: { include: { site: true } },
      user: true,
    },
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of rows) {
    const claimed = await prisma.reminderScheduled.updateMany({
      where: { id: row.id, status: "pending" },
      data: { status: "processing" },
    });
    if (claimed.count === 0) {
      skipped += 1;
      continue;
    }

    const tenantUser = await prisma.tenantUser.findUnique({
      where: { tenantId_userId: { tenantId: row.tenantId, userId: row.userId } },
    });
    const prefs = tenantUser
      ? await prisma.notificationPreference.findUnique({
          where: { tenantUserId: tenantUser.id },
        })
      : null;

    const timeZone = row.shift.site.timezone;
    const startsAtLabel = formatShiftStartsAt(row.shift.startsAt, timeZone);
    const bodyText = renderReminderBody(row.template.body, {
      shiftTitle: row.shift.title,
      startsAt: startsAtLabel,
    });

    const emailEnabled = prefs?.emailEnabled ?? true;
    const smsEnabled = prefs?.smsEnabled ?? false;

    try {
      if (row.template.channel === "email") {
        if (!emailEnabled) {
          await prisma.reminderScheduled.update({
            where: { id: row.id },
            data: { status: "failed", lastError: "email_disabled_by_user" },
          });
          failed += 1;
          continue;
        }
        const result = await sendEmail({
          to: row.user.email,
          subject: `Shift reminder: ${row.shift.title}`,
          html: `<div style="font-family:system-ui,sans-serif">${bodyText}</div>`,
        });
        if ("skipped" in result && result.skipped) {
          await prisma.reminderScheduled.update({
            where: { id: row.id },
            data: { status: "failed", lastError: "email_provider_unavailable" },
          });
          failed += 1;
        } else {
          await prisma.reminderScheduled.update({
            where: { id: row.id },
            data: { status: "sent", lastError: null },
          });
          sent += 1;
        }
        continue;
      }

      if (row.template.channel === "sms") {
        if (!smsEnabled) {
          await prisma.reminderScheduled.update({
            where: { id: row.id },
            data: { status: "failed", lastError: "sms_disabled_by_user" },
          });
          failed += 1;
          continue;
        }
        const to = prefs?.phoneE164?.trim();
        if (!to) {
          await prisma.reminderScheduled.update({
            where: { id: row.id },
            data: { status: "failed", lastError: "sms_missing_phoneE164" },
          });
          failed += 1;
          continue;
        }
        const result = await sendSms({ to, body: bodyText });
        if ("skipped" in result && result.skipped) {
          await prisma.reminderScheduled.update({
            where: { id: row.id },
            data: { status: "failed", lastError: "sms_provider_unavailable" },
          });
          failed += 1;
        } else {
          await prisma.reminderScheduled.update({
            where: { id: row.id },
            data: { status: "sent", lastError: null },
          });
          sent += 1;
        }
        continue;
      }

      await prisma.reminderScheduled.update({
        where: { id: row.id },
        data: { status: "failed", lastError: `unknown_channel:${row.template.channel}` },
      });
      failed += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.reminderScheduled.update({
        where: { id: row.id },
        data: { status: "failed", lastError: message.slice(0, 4000) },
      });
      failed += 1;
    }
  }

  return { examined: rows.length, sent, failed, skipped };
}
