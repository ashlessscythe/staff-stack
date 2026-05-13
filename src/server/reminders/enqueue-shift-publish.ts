import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

import { ensureReminderTemplatesForTenant } from "./default-templates";
import { shiftReminderIdempotencyKey } from "./idempotency";

type ShiftForReminders = Prisma.ShiftGetPayload<{
  include: { assignments: true; site: true };
}>;

export async function enqueueRemindersForPublishedShift(shift: ShiftForReminders) {
  if (shift.assignments.length === 0) return { enqueued: 0 };

  const templates = await ensureReminderTemplatesForTenant(shift.tenantId);
  const now = Date.now();
  const rows: Prisma.ReminderScheduledCreateManyInput[] = [];

  for (const assignment of shift.assignments) {
    for (const template of templates) {
      const sendAt = new Date(shift.startsAt.getTime() + template.offsetMinutes * 60 * 1000);
      if (sendAt.getTime() < now) continue;

      rows.push({
        tenantId: shift.tenantId,
        templateId: template.id,
        shiftId: shift.id,
        userId: assignment.userId,
        sendAt,
        idempotencyKey: shiftReminderIdempotencyKey(shift.id, assignment.userId, template.id),
        status: "pending",
      });
    }
  }

  if (rows.length === 0) return { enqueued: 0 };

  const result = await prisma.reminderScheduled.createMany({
    data: rows,
    skipDuplicates: true,
  });

  return { enqueued: result.count };
}
