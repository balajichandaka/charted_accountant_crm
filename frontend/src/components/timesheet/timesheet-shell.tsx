"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  format,
  startOfWeek,
  endOfWeek,
  subDays,
  addDays,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type TimesheetEntry,
  type TicketOption,
  dayKey,
} from "./calendar-utils";
import { CalendarWeekView, weekTotals } from "./calendar-week-view";
import { CalendarDayView } from "./calendar-day-view";
import { TeamHoursGrid, type TeamRow } from "./team-hours-grid";
import { TimesheetDatePicker } from "./timesheet-date-picker";

export function TimesheetShell({
  entries,
  from,
  to,
  today,
  tickets,
  userId,
  role,
  teamEmployees,
  initialTab,
  view,
  dayDate,
}: {
  entries: TimesheetEntry[];
  from: string;
  to: string;
  today: string;
  tickets: TicketOption[];
  userId: string;
  role: "CA" | "MANAGER" | "EMPLOYEE";
  teamEmployees: TeamRow[];
  initialTab: "mine" | "team";
  view: "week" | "day";
  dayDate: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showTeam = role === "CA" || role === "MANAGER";
  const totals = weekTotals(entries);

  function pushParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined) params.delete(k);
      else params.set(k, v);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function goWeek(anchor: Date) {
    const f = startOfWeek(anchor, { weekStartsOn: 1 });
    const t = endOfWeek(anchor, { weekStartsOn: 1 });
    pushParams({ from: dayKey(f), to: dayKey(t), view: "week", date: undefined });
  }

  const rangeLabel = `${format(new Date(from), "dd MMM")} – ${format(new Date(to), "dd MMM yyyy")}`;
  const isCurrentWeek = from === dayKey(startOfWeek(new Date(today), { weekStartsOn: 1 }));

  const calendarHeader = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            view === "day"
              ? pushParams({ date: dayKey(subDays(new Date(dayDate), 1)) })
              : goWeek(subDays(new Date(from), 7))
          }
          title="Previous"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            view === "day"
              ? pushParams({ date: today })
              : goWeek(new Date())
          }
          disabled={view === "day" ? dayDate === today : isCurrentWeek}
        >
          {view === "day" ? "Today" : "This week"}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            view === "day"
              ? pushParams({ date: dayKey(addDays(new Date(dayDate), 1)) })
              : goWeek(addDays(new Date(from), 7))
          }
          title="Next"
        >
          <ChevronRight className="size-4" />
        </Button>
        <TimesheetDatePicker
          label={view === "day" ? format(new Date(dayDate), "dd MMM yyyy") : rangeLabel}
          value={view === "day" ? new Date(dayDate) : new Date(from)}
          today={today}
          highlightWeek={view === "week"}
          onSelect={(d) => {
            if (view === "day") {
              pushParams({ date: dayKey(d) });
            } else {
              goWeek(d);
            }
          }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-4 text-sm">
          <span>
            <span className="text-muted-foreground">Total </span>
            <span className="font-semibold tabular">{totals.fmtTotal}</span>
          </span>
          <span>
            <span className="text-muted-foreground">Billable </span>
            <span className="font-semibold tabular">{totals.fmtBillable}</span>
          </span>
        </div>
        <div className="flex rounded-md border p-0.5">
          <Button
            variant={view === "week" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-3"
            onClick={() => pushParams({ view: "week", date: undefined })}
          >
            Week
          </Button>
          <Button
            variant={view === "day" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-3"
            onClick={() => pushParams({ view: "day", date: dayDate || today })}
          >
            Day
          </Button>
        </div>
      </div>
    </div>
  );

  if (!showTeam) {
    return (
      <div className="space-y-4">
        {calendarHeader}
        {view === "day" ? (
          <CalendarDayView entries={entries} date={dayDate} today={today} tickets={tickets} />
        ) : (
          <CalendarWeekView entries={entries} from={from} to={to} today={today} tickets={tickets} />
        )}
      </div>
    );
  }

  return (
    <Tabs
      value={initialTab}
      onValueChange={(v) => pushParams({ tab: v })}
      className="space-y-4"
    >
      <TabsList>
        <TabsTrigger value="mine">My Calendar</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
      </TabsList>
      <TabsContent value="mine" className="space-y-4">
        {calendarHeader}
        {view === "day" ? (
          <CalendarDayView entries={entries} date={dayDate} today={today} tickets={tickets} />
        ) : (
          <CalendarWeekView entries={entries} from={from} to={to} today={today} tickets={tickets} />
        )}
      </TabsContent>
      <TabsContent value="team">
        <TeamHoursGrid
          employees={teamEmployees}
          from={from}
          to={to}
          today={today}
          currentUserId={userId}
        />
      </TabsContent>
    </Tabs>
  );
}
