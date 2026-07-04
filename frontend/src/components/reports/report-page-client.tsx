"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Download, Loader2, Columns3 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReportFilters } from "@/components/reports/report-filters";
import { REPORT_COLUMNS, type ReportRow } from "./columns";

const STORAGE_KEY = "analytics-report-columns";

function loadColumns(): Record<string, boolean> {
  const def = Object.fromEntries(REPORT_COLUMNS.map((c) => [c.key, true]));
  if (typeof window === "undefined") return def;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...def, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return def;
}

function cellValue(row: ReportRow, key: keyof ReportRow, isDate?: boolean): string {
  const raw = row[key];
  if (raw == null || raw === "") return "—";
  if (isDate) return format(new Date(raw as string), "dd MMM yyyy");
  return String(raw);
}

type IdName = { id: string; name: string };

export function ReportPageClient({
  rows,
  fileDate,
  from,
  to,
  dateType,
  today,
  employees,
  clients,
  categories,
}: {
  rows: ReportRow[];
  fileDate: string;
  from: string;
  to: string;
  dateType: string;
  today: string;
  employees: IdName[];
  clients: IdName[];
  categories: IdName[];
}) {
  const [cols, setCols] = useState<Record<string, boolean>>(loadColumns);
  const [busy, setBusy] = useState(false);

  const persist = (next: Record<string, boolean>) => {
    setCols(next);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };
  const toggle = (key: string, value: boolean) => persist({ ...cols, [key]: value });
  const setAll = (value: boolean) =>
    persist(Object.fromEntries(REPORT_COLUMNS.map((c) => [c.key, value])));

  const visible = REPORT_COLUMNS.filter((c) => cols[c.key]);

  async function download() {
    if (visible.length === 0) { toast.error("Select at least one column."); return; }
    if (rows.length === 0) { toast.error("No tickets to export."); return; }
    setBusy(true);
    try {
      const data = rows.map((row) => {
        const obj: Record<string, unknown> = {};
        for (const c of visible) {
          const raw = row[c.key];
          obj[c.label] = c.date ? (raw ? format(new Date(raw as string), "yyyy-MM-dd") : "") : raw ?? "";
        }
        return obj;
      });
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(data, { header: visible.map((c) => c.label) });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Tickets");
      XLSX.writeFile(wb, `tickets-report-${fileDate}.xlsx`);
      toast.success(`Exported ${rows.length} ticket${rows.length === 1 ? "" : "s"}`);
    } finally { setBusy(false); }
  }

  return (
    <>
      {/* ── Sticky block: title + filters + toolbar ── */}
      <div
        className="sticky top-0 z-20 -mx-4 border-b bg-background/95 backdrop-blur lg:-mx-8"
      >
        {/* Page title */}
        <div className="flex flex-col gap-3 border-b px-4 pb-4 pt-6 sm:flex-row sm:items-center sm:justify-between lg:px-8 lg:pt-8">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Reporting</h1>
            <p className="text-sm text-muted-foreground">
              Filter tickets, preview the report, then download it as Excel.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="border-b px-4 py-3 lg:px-8">
          <ReportFilters
            from={from}
            to={to}
            dateType={dateType}
            today={today}
            employees={employees}
            clients={clients}
            categories={categories}
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 lg:px-8">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground tabular">{rows.length}</span>{" "}
            ticket{rows.length === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Columns3 className="size-4" />
                  Columns ({visible.length}/{REPORT_COLUMNS.length})
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 gap-0 p-0">
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <span className="text-sm font-medium">Columns</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setAll(true)}>All</Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setAll(false)}>None</Button>
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto p-2">
                  {REPORT_COLUMNS.map((c) => (
                    <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-sm px-1.5 py-1.5 text-sm hover:bg-accent">
                      <Checkbox checked={!!cols[c.key]} onCheckedChange={(v) => toggle(c.key, v === true)} />
                      <span className="truncate">{c.label}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button size="sm" onClick={download} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Download Excel
            </Button>
          </div>
        </div>
      </div>

      {/* ── Table — header pinned to the top of its own scroll area ── */}
      <div className="-mx-4 max-h-[calc(100vh-15rem)] overflow-auto lg:-mx-8">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow className="bg-primary/10 hover:bg-primary/10">
              {visible.map((c) => (
                <TableHead
                  key={c.key}
                  className="whitespace-nowrap text-xs font-bold uppercase tracking-wide text-primary"
                >
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visible.length || 1}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No tickets match these filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.ticketNumber} className="even:bg-muted/40">
                  {visible.map((c, i) => (
                    <TableCell
                      key={c.key}
                      className={
                        i === 0
                          ? "whitespace-nowrap font-semibold text-foreground"
                          : "whitespace-nowrap text-muted-foreground"
                      }
                    >
                      {cellValue(row, c.key, c.date)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
