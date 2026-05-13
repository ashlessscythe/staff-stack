import { Resend } from "resend";
import Twilio from "twilio";

export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[notify] RESEND_API_KEY missing; skip email");
    return { skipped: true as const };
  }
  const resend = new Resend(key);
  const from = process.env.RESEND_FROM ?? "StaffStack <onboarding@resend.dev>";
  await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  return { ok: true as const };
}

export async function sendSms(opts: { to: string; body: string }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) {
    console.warn("[notify] Twilio env missing; skip SMS");
    return { skipped: true as const };
  }
  const client = Twilio(sid, token);
  await client.messages.create({
    from,
    to: opts.to,
    body: opts.body,
  });
  return { ok: true as const };
}
