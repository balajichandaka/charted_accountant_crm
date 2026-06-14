"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format, subDays, startOfMonth, startOfYear } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STATUS_LABEL } from "@/lib/labels";
import type { TicketStatus } from "@/types/domain";

type IdName = { id: string; name: string };

const ALL = "__all__";
const fmt = (d: Date) => format(d, "yyyy-MM-dd");
const STATUSES = Object.keys(STATUS_LABEL) as TicketStatus[];

function presetRanges(today: Date): Record<string, { from: string; to: string }> {
  const to = fmt(today);
  return {
    "7": { from: fmt(subDays(today, 7)), to },
    "30": { from: fmt(subDays(today, 30)), to },
    "90": { from: fmt(subDays(today, 90)), to },
    month: { from: fmt(startOfMonth(today)), to },
    year: { from: fmt(startOfYear(today)), to },
  };
}

const PRESET_LABELS: Record<string, string> = {
  "7": "Last 7 days",
  "30": "Last 30 days",
  "90": "Last 90 days",
  month: "This month",
  year: "This year",
  custom: "Custom range",
};

export function ReportFilters({
  from,
  to,
  today,
  employees,
  clients,
  categories,
}: {
  from: string;
  to: string;
  today: string;
  employees: IdName[];
  clients: IdName[];
  categories: IdName[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const presets = presetRanges(new Date(today));
  const activePreset =
    Object.entries(presets).find(([, r]) => r.from === from && r.to === to)?.[0] ?? "custom";

  function pushParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === ALL) next.delete(key);
      else next.set(key, value);
    }
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Period</Label>
        <Select
          value={activePreset}
          onValueChange={(v) => (v === "custom" ? pushParams({ from, to }) : pushParams(presets[v]))}
        >
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(PRESET_LABELS).map(([k, l]) => (
              <SelectItem key={k} value={k}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">From</Label>
        <Input
          type="date"
          value={from}
          max={to || today}
          onChange={(e) => e.target.value && pushParams({ from: e.target.value })}
          className="w-36"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">To</Label>
        <Input
          type="date"
          value={to}
          max={today}
          onChange={(e) => e.target.value && pushParams({ to: e.target.value })}
          className="w-36"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Assignee</Label>
        <Select value={params.get("assigneeId") ?? ALL} onValueChange={(v) => pushParams({ assigneeId: v })}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All assignees</SelectItem>
            {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Status</Label>
        <Select value={params.get("status") ?? ALL} onValueChange={(v) => pushParams({ status: v })}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Client</Label>
        <Select value={params.get("clientId") ?? ALL} onValueChange={(v) => pushParams({ clientId: v })}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All clients</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Category</Label>
        <Select value={params.get("categoryId") ?? ALL} onValueChange={(v) => pushParams({ categoryId: v })}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
