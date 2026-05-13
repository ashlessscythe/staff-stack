import type { RoleKey } from "@prisma/client";

import { sendEmail } from "@/server/services/notify";

import {
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
