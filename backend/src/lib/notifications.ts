import { sendEmail, type SmtpConfig } from "./email";
import { decryptSecret } from "./crypto";
import { logger } from "./logger";
import { prisma } from "./prisma";
import { requireFirmId } from "./tenant-context";
import type { Ticket, User } from "@prisma/client";

export type TicketEvent = "ASSIGNED" | "CREATED" | "COMPLETED";

type Recipient = {
  userId?: string | null;
  name: string;
  email: string | null;
  kind: "assignee" | "manager" | "client";
};

type TicketNotify = Pick<Ticket, "id" | "ticketNumber" | "title" | "description">;

// Per-firm outbound contact/branding. Loaded from the firm row at send time,
// with env vars as the only fallback (no hardcoded personal data).
export type FirmComms = {
  senderName: string;
  email: string;
  phone: string;
  escalationName: string;
  escalationEmail: string;
  escalationPhone: string;
};

const ENV_CONTACT = {
  email: process.env.FIRM_CONTACT_EMAIL ?? "",
  phone: process.env.FIRM_CONTACT_PHONE ?? "",
  escalationName: process.env.FIRM_ESCALATION_NAME ?? "",
  escalationEmail: process.env.FIRM_ESCALATION_EMAIL ?? "",
  escalationPhone: process.env.FIRM_ESCALATION_PHONE ?? "",
};

/** Display name from EMAIL_FROM, e.g. `Alert from CA Charan <a@b.com>` → `Alert from CA Charan`. */
function envSenderName(): string {
  const from = process.env.EMAIL_FROM ?? "CA Practice <no-reply@ca-practice.local>";
  const match = from.match(/^([^<]+)</);
  if (match) return match[1].trim().replace(/^"|"$/g, "");
  return from.includes("@") ? from.split("@")[0]! : from;
}

/**
 * Build the firm's per-firm SMTP config from its stored fields, or return
 * undefined so the caller falls back to the platform env transport. The From
 * header uses smtpFrom if set, otherwise the sender name + smtpUser mailbox.
 * A malformed/undecryptable secret is treated as "no firm config" (fallback).
 */
export function buildSmtpConfig(
  firm: {
    smtpHost: string | null;
    smtpPort: number | null;
    smtpSecure: boolean | null;
    smtpUser: string | null;
    smtpPassEnc: string | null;
    smtpFrom: string | null;
  },
  senderName: string
): SmtpConfig | undefined {
  if (!firm.smtpHost || !firm.smtpUser || !firm.smtpPassEnc) return undefined;
  let pass: string;
  try {
    pass = decryptSecret(firm.smtpPassEnc);
  } catch (err) {
    logger.error({ err }, "Failed to decrypt firm SMTP password; using env fallback");
    return undefined;
  }
  const port = firm.smtpPort ?? 587;
  return {
    host: firm.smtpHost,
    port,
    // secure MUST match the port: 465 = implicit TLS, 587/25 = plaintext+STARTTLS.
    // Deriving it from the port avoids "wrong version number" TLS mismatches.
    secure: port === 465,
    user: firm.smtpUser,
    pass,
    from: firm.smtpFrom || `"${senderName.replace(/"/g, "")}" <${firm.smtpUser}>`,
  };
}

/** Resolve the current firm's outbound contact/sender + SMTP config, falling back to env. */
async function loadFirmContext(): Promise<{ comms: FirmComms; smtp?: SmtpConfig }> {
  const firm = await prisma.firm.findFirst({
    select: {
      brandName: true,
      emailFromName: true,
      contactEmail: true,
      contactPhone: true,
      escalationName: true,
      escalationEmail: true,
      escalationPhone: true,
      smtpHost: true,
      smtpPort: true,
      smtpSecure: true,
      smtpUser: true,
      smtpPassEnc: true,
      smtpFrom: true,
    },
  });
  const comms: FirmComms = {
    senderName: firm?.emailFromName || firm?.brandName || envSenderName(),
    email: firm?.contactEmail || ENV_CONTACT.email,
    phone: firm?.contactPhone || ENV_CONTACT.phone,
    escalationName: firm?.escalationName || ENV_CONTACT.escalationName,
    escalationEmail: firm?.escalationEmail || ENV_CONTACT.escalationEmail,
    escalationPhone: firm?.escalationPhone || ENV_CONTACT.escalationPhone,
  };
  const smtp = firm ? buildSmtpConfig(firm, comms.senderName) : undefined;
  return { comms, smtp };
}

function subjectFor(event: TicketEvent, ticket: TicketNotify, recipient: Recipient, sender: string): string {
  if ((event === "CREATED" || event === "COMPLETED") && recipient.kind === "client") {
    return `${sender} :`;
  }
  if (event === "ASSIGNED") {
    return `${sender} : Ticket #${ticket.ticketNumber} assigned to you — ${ticket.title}`;
  }
  if (event === "CREATED") {
    return `${sender} : New ticket #${ticket.ticketNumber} — ${ticket.title}`;
  }
  return `${sender} : Ticket #${ticket.ticketNumber} completed — ${ticket.title}`;
}

function clientCreatedBody(recipient: Recipient, ticket: TicketNotify, c: FirmComms): string {
  const work = ticket.description?.trim() || ticket.title;
  const name = recipient.name.replace(/"/g, "");
  return `<p>Hi &quot;${name}&quot;</p>
<p>A new ticket has been created.</p>
<p>Our team is handling the work assigned : &quot;${work.replace(/"/g, "")}&quot;</p>
<p>Please contact for us any query regarding this to the below mentioned Mail and Number</p>
<p>Contact Details :-</p>
<p>Mail ID - ${c.email}&nbsp;&nbsp;Phone - ${c.phone}</p>
<p>Escalation - ${c.escalationName} - email - ${c.escalationEmail}<br>
Phone - ${c.escalationPhone}</p>
<p>Thanks for the opportunity to serve you</p>`;
}

function clientCreatedText(recipient: Recipient, ticket: TicketNotify, c: FirmComms): string {
  const work = ticket.description?.trim() || ticket.title;
  const name = recipient.name.replace(/"/g, "");
  return `Hi "${name}"

A new ticket has been created.

Our team is handling the work assigned : "${work.replace(/"/g, "")}"

Please contact for us any query regarding this to the below mentioned Mail and Number

Contact Details :-

Mail ID - ${c.email}  Phone - ${c.phone}

Escalation - ${c.escalationName} - email - ${c.escalationEmail}
Phone - ${c.escalationPhone}

Thanks for the opportunity to serve you`;
}

function clientCompletedBody(recipient: Recipient, ticket: TicketNotify, c: FirmComms): string {
  const name = recipient.name.replace(/"/g, "");
  return `<p>Hi &quot;${name}&quot;</p>
<p>Your Ticket (${ticket.title.replace(/"/g, "")}) is completed....</p>
<p>Please contact for us any query regarding this to the below mentioned Mail and Number</p>
<p>Contact Details :-</p>
<p>Mail ID - ${c.email}&nbsp;&nbsp;Phone - ${c.phone}</p>
<p>Escalation - ${c.escalationName} - email - ${c.escalationEmail}<br>
Phone - ${c.escalationPhone}</p>
<p>Thanks for the opportunity to serve you</p>`;
}

function clientCompletedText(recipient: Recipient, ticket: TicketNotify, c: FirmComms): string {
  const name = recipient.name.replace(/"/g, "");
  return `Hi "${name}"

Your Ticket (${ticket.title.replace(/"/g, "")}) is completed....

Please contact for us any query regarding this to the below mentioned Mail and Number

Contact Details :-

Mail ID - ${c.email}  Phone - ${c.phone}

Escalation - ${c.escalationName} - email - ${c.escalationEmail}
Phone - ${c.escalationPhone}

Thanks for the opportunity to serve you`;
}

function bodyFor(
  event: TicketEvent,
  recipient: Recipient,
  ticket: TicketNotify,
  ticketUrl: string,
  comms: FirmComms
): { html: string; text?: string } {
  if (event === "CREATED" && recipient.kind === "client") {
    return {
      html: clientCreatedBody(recipient, ticket, comms),
      text: clientCreatedText(recipient, ticket, comms),
    };
  }
  if (event === "COMPLETED" && recipient.kind === "client") {
    return {
      html: clientCompletedBody(recipient, ticket, comms),
      text: clientCompletedText(recipient, ticket, comms),
    };
  }

  const heading =
    event === "CREATED"
      ? "A new ticket has been created"
      : event === "COMPLETED"
        ? "A ticket has been completed"
        : "A ticket has been assigned to you";
  return {
    html: `<p>Hi ${recipient.name},</p><p>${heading}:</p>
<p><strong><a href="${ticketUrl}">#${ticket.ticketNumber} — ${ticket.title}</a></strong></p>
<p><a href="${ticketUrl}">View ticket →</a></p>`,
  };
}

/** One email per address; on CREATED, prefer the client-facing template. */
function dedupeRecipients(recipients: Recipient[], event: TicketEvent): Recipient[] {
  const byEmail = new Map<string, Recipient>();
  for (const r of recipients) {
    if (!r.email) continue;
    const key = r.email.toLowerCase();
    const existing = byEmail.get(key);
    if (!existing) {
      byEmail.set(key, r);
      continue;
    }
    if (event === "CREATED" && r.kind === "client") {
      byEmail.set(key, r);
    }
  }
  return [...byEmail.values()];
}

/**
 * Email the relevant people about a ticket event and log each attempt.
 * Recipients are de-duplicated by email; failures never throw.
 */
export async function notifyTicketEvent(
  ticket: TicketNotify,
  recipients: Recipient[],
  event: TicketEvent
) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const ticketUrl = `${appUrl}/tickets/${ticket.id}`;
  const { comms, smtp } = await loadFirmContext();

  for (const r of dedupeRecipients(recipients, event)) {
    if (!r.email) continue;
    const subject = subjectFor(event, ticket, r, comms.senderName);
    const body = bodyFor(event, r, ticket, ticketUrl, comms);
    try {
      const sent = await sendEmail(
        {
          to: r.email,
          subject,
          html: body.html,
          text: body.text,
        },
        smtp
      );
      if (r.userId) {
        await prisma.notificationLog.create({
          data: {
            firmId: requireFirmId(),
            userId: r.userId,
            ticketId: ticket.id,
            channel: "EMAIL",
            subject,
            status: sent ? "SENT" : "FAILED",
          },
        });
      }
    } catch (err) {
      if (r.userId) {
        await prisma.notificationLog.create({
          data: {
            firmId: requireFirmId(),
            userId: r.userId,
            ticketId: ticket.id,
            channel: "EMAIL",
            subject,
            status: "FAILED",
            error: err instanceof Error ? err.message : String(err),
          },
        });
      }
    }
  }
}

/** Backwards-compatible helper: notify a single assignee. */
export async function notifyTicketAssigned(
  ticket: TicketNotify,
  assignee: Pick<User, "id" | "name" | "email">
) {
  await notifyTicketEvent(
    ticket,
    [{ userId: assignee.id, name: assignee.name, email: assignee.email, kind: "assignee" }],
    "ASSIGNED"
  );
}

/**
 * Gather assignee + manager + client for a ticket and notify them.
 * Used on ticket creation and completion.
 */
export async function notifyTicketParticipants(
  ticketId: string,
  event: TicketEvent
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { assignee: true, manager: true, client: true },
  });
  if (!ticket) return;

  const recipients: Recipient[] = [];
  // Client first so dedupe keeps the client template when emails overlap with staff.
  if (ticket.client?.email)
    recipients.push({
      name: ticket.client.name,
      email: ticket.client.email,
      kind: "client",
    });
  if (ticket.assignee)
    recipients.push({
      userId: ticket.assignee.id,
      name: ticket.assignee.name,
      email: ticket.assignee.email,
      kind: "assignee",
    });
  if (ticket.manager)
    recipients.push({
      userId: ticket.manager.id,
      name: ticket.manager.name,
      email: ticket.manager.email,
      kind: "manager",
    });

  await notifyTicketEvent(ticket, recipients, event);
}
