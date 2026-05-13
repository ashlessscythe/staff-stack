import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn().mockResolvedValue({ data: { id: "msg" }, error: null }));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

describe("sendEmail", () => {
  beforeEach(() => {
    vi.resetModules();
    sendMock.mockClear();
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;
  });

  it("returns skipped and does not call Resend when API key is missing", async () => {
    const { sendEmail } = await import("./notify");
    const r = await sendEmail({ to: "x@y.com", subject: "Hi", html: "<p>a</p>" });
    expect(r).toEqual({ skipped: true });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("sends via Resend when API key is set", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    process.env.RESEND_FROM = "StaffStack <mail@example.com>";
    const { sendEmail } = await import("./notify");
    const r = await sendEmail({ to: "x@y.com", subject: "Hello", html: "<p>body</p>" });
    expect(r).toEqual({ ok: true });
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "StaffStack <mail@example.com>",
        to: "x@y.com",
        subject: "Hello",
        html: "<p>body</p>",
      }),
    );
  });

  it("uses default from when RESEND_FROM is unset", async () => {
    process.env.RESEND_API_KEY = "re_test_456";
    const { sendEmail } = await import("./notify");
    await sendEmail({ to: "a@b.co", subject: "S", html: "h" });
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "StaffStack <onboarding@resend.dev>",
      }),
    );
  });
});
