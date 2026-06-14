import Link from "next/link";
import { notFound } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, FileText, Activity as ActivityIcon, Clock } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getToken } from "@/lib/session";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import { StatusSelect, AssigneeSelect } from "@/components/tickets/ticket-controls";
import { TicketSubtasks } from "@/components/tickets/ticket-subtasks";
import { TicketTimeLog } from "@/components/tickets/ticket-time-log";
import {
  TicketComments,
  type CommentNode,
} from "@/components/tickets/ticket-comments";
import { TicketEditDialog } from "@/components/tickets/ticket-edit-dialog";
import { TicketDeleteButton } from "@/components/tickets/ticket-delete-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FREQUENCY_LABEL,
  BILLABLE_LABEL,
  INVOICE_NOTE_LABEL,
} from "@/lib/labels";
import type { ActivityType } from "@/types/domain";

function activityText(type: ActivityType, meta: unknown): string {
  const m = (meta ?? {}) as Record<string, string>;
  switch (type) {
    case "CREATED":
      return "created this ticket";
    case "STATUS_CHANGED":
      return m.from && m.to ? `moved status to ${m.to}` : "changed the status";
    case "ASSIGNED":
      return "updated the assignee";
    case "COMMENTED":
      return "commented";
    case "SUBTASK_TOGGLED":
      return m.subtask ? `updated sub-task "${m.subtask}"` : "updated a sub-task";
    case "TIME_LOGGED":
      return "logged time";
    case "ATTACHMENT_ADDED":
      return "added an attachment";
    case "RECURRING_GENERATED":
      return "was generated from a recurring schedule";
    default:
      return "updated this ticket";
  }
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

type RawAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

type RawComment = {
  id: string;
  body: string;
  parentId: string | null;
  createdAt: string;
  author: { name: string };
  attachments: RawAttachment[];
};

type Ticket = {
  id: string;
  ticketNumber: number;
  title: string;
  status: string;
  priority: string;
  frequency: string;
  billable: string;
  invoiceStatus: string;
  targetMinutes: number | null;
  description: string | null;
  documentsRequired: string | null;
  startDate: string | null;
  dueDate: string | null;
  categoryId: string | null;
  assigneeId: string | null;
  managerId: string | null;
  clientId: string;
  client: { id: string; name: string };
  category: { name: string } | null;
  assignee: { id: string; name: string } | null;
  manager: { id: string; name: string } | null;
  reporter: { name: string };
  subtasks: Array<{
    id: string;
    title: string;
    status: string;
    assignee: { name: string } | null;
  }>;
  comments: RawComment[];
  timeEntries: Array<{
    id: string;
    minutes: number;
    description: string | null;
    workDate: string;
    user: { name: string } | null;
  }>;
  activities: Array<{
    id: string;
    type: ActivityType;
    metadata: unknown;
    createdAt: string;
    actor: { name: string } | null;
  }>;
};

type TicketDetailData = {
  ticket: Ticket;
  employees: Array<{ id: string; name: string }>;
  managers: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
};

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const token = await getToken();

  let data: TicketDetailData;
  try {
    data = await apiGet<TicketDetailData>(`/api/tickets/${id}`, token);
  } catch {
    notFound();
  }

  const { ticket, employees, managers, categories } = data;

  // Build comment tree (one level of replies)
  const byId = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];
  for (const c of ticket.comments) {
    byId.set(c.id, {
      id: c.id,
      body: c.body,
      authorName: c.author.name,
      createdAt: c.createdAt,
      attachments: c.attachments ?? [],
      replies: [],
    });
  }
  for (const c of ticket.comments) {
    const node = byId.get(c.id)!;
    if (c.parentId && byId.has(c.parentId)) byId.get(c.parentId)!.replies.push(node);
    else roots.push(node);
  }

  return (
    <>
      <Link
        href="/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Tickets
      </Link>

      <PageHeader
        title={ticket.title}
        description={`#${ticket.ticketNumber} · ${ticket.client.name}`}
      >
        <StatusSelect ticketId={ticket.id} status={ticket.status as Parameters<typeof StatusSelect>[0]["status"]} />
        <TicketEditDialog
          categories={categories}
          employees={employees}
          managers={managers}
          ticket={{
            id: ticket.id,
            title: ticket.title,
            categoryId: ticket.categoryId ?? "",
            assigneeId: ticket.assigneeId ?? "",
            managerId: ticket.managerId ?? "",
            priority: ticket.priority as Parameters<typeof TicketEditDialog>[0]["ticket"]["priority"],
            frequency: ticket.frequency as Parameters<typeof TicketEditDialog>[0]["ticket"]["frequency"],
            billable: ticket.billable as Parameters<typeof TicketEditDialog>[0]["ticket"]["billable"],
            invoiceStatus: ticket.invoiceStatus as Parameters<typeof TicketEditDialog>[0]["ticket"]["invoiceStatus"],
            targetHours: ticket.targetMinutes != null ? ticket.targetMinutes / 60 : undefined,
            description: ticket.description ?? "",
            documentsRequired: ticket.documentsRequired ?? "",
            startDate: ticket.startDate
              ? format(new Date(ticket.startDate), "yyyy-MM-dd")
              : "",
            dueDate: ticket.dueDate ? format(new Date(ticket.dueDate), "yyyy-MM-dd") : "",
          }}
        />
        {user.role === "CA" && (
          <TicketDeleteButton ticketId={ticket.id} ticketNumber={ticket.ticketNumber} />
        )}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {ticket.description ? (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {ticket.description}
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Sub-tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketSubtasks
                ticketId={ticket.id}
                subtasks={ticket.subtasks.map((s) => ({
                  id: s.id,
                  title: s.title,
                  status: s.status as Parameters<typeof TicketSubtasks>[0]["subtasks"][0]["status"],
                  assignee: s.assignee ? { name: s.assignee.name } : null,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                Time tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TicketTimeLog
                ticketId={ticket.id}
                targetMinutes={ticket.targetMinutes}
                entries={ticket.timeEntries}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketComments ticketId={ticket.id} comments={roots} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                <Detail label="Status">
                  <StatusBadge status={ticket.status as Parameters<typeof StatusBadge>[0]["status"]} />
                </Detail>
                <Detail label="Priority">
                  <PriorityBadge priority={ticket.priority as Parameters<typeof PriorityBadge>[0]["priority"]} />
                </Detail>
                <Detail label="Assignee">
                  <AssigneeSelect
                    ticketId={ticket.id}
                    assigneeId={ticket.assigneeId}
                    employees={employees}
                  />
                </Detail>
                <Detail label="Manager">
                  {ticket.manager?.name ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </Detail>
                <Detail label="Target">
                  {ticket.targetMinutes != null
                    ? `${(ticket.targetMinutes / 60).toFixed(1)} hrs`
                    : "—"}
                </Detail>
                <Detail label="Client">
                  <Link
                    href={`/clients/${ticket.clientId}`}
                    className="text-primary hover:underline"
                  >
                    {ticket.client.name}
                  </Link>
                </Detail>
                <Detail label="Category">
                  {ticket.category?.name ?? "—"}
                </Detail>
                <Detail label="Frequency">
                  {FREQUENCY_LABEL[ticket.frequency as keyof typeof FREQUENCY_LABEL]}
                </Detail>
                <Detail label="Billable">
                  <Badge
                    variant={
                      ticket.billable === "BILLABLE" ? "default" : "secondary"
                    }
                  >
                    {BILLABLE_LABEL[ticket.billable as keyof typeof BILLABLE_LABEL]}
                  </Badge>
                </Detail>
                <Detail label="Invoice">
                  {INVOICE_NOTE_LABEL[ticket.invoiceStatus as keyof typeof INVOICE_NOTE_LABEL]}
                </Detail>
                <Detail label="Start">
                  {ticket.startDate
                    ? format(new Date(ticket.startDate), "dd MMM yyyy")
                    : "—"}
                </Detail>
                <Detail label="Due">
                  {ticket.dueDate ? format(new Date(ticket.dueDate), "dd MMM yyyy") : "—"}
                </Detail>
                <Detail label="Reporter">{ticket.reporter.name}</Detail>
              </dl>
            </CardContent>
          </Card>

          {ticket.documentsRequired ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" />
                  Documents required
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {ticket.documentsRequired}
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ActivityIcon className="size-4 text-muted-foreground" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {ticket.activities.map((a) => (
                  <li key={a.id} className="flex gap-2 text-sm">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-border" />
                    <span className="text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {a.actor?.name ?? "System"}
                      </span>{" "}
                      {activityText(a.type, a.metadata)}
                      <span className="block text-xs">
                        {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
