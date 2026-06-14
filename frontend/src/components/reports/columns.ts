export type ReportRow = {
  ticketNumber: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  frequency: string;
  billable: string;
  invoiceStatus: string;
  clientName: string;
  categoryName: string;
  assigneeName: string;
  managerName: string;
  reporterName: string;
  periodLabel: string;
  documentsRequired: string;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  targetHours: number | null;
  loggedHours: number;
};

export type ReportColumn = {
  key: keyof ReportRow;
  label: string;
  date?: boolean;
};

// Every exportable/previewable column, in display order.
export const REPORT_COLUMNS: ReportColumn[] = [
  { key: "ticketNumber", label: "Ticket #" },
  { key: "title", label: "Title" },
  { key: "status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "clientName", label: "Client" },
  { key: "categoryName", label: "Category" },
  { key: "assigneeName", label: "Assignee" },
  { key: "managerName", label: "Manager" },
  { key: "reporterName", label: "Reporter" },
  { key: "frequency", label: "Frequency" },
  { key: "billable", label: "Billable" },
  { key: "invoiceStatus", label: "Invoice status" },
  { key: "startDate", label: "Start date", date: true },
  { key: "dueDate", label: "Due date", date: true },
  { key: "completedAt", label: "Completed at", date: true },
  { key: "createdAt", label: "Created at", date: true },
  { key: "targetHours", label: "Target hours" },
  { key: "loggedHours", label: "Logged hours" },
  { key: "periodLabel", label: "Period" },
  { key: "documentsRequired", label: "Documents required" },
  { key: "description", label: "Description" },
];
