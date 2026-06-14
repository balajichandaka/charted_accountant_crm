"use client";

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  startOfWeek,
  endOfWeek,
  isAfter,
  parseISO,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function TimesheetDatePicker({
  label,
  value,
  today,
  highlightWeek,
  onSelect,
}: {
  label: string;
  value: Date;
  today: string;
  /** Highlight the Mon–Sun week containing `value` (week view). */
  highlightWeek?: boolean;
  onSelect: (date: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value);
  const todayDate = parseISO(today);

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const weekStart = highlightWeek ? startOfWeek(value, { weekStartsOn: 1 }) : null;
  const weekEnd = highlightWeek ? endOfWeek(value, { weekStartsOn: 1 }) : null;

  function pick(d: Date) {
    if (isAfter(d, todayDate)) return;
    onSelect(d);
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setMonth(value);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-1 gap-1.5 font-normal tabular"
          title="Jump to date"
        >
          <CalendarDays className="size-4 shrink-0" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="mb-2 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setMonth(subMonths(month, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-semibold">{format(month, "MMMM yyyy")}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setMonth(addMonths(month, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-muted-foreground">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {days.map((d) => {
            const isFuture = isAfter(d, todayDate);
            const inWeek =
              highlightWeek && weekStart && weekEnd
                ? d >= weekStart && d <= weekEnd
                : false;
            const isSelected = highlightWeek ? inWeek : isSameDay(d, value);
            const isToday = isSameDay(d, todayDate);

            return (
              <button
                key={d.toISOString()}
                type="button"
                disabled={isFuture}
                onClick={() => pick(d)}
                className={cn(
                  "size-8 rounded-md text-xs tabular transition-colors",
                  !isSameMonth(d, month) && "text-muted-foreground/40",
                  isFuture && "cursor-not-allowed opacity-30",
                  !isFuture && !isSelected && "hover:bg-accent",
                  isToday && !isSelected && "font-semibold text-primary",
                  isSelected && "bg-primary text-primary-foreground font-semibold",
                  inWeek && !isSameDay(d, value) && highlightWeek && "bg-primary/10"
                )}
              >
                {format(d, "d")}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
