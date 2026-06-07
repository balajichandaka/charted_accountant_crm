"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
const ALL = "__all__";

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

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === ALL) next.delete(key);
    else next.set(key, value);
    router.push(`${pathname}?${next.toString()}`);
  }

  const hasFilters = ["status", "assigneeId", "clientId", "categoryId", "priority", "q"].some(
    (k) => params.get(k)
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-48 flex-1">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          defaultValue={params.get("q") ?? ""}
          placeholder="Search title…"
          className="pl-8"
          onKeyDown={(e) => {
            if (e.key === "Enter") setParam("q", (e.target as HTMLInputElement).value);
          }}
        />
      </div>

      <Select
        value={params.get("status") ?? ALL}
        onValueChange={(v) => setParam("status", v)}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={params.get("priority") ?? ALL}
        onValueChange={(v) => setParam("priority", v)}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All priority</SelectItem>
          {PRIORITY_ORDER.map((p) => (
            <SelectItem key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={params.get("assigneeId") ?? ALL}
        onValueChange={(v) => setParam("assigneeId", v)}
      >
        <SelectTrigger className="w-40">
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

      <Select
        value={params.get("clientId") ?? ALL}
        onValueChange={(v) => setParam("clientId", v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Client" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All clients</SelectItem>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={params.get("categoryId") ?? ALL}
        onValueChange={(v) => setParam("categoryId", v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(pathname)}
        >
          <X className="size-4" />
          Clear
        </Button>
      ) : null}
    </div>
  );
}
