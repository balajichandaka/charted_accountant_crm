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

const ALL = "__all__";
const fmt = (d: Date) => format(d, "yyyy-MM-dd");

// Presets resolve to a concrete {from,to} window relative to today.
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

export function AnalyticsFilters({
  employees,
  from,
  to,
  today,
}: {
  employees: { id: string; name: string }[];
  from: string;
  to: string;
  /** yyyy-MM-dd — passed from the server so the default window matches the API. */
  today: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const presets = presetRanges(new Date(today));
  // Which preset (if any) matches the active window — otherwise "custom".
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

  function onPreset(value: string) {
    if (value === "custom") {
      pushParams({ from, to });
      return;
    }
    pushParams(presets[value]);
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Select value={activePreset} onValueChange={onPreset}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(PRESET_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">From</Label>
        <Input
          type="date"
          value={from}
          max={to || today}
          onChange={(e) => e.target.value && pushParams({ from: e.target.value })}
          className="w-40"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">To</Label>
        <Input
          type="date"
          value={to}
          max={today}
          onChange={(e) => e.target.value && pushParams({ to: e.target.value })}
          className="w-40"
        />
      </div>

      <Select
        value={params.get("assigneeId") ?? ALL}
        onValueChange={(v) => pushParams({ assigneeId: v })}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All assignees</SelectItem>
          {employees.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
