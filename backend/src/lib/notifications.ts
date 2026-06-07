import { sendEmail } from "./email";
import { prisma } from "./prisma";
import type { Ticket, User } from "@prisma/client";

export async function notifyTicketAssigned(
  ticket: Pick<Ticket, "id" | "ticketNumber" | "title">,
  assignee: Pick<User, "id" | "name" | "email">
) {
  if (!assignee.email) return;

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const ticketUrl = `${appUrl}/tickets/${ticket.id}`;

  try {
    const sent = await sendEmail({
      to: assignee.email,
      subject: `[CA Practice] Ticket #${ticket.ticketNumber} assigned to you`,
      html: `
        <p>Hi ${assignee.name},</p>
        <p>A ticket has been assigned to you:</p>
        <p><strong><a href="${ticketUrl}">#${ticket.ticketNumber} — ${ticket.title}</a></strong></p>
        <p><a href="${ticketUrl}">View ticket →</a></p>
      `,
    });

    await prisma.notificationLog.create({
      data: {
        userId: assignee.id,
        ticketId: ticket.id,
        channel: "EMAIL",
        subject: `Ticket #${ticket.ticketNumber} assigned to you`,
        status: sent ? "SENT" : "FAILED",
      },
    });
  } catch (err) {
    await prisma.notificationLog.create({
      data: {
        userId: assignee.id,
        ticketId: ticket.id,
        channel: "EMAIL",
        subject: `Ticket #${ticket.ticketNumber} assigned to you`,
        status: "FAILED",
        error: err instanceof Error ? err.message : String(err),
      },
    });
  }
}
