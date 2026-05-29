import type { RoleKey } from "@prisma/client";

import { absoluteUrl } from "@/lib/app-origin";
import { roleKeyLabel } from "@/lib/role-labels";

import { escapeHtml } from "./escape-html";
import {
  emailMutedParagraph,
  emailParagraph,
  emailPrimaryCta,
  transactionalEmailShell,
} from "./html-shell";

export function renderPasswordResetEmailHtml(opts: { resetUrl: string }): string {
  const body = [
    emailParagraph(
      "We received a request to reset the password for your StaffStack account. Use the button below to choose a new password.",
    ),
    emailPrimaryCta({ href: opts.resetUrl, label: "Reset password" }),
    emailMutedParagraph(
      "This link expires in one hour. If you did not ask for a reset, you can ignore this email — your password will stay the same.",
    ),
    emailMutedParagraph("If the button does not work, copy and paste this URL into your browser:"),
    `<p style="margin:8px 0 0 0;font-size:12px;word-break:break-all;color:#64748b;">${escapeHtml(opts.resetUrl)}</p>`,
  ].join("");
  return transactionalEmailShell({
    preheader: "Reset your StaffStack password in one click.",
    headline: "Reset your password",
    bodyHtml: body,
  });
}

export function renderRegistrationPendingEmailHtml(opts: {
  email: string;
  name?: string | null;
}): string {
  const greet = opts.name?.trim()
    ? `Hi <strong style="color:#e2e8f0;">${escapeHtml(opts.name.trim())}</strong>,`
    : "Hi there,";
  const body = [
    emailParagraph(`${greet} thanks for creating your StaffStack account.`),
    emailParagraph(
      `Your sign-in email is <strong style="color:#e2e8f0;">${escapeHtml(opts.email)}</strong>. You can sign in anytime, while we finish wiring things up on our side.`,
    ),
    emailParagraph(
      "Workspaces are invite-only. When an administrator adds you to a team, your dashboard will unlock automatically — we will not leave you hanging.",
    ),
    emailPrimaryCta({ href: absoluteUrl("/login"), label: "Sign in to StaffStack" }),
    emailMutedParagraph(
      "You will land on a short “waiting for workspace” screen until your first invite arrives. Questions? Reply to this email if your inbox allows it, or contact your organization admin.",
    ),
  ].join("");
  return transactionalEmailShell({
    preheader: "Your StaffStack account is ready — workspace access is pending.",
    headline: "Thanks for registering",
    bodyHtml: body,
  });
}

export type AvailabilityNotifyReason = "NO_RULES" | "OUTSIDE_RULE";

export function renderAvailabilityUpdateRequestEmailHtml(opts: {
  tenantName: string;
  tenantSlug: string;
  recipientName?: string | null;
  reasonCode: AvailabilityNotifyReason;
  managerNote?: string | null;
  shiftTitle?: string | null;
  siteName?: string | null;
  shiftStartsAtLabel?: string | null;
}): string {
  const greet = opts.recipientName?.trim()
    ? `Hi <strong style="color:#e2e8f0;">${escapeHtml(opts.recipientName.trim())}</strong>,`
    : "Hi there,";
  const reasonParagraph =
    opts.reasonCode === "NO_RULES"
      ? "Your scheduler noted that you have not added weekly availability rules in StaffStack yet. Keeping your availability up to date helps them build schedules that work for you."
      : "Your scheduler noted that an upcoming shift falls outside the weekly availability windows you have on file. Please review and update your availability if needed.";
  const shiftBlock =
    opts.shiftTitle && opts.shiftStartsAtLabel
      ? emailParagraph(
          `Shift in question: <strong style="color:#e2e8f0;">${escapeHtml(opts.shiftTitle)}</strong>${opts.siteName ? ` at ${escapeHtml(opts.siteName)}` : ""} · ${escapeHtml(opts.shiftStartsAtLabel)}.`,
        )
      : "";
  const noteBlock = opts.managerNote?.trim()
    ? emailParagraph(
        `Message from your scheduler: &ldquo;${escapeHtml(opts.managerNote.trim())}&rdquo;`,
      )
    : "";
  const availabilityUrl = absoluteUrl(`/t/${opts.tenantSlug}/availability`);
  const body = [
    emailParagraph(
      `${greet} your team at <strong style="color:#e2e8f0;">${escapeHtml(opts.tenantName)}</strong> asked you to update your availability.`,
    ),
    emailParagraph(reasonParagraph),
    shiftBlock,
    noteBlock,
    emailPrimaryCta({ href: availabilityUrl, label: "Update my availability" }),
    emailMutedParagraph(
      "If you have already updated your availability, you can ignore this email. Questions? Reply to your scheduler or manager.",
    ),
    emailMutedParagraph("If the button does not work, copy and paste this URL into your browser:"),
    `<p style="margin:8px 0 0 0;font-size:12px;word-break:break-all;color:#64748b;">${escapeHtml(availabilityUrl)}</p>`,
  ]
    .filter(Boolean)
    .join("");
  return transactionalEmailShell({
    preheader: `Please update your availability for ${opts.tenantName}`,
    headline: "Update your availability",
    bodyHtml: body,
  });
}

export function renderWorkspaceAccessApprovedEmailHtml(opts: {
  tenantName: string;
  tenantSlug: string;
  role: RoleKey;
  recipientName?: string | null;
}): string {
  const roleLabel = roleKeyLabel(opts.role);
  const dashboardUrl = absoluteUrl(`/t/${opts.tenantSlug}/dashboard`);
  const greet = opts.recipientName?.trim()
    ? `Hi <strong style="color:#e2e8f0;">${escapeHtml(opts.recipientName.trim())}</strong>,`
    : "Hi there,";
  const body = [
    emailParagraph(`${greet} great news — you have been approved for a workspace on StaffStack.`),
    emailParagraph(
      `You are now a <strong style="color:#e2e8f0;">${escapeHtml(roleLabel)}</strong> for <strong style="color:#e2e8f0;">${escapeHtml(opts.tenantName)}</strong>.`,
    ),
    emailParagraph("Jump into your dashboard whenever you are ready:"),
    emailPrimaryCta({ href: dashboardUrl, label: `Open ${opts.tenantName}` }),
    emailMutedParagraph(
      "If you are new to StaffStack, your schedule, swaps, and team tools live behind that link. Bookmark it for quick access.",
    ),
  ].join("");
  return transactionalEmailShell({
    preheader: `You are in — ${opts.tenantName} on StaffStack.`,
    headline: "Your workspace is ready",
    bodyHtml: body,
  });
}
