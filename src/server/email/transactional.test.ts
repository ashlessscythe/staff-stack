import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/server/services/notify", () => ({
  sendEmail: mocks.sendEmail,
}));

import {
  sendAvailabilityUpdateRequestEmail,
  sendPasswordResetEmail,
  sendRegistrationPendingEmail,
  sendWorkspaceAccessApprovedEmail,
} from "./transactional";

describe("transactional emails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendEmail.mockResolvedValue({ ok: true });
  });

  it("sendPasswordResetEmail forwards reset link in html", async () => {
    await sendPasswordResetEmail({
      to: "a@b.com",
      resetUrl: "https://app.example/reset-password?token=abc",
    });
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "a@b.com",
        subject: "Reset your StaffStack password",
        html: expect.stringContaining("https://app.example/reset-password?token=abc"),
      }),
    );
    expect(mocks.sendEmail.mock.calls[0][0].html).toContain("Reset your password");
  });

  it("sendAvailabilityUpdateRequestEmail uses tenant in subject", async () => {
    await sendAvailabilityUpdateRequestEmail({
      to: "e@acme.demo",
      tenantName: "Acme Corp",
      tenantSlug: "acme",
      reasonCode: "OUTSIDE_RULE",
    });
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "e@acme.demo",
        subject: expect.stringContaining("Acme Corp"),
      }),
    );
  });

  it("sendRegistrationPendingEmail includes recipient email in body", async () => {
    await sendRegistrationPendingEmail({ to: "new@user.com", name: "Pat" });
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "new@user.com",
        subject: "Welcome to StaffStack — workspace pending",
        html: expect.stringContaining("new@user.com"),
      }),
    );
    expect(mocks.sendEmail.mock.calls[0][0].html).toContain("Pat");
  });

  it("sendWorkspaceAccessApprovedEmail includes tenant and role", async () => {
    await sendWorkspaceAccessApprovedEmail({
      to: "member@org.com",
      recipientName: "Sam",
      tenantName: "Acme Corp",
      tenantSlug: "acme",
      role: "MANAGER",
    });
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "member@org.com",
        subject: "You are in: Acme Corp",
        html: expect.stringMatching(/Acme Corp/),
      }),
    );
    const html = mocks.sendEmail.mock.calls[0][0].html as string;
    expect(html).toContain("Manager");
    expect(html).toContain("/t/acme/dashboard");
  });
});
