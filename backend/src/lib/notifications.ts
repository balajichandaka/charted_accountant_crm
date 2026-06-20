import { sendEmail } from "./email";
import { prisma } from "./prisma";
import type { Ticket, User } from "@prisma/client";

export type TicketEvent = "ASSIGNED" | "CREATED" | "COMPLETED";

type Recipient = {
  userId?: string | null;
  name: string;
  email: string | null;
  kind: "assignee" | "manager" | "client";
};

type TicketNotify = Pick<Ticket, "id" | "ticketNumber" | "title" | "description">;

const FIRM_CONTACT = {
  email: process.env.FIRM_CONTACT_EMAIL ?? "vscharanco@gmail.com",
  phone: process.env.FIRM_CONTACT_PHONE ?? "6302846943",
  escalationName: process.env.FIRM_ESCALATION_NAME ?? "Sai Charan",
  escalationEmail: process.env.FIRM_ESCALATION_EMAIL ?? "vscharanca@gmail.com",
  escalationPhone: process.env.FIRM_ESCALATION_PHONE ?? "9566278894",
};

/** Display name from EMAIL_FROM, e.g. `Alert from CA Charan <a@b.com>` → `Alert from CA Charan`. */
function emailSenderName(): string {
  const from = process.env.EMAIL_FROM ?? "CA Practice <no-reply@ca-practice.local>";
  const match = from.match(/^([^<]+)</);
  if (match) return match[1].trim().replace(/^"|"$/g, "");
  return from.includes("@") ? from.split("@")[0]! : from;
}

function subjectFor(event: TicketEvent, ticket: TicketNotify, recipient: Recipient): string {
  const sender = emailSenderName();
  if (event === "CREATED" && recipient.kind === "client") {
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

function clientCreatedBody(recipient: Recipient, ticket: TicketNotify): string {
  const work = ticket.description?.trim() || ticket.title;
  const name = recipient.name.replace(/"/g, "");
  return `<p>Hi &quot;${name}&quot;</p>
<p>A new ticket has been created.</p>
<p>Our team is handling the work assigned : &quot;${work.replace(/"/g, "")}&quot;</p>
<p>Please contact for us any query regarding this to the below mentioned Mail and Number</p>
<p>Contact Details :-</p>
<p>Mail ID - ${FIRM_CONTACT.email}&nbsp;&nbsp;Phone - ${FIRM_CONTACT.phone}</p>
<p>Escalation - ${FIRM_CONTACT.escalationName} - email - ${FIRM_CONTACT.escalationEmail}<br>
Phone - ${FIRM_CONTACT.escalationPhone}</p>
<p>Thanks for the opportunity to serve you</p>`;
}

function clientCreatedText(recipient: Recipient, ticket: TicketNotify): string {
  const work = ticket.description?.trim() || ticket.title;
  const name = recipient.name.replace(/"/g, "");
  return `Hi "${name}"

A new ticket has been created.

Our team is handling the work assigned : "${work.replace(/"/g, "")}"

Please contact for us any query regarding this to the below mentioned Mail and Number

Contact Details :-

Mail ID - ${FIRM_CONTACT.email}  Phone - ${FIRM_CONTACT.phone}

Escalation - ${FIRM_CONTACT.escalationName} - email - ${FIRM_CONTACT.escalationEmail}
Phone - ${FIRM_CONTACT.escalationPhone}

Thanks for the opportunity to serve you`;
}

function bodyFor(
  event: TicketEvent,
  recipient: Recipient,
  ticket: TicketNotify,
  ticketUrl: string
): { html: string; text?: string } {
  if (event === "CREATED" && recipient.kind === "client") {
    return {
      html: clientCreatedBody(recipient, ticket),
      text: clientCreatedText(recipient, ticket),
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

  for (const r of dedupeRecipients(recipients, event)) {
    if (!r.email) continue;
    const subject = subjectFor(event, ticket, r);
    const body = bodyFor(event, r, ticket, ticketUrl);
    try {
      const sent = await sendEmail({
        to: r.email,
        subject,
        html: body.html,
        text: body.text,
      });
      if (r.userId) {
        await prisma.notificationLog.create({
          data: {
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
