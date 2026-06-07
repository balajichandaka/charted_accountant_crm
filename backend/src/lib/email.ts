import nodemailer, { type Transporter } from "nodemailer";

let cached: Transporter | null = null;

function getTransport(): Transporter | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  if (cached) return cached;

  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  cached = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  });
  return cached;
}

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/** Send an email. Returns true if sent, false if no transport configured. Throws on send failure. */
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  const transport = getTransport();
  if (!transport) {
    console.warn("[email] SMTP not configured; skipping send to", msg.to);
    return false;
  }
  await transport.sendMail({
    from: process.env.EMAIL_FROM ?? "CA Practice <no-reply@ca-practice.local>",
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text ?? msg.html.replace(/<[^>]+>/g, ""),
  });
  return true;
}
