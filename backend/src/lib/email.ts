import nodemailer, { type Transporter } from "nodemailer";

/** Per-firm SMTP settings, resolved at send time. */
export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  /** Full From header, e.g. `"Acme & Co" <alerts@acme.in>`. */
  from: string;
};

// Transports are reused across sends. The env transport is cached under a fixed
// key; each firm's transport is cached under a fingerprint of its config so a
// credential change produces a fresh transport.
const transports = new Map<string, Transporter>();

function fingerprint(c: SmtpConfig): string {
  return `${c.host}|${c.port}|${c.secure}|${c.user ?? ""}`;
}

/** The platform-wide fallback transport from SMTP_* env vars, or null if unset. */
function envTransport(): { transport: Transporter; from: string } | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  const key = "__env__";
  let transport = transports.get(key);
  if (!transport) {
    const user = process.env.SMTP_USER;
    transport = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: user ? { user, pass: process.env.SMTP_PASS } : undefined,
    });
    transports.set(key, transport);
  }
  return {
    transport,
    from: process.env.EMAIL_FROM ?? "CA Practice <no-reply@ca-practice.local>",
  };
}

/** Build (or reuse) a transport for an explicit per-firm config. */
function firmTransport(config: SmtpConfig): { transport: Transporter; from: string } {
  const key = fingerprint(config);
  let transport = transports.get(key);
  if (!transport) {
    transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      // On non-implicit-TLS ports (587/25), require a STARTTLS upgrade so the
      // app-password is never sent over a plaintext connection.
      requireTLS: !config.secure,
      auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    });
    transports.set(key, transport);
  }
  return { transport, from: config.from };
}

function resolve(config?: SmtpConfig): { transport: Transporter; from: string } | null {
  return config ? firmTransport(config) : envTransport();
}

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/**
 * Send an email using the firm's SMTP config when provided, otherwise the
 * platform-wide env transport. Returns true if sent, false if no transport is
 * configured at all. Throws on send failure.
 */
export async function sendEmail(msg: EmailMessage, config?: SmtpConfig): Promise<boolean> {
  const resolved = resolve(config);
  if (!resolved) {
    console.warn("[email] No SMTP configured (firm or env); skipping send to", msg.to);
    return false;
  }
  await resolved.transport.sendMail({
    from: resolved.from,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text ?? msg.html.replace(/<[^>]+>/g, ""),
  });
  return true;
}
