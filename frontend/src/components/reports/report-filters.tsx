"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format, subDays, startOfMonth, startOfYear } from "date-fns";
import { ChevronDown, CalendarDays } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { STATUS_LABEL, PRIORITY_LABEL, PRIORITY_ORDER } from "@/lib/labels";
import type { TicketStatus } from "@/types/domain";

type IdName = { id: string; name: string };

const ALL = "__all__";
const fmt = (d: Date) => format(d, "yyyy-MM-dd");
const STATUSES = Object.keys(STATUS_LABEL) as TicketStatus[];

const DATE_TYPES = [
  { value: "createdAt", label: "Created Date" },
  { value: "startDate", label: "Start Date" },
  { value: "dueDate", label: "Due Date" },
] as const;

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

// ── Generic multi-select popover ──────────────────────────────────────────────
function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  function toggle(v: string) {
    if (selected.includes(v)) onChange(selected.filter((x) => x !== v));
    else onChange([...selected, v]);
  }

  const triggerLabel =
    selected.length === 0
      ? label
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? label)
        : `${label} · ${selected.length}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={selected.length > 0 ? "secondary" : "outline"}
          size="sm"
          className="h-9 gap-1.5 px-3"
        >
          {triggerLabel}
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1">
        <div className="max-h-60 overflow-y-auto">
          {options.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-sm hover:bg-muted"
            >
              <Checkbox
                checked={selected.includes(o.value)}
                onCheckedChange={() => toggle(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
        {selected.length > 0 && (
          <>
            <div className="my-1 border-t" />
            <button
              className="w-full rounded px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted"
              onClick={() => onChange([])}
            >
              Clear selection
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ── Date range popover (matches the tickets page date filter) ─────────────────
function DateFilter({
  dateType,
  from,
  to,
  today,
  activePreset,
  onChangeType,
  onChangePreset,
  onChangeFrom,
  onChangeTo,
}: {
  dateType: string;
  from: string;
  to: string;
  today: string;
  activePreset: string;
  onChangeType: (v: string) => void;
  onChangePreset: (v: string) => void;
  onChangeFrom: (v: string) => void;
  onChangeTo: (v: string) => void;
}) {
  const typeLabel = DATE_TYPES.find((d) => d.value === dateType)?.label ?? "Date";
  const presetLabel = PRESET_LABELS[activePreset] ?? "Custom range";
  const triggerLabel = `${typeLabel}: ${presetLabel}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm" className="h-9 gap-1.5 px-3">
          <CalendarDays className="size-3.5 opacity-60" />
          {triggerLabel}
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-3">
        <p className="text-xs font-medium text-muted-foreground">Date type</p>
        <Select value={dateType} onValueChange={onChangeType}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_TYPES.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="text-xs font-medium text-muted-foreground">Period</p>
        <Select value={activePreset} onValueChange={onChangePreset}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PRESET_LABELS).map(([k, l]) => (
              <SelectItem key={k} value={k}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="text-xs font-medium text-muted-foreground">From</p>
        <Input
          type="date"
          value={from}
          max={to || today}
          className="h-8 text-sm"
          onChange={(e) => e.target.value && onChangeFrom(e.target.value)}
        />

        <p className="text-xs font-medium text-muted-foreground">To</p>
        <Input
          type="date"
          value={to}
          max={today}
          className="h-8 text-sm"
          onChange={(e) => e.target.value && onChangeTo(e.target.value)}
        />
      </PopoverContent>
    </Popover>
  );
}

export function ReportFilters({
  from,
  to,
  dateType,
  today,
  employees,
  clients,
  categories,
}: {
  from: string;
  to: string;
  dateType: string;
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

  function parseMulti(key: string): string[] {
    const v = params.get(key);
    return v ? v.split(",").filter(Boolean) : [];
  }

  function setMulti(key: string, values: string[]) {
    const next = new URLSearchParams(params.toString());
    if (values.length === 0) next.delete(key);
    else next.set(key, values.join(","));
    router.push(`${pathname}?${next.toString()}`);
  }

  const selectedStatuses = parseMulti("status") as TicketStatus[];
  const selectedPriorities = parseMulti("priority");
  const selectedAssignees = parseMulti("assigneeId");
  const selectedClients = parseMulti("clientId");
  const selectedCategories = parseMulti("categoryId");

  const statusOptions = STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }));
  const priorityOptions = PRIORITY_ORDER.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }));
  const assigneeOptions = employees.map((e) => ({ value: e.id, label: e.name }));
  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }));
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date filter (type + range) */}
      <DateFilter
        dateType={dateType}
        from={from}
        to={to}
        today={today}
        activePreset={activePreset}
        onChangeType={(v) => pushParams({ dateType: v === "createdAt" ? null : v })}
        onChangePreset={(v) => (v === "custom" ? pushParams({ from, to }) : pushParams(presets[v]))}
        onChangeFrom={(v) => pushParams({ from: v })}
        onChangeTo={(v) => pushParams({ to: v })}
      />

      {/* Multi-select filters */}
      <div className="flex flex-wrap items-center gap-2">
        <MultiSelect
          label="Status"
          options={statusOptions}
          selected={selectedStatuses}
          onChange={(v) => setMulti("status", v)}
        />

        <MultiSelect
          label="Priority"
          options={priorityOptions}
          selected={selectedPriorities}
          onChange={(v) => setMulti("priority", v)}
        />

        <MultiSelect
          label="Assignee"
          options={assigneeOptions}
          selected={selectedAssignees}
          onChange={(v) => setMulti("assigneeId", v)}
        />

        <MultiSelect
          label="Client"
          options={clientOptions}
          selected={selectedClients}
          onChange={(v) => setMulti("clientId", v)}
        />

        <MultiSelect
          label="Category"
          options={categoryOptions}
          selected={selectedCategories}
          onChange={(v) => setMulti("categoryId", v)}
        />
      </div>
    </div>
  );
}
