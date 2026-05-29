import type { PrismaClient } from "@prisma/client";

/** Remove all rows so a seed run starts from an empty database. */
export async function clearSeedData(prisma: PrismaClient): Promise<void> {
  await prisma.shiftSwap.deleteMany();
  await prisma.checkInToken.deleteMany();
  await prisma.shiftAssignment.deleteMany();
  await prisma.reminderScheduled.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.shiftTemplate.deleteMany();
  await prisma.availabilityRule.deleteMany();
  await prisma.availabilityException.deleteMany();
  await prisma.ptoRequest.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.siteMembership.deleteMany();
  await prisma.tenantUser.deleteMany();
  await prisma.department.deleteMany();
  await prisma.site.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.fileObject.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.reminderTemplate.deleteMany();
  await prisma.processedStripeEvent.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.stripeCustomer.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();
}
