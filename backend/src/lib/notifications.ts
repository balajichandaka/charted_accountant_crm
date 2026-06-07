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

const SUBJECTS: Record<TicketEvent, (n: number, t: string) => string> = {
  ASSIGNED: (n, t) => `[CA Practice] Ticket #${n} assigned to you — ${t}`,
  CREATED: (n, t) => `[CA Practice] New ticket #${n} — ${t}`,
  COMPLETED: (n, t) => `[CA Practice] Ticket #${n} completed — ${t}`,
};

function bodyFor(
  event: TicketEvent,
  recipient: Recipient,
  ticket: Pick<Ticket, "id" | "ticketNumber" | "title">,
  ticketUrl: string
): string {
  const heading =
    event === "CREATED"
      ? "A new ticket has been created"
      : event === "COMPLETED"
        ? "A ticket has been completed"
        : "A ticket has been assigned to you";
  const link =
    recipient.kind === "client"
      ? `<p>Your accounting team is handling: <strong>#${ticket.ticketNumber} — ${ticket.title}</strong></p>`
      : `<p><strong><a href="${ticketUrl}">#${ticket.ticketNumber} — ${ticket.title}</a></strong></p>
         <p><a href="${ticketUrl}">View ticket →</a></p>`;
  return `<p>Hi ${recipient.name},</p><p>${heading}:</p>${link}`;
}

/**
 * Email the relevant people about a ticket event and log each attempt.
 * Recipients are de-duplicated by email; failures never throw.
 */
export async function notifyTicketEvent(
  ticket: Pick<Ticket, "id" | "ticketNumber" | "title">,
  recipients: Recipient[],
  event: TicketEvent
) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const ticketUrl = `${appUrl}/tickets/${ticket.id}`;

  const seen = new Set<string>();
  for (const r of recipients) {
    if (!r.email) continue;
    const key = r.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const subject = SUBJECTS[event](ticket.ticketNumber, ticket.title);
    try {
      const sent = await sendEmail({
        to: r.email,
        subject,
        html: bodyFor(event, r, ticket, ticketUrl),
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
  ticket: Pick<Ticket, "id" | "ticketNumber" | "title">,
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
  if (ticket.client?.email)
    recipients.push({
      name: ticket.client.name,
      email: ticket.client.email,
      kind: "client",
    });

  await notifyTicketEvent(ticket, recipients, event);
}
