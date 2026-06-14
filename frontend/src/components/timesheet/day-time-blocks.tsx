"use client";

import { TimeBlock } from "./time-block";
import { layoutDayEntries, type TimesheetEntry } from "./calendar-utils";

export function DayTimeBlocks({
  entries,
  dayDate,
  onEdit,
  readOnly,
}: {
  entries: TimesheetEntry[];
  dayDate: string;
  onEdit: (entry: TimesheetEntry) => void;
  readOnly?: boolean;
}) {
  const positioned = layoutDayEntries(entries);

  return (
    <>
      {positioned.map(({ entry, column, columnCount }) => (
        <TimeBlock
          key={entry.id}
          entry={entry}
          dayDate={dayDate}
          column={column}
          columnCount={columnCount}
          onEdit={onEdit}
          readOnly={readOnly}
        />
      ))}
    </>
  );
}
