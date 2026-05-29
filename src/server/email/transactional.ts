import type { RoleKey } from "@prisma/client";

import { sendEmail } from "@/server/services/notify";

import {
  renderAvailabilityUpdateRequestEmailHtml,
  type AvailabilityNotifyReason,
  renderPasswordResetEmailHtml,
  renderRegistrationPendingEmailHtml,
  renderWorkspaceAccessApprovedEmailHtml,
} from "./templates";

export async function sendRegistrationPendingEmail(opts: {
  to: string;
  name?: string | null;
}): Promise<{ skipped?: true } | { ok: true }> {
  const html = renderRegistrationPendingEmailHtml({ email: opts.to, name: opts.name });
  return sendEmail({
    to: opts.to,
    subject: "Welcome to StaffStack — workspace pending",
    html,
  });
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  resetUrl: string;
}): Promise<{ skipped?: true } | { ok: true }> {
  const html = renderPasswordResetEmailHtml({ resetUrl: opts.resetUrl });
  return sendEmail({
    to: opts.to,
    subject: "Reset your StaffStack password",
    html,
  });
}

export async function sendAvailabilityUpdateRequestEmail(opts: {
  to: string;
  recipientName?: string | null;
  tenantName: string;
  tenantSlug: string;
  reasonCode: AvailabilityNotifyReason;
  managerNote?: string | null;
  shiftTitle?: string | null;
  siteName?: string | null;
  shiftStartsAtLabel?: string | null;
}): Promise<{ skipped?: true } | { ok: true }> {
  const html = renderAvailabilityUpdateRequestEmailHtml({
    tenantName: opts.tenantName,
    tenantSlug: opts.tenantSlug,
    recipientName: opts.recipientName,
    reasonCode: opts.reasonCode,
    managerNote: opts.managerNote,
    shiftTitle: opts.shiftTitle,
    siteName: opts.siteName,
    shiftStartsAtLabel: opts.shiftStartsAtLabel,
  });
  const subject =
    opts.reasonCode === "NO_RULES"
      ? `Action needed: add your availability for ${opts.tenantName}`
      : `Action needed: review your availability for ${opts.tenantName}`;
  return sendEmail({ to: opts.to, subject, html });
}

export async function sendWorkspaceAccessApprovedEmail(opts: {
  to: string;
  recipientName?: string | null;
  tenantName: string;
  tenantSlug: string;
  role: RoleKey;
}): Promise<{ skipped?: true } | { ok: true }> {
  const html = renderWorkspaceAccessApprovedEmailHtml({
    tenantName: opts.tenantName,
    tenantSlug: opts.tenantSlug,
    role: opts.role,
    recipientName: opts.recipientName,
  });
  return sendEmail({
    to: opts.to,
    subject: `You are in: ${opts.tenantName}`,
    html,
  });
}
