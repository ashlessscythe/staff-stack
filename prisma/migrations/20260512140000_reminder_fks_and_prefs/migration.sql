-- Optional SMS destination when smsEnabled is true
ALTER TABLE "NotificationPreference" ADD COLUMN "phoneE164" TEXT;

-- Stable upserts for built-in default templates per tenant
CREATE UNIQUE INDEX "ReminderTemplate_tenantId_name_key" ON "ReminderTemplate"("tenantId", "name");

ALTER TABLE "ReminderScheduled"
ADD CONSTRAINT "ReminderScheduled_shiftId_fkey"
FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReminderScheduled"
ADD CONSTRAINT "ReminderScheduled_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
