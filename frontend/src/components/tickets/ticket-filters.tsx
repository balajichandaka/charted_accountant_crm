"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, X, ChevronDown, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABEL, PRIORITY_LABEL, PRIORITY_ORDER } from "@/lib/labels";
import type { TicketStatus } from "@/types/domain";

const STATUSES = Object.keys(STATUS_LABEL) as TicketStatus[];

const DATE_TYPES = [
  { value: "createdAt", label: "Created Date" },
  { value: "startDate", label: "Start Date" },
  { value: "dueDate", label: "Due Date" },
] as const;

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

// ── Date range popover ────────────────────────────────────────────────────────
function DateFilter({
  dateType,
  dateFrom,
  dateTo,
  onChangeType,
  onChangeFrom,
  onChangeTo,
  onClear,
}: {
  dateType: string;
  dateFrom: string;
  dateTo: string;
  onChangeType: (v: string) => void;
  onChangeFrom: (v: string) => void;
  onChangeTo: (v: string) => void;
  onClear: () => void;
}) {
  const hasDate = !!(dateFrom || dateTo);
  const typeLabel = DATE_TYPES.find((d) => d.value === dateType)?.label ?? "Date";
  const rangeLabel = dateFrom && dateTo ? `${dateFrom} – ${dateTo}` : dateFrom || dateTo || "";
  const triggerLabel = hasDate ? `${typeLabel}: ${rangeLabel}` : "Date";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={hasDate ? "secondary" : "outline"}
          size="sm"
          className="h-9 gap-1.5 px-3"
        >
          <CalendarDays className="size-3.5 opacity-60" />
          {triggerLabel}
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-3">
        <p className="text-xs font-medium text-muted-foreground">Date type</p>
        <Select value={dateType || "createdAt"} onValueChange={onChangeType}>
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

        <p className="text-xs font-medium text-muted-foreground">From</p>
        <Input
          type="date"
          value={dateFrom}
          className="h-8 text-sm"
          onChange={(e) => onChangeFrom(e.target.value)}
        />

        <p className="text-xs font-medium text-muted-foreground">To</p>
        <Input
          type="date"
          value={dateTo}
          className="h-8 text-sm"
          onChange={(e) => onChangeTo(e.target.value)}
        />

        {hasDate && (
          <Button variant="ghost" size="sm" className="w-full" onClick={onClear}>
            Clear dates
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ── Main filter bar ───────────────────────────────────────────────────────────
export function TicketFilters({
  clients,
  employees,
  categories,
}: {
  clients: { id: string; name: string }[];
  employees: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const urlQ = params.get("q") ?? "";
  const [draft, setDraft] = useState<string | null>(null);
  const search = draft !== null && draft !== urlQ ? draft : urlQ;

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

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (!value) next.delete(key);
    else next.set(key, value);
    router.push(`${pathname}?${next.toString()}`);
  }

  function setDateParam(type: string, from: string, to: string) {
    const next = new URLSearchParams(params.toString());
    if (type) next.set("dateType", type); else next.delete("dateType");
    if (from) next.set("dateFrom", from); else next.delete("dateFrom");
    if (to) next.set("dateTo", to); else next.delete("dateTo");
    router.push(`${pathname}?${next.toString()}`);
  }

  function clearDates() {
    const next = new URLSearchParams(params.toString());
    ["dateType", "dateFrom", "dateTo"].forEach((k) => next.delete(k));
    router.push(`${pathname}?${next.toString()}`);
  }

  useEffect(() => {
    if (draft === null || draft === urlQ) return;
    const t = setTimeout(() => setParam("q", draft || null), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, urlQ]);

  const selectedStatuses = parseMulti("status") as TicketStatus[];
  const selectedPriorities = parseMulti("priority");
  const selectedAssignees = parseMulti("assigneeId");
  const selectedClients = parseMulti("clientId");
  const selectedCategories = parseMulti("categoryId");
  const dateType = params.get("dateType") ?? "createdAt";
  const dateFrom = params.get("dateFrom") ?? "";
  const dateTo = params.get("dateTo") ?? "";

  const hasFilters = [
    "status", "priority", "assigneeId", "clientId", "categoryId", "q", "dateFrom", "dateTo",
  ].some((k) => params.get(k));

  const statusOptions = STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }));
  const priorityOptions = PRIORITY_ORDER.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }));
  const assigneeOptions = employees.map((e) => ({ value: e.id, label: e.name }));
  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }));
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative min-w-48 flex-1">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search title…"
          className="pl-8"
        />
      </div>

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

      <DateFilter
        dateType={dateType}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onChangeType={(v) => setDateParam(v, dateFrom, dateTo)}
        onChangeFrom={(v) => setDateParam(dateType, v, dateTo)}
        onChangeTo={(v) => setDateParam(dateType, dateFrom, v)}
        onClear={clearDates}
      />

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setDraft("");
            router.push(pathname);
          }}
        >
          <X className="size-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
