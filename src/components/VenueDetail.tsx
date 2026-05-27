"use client";

import { useMemo } from "react";
import type { VenueEntry, CalendarEntry } from "@/types";
import { computeOccupancy, formatTime } from "@/lib/occupancy-engine";
import { getCurrentWeek } from "@/lib/calendar";
import StatusBadge from "./StatusBadge";

interface Props {
  venue: string;
  entry: VenueEntry;
  now: Date;
  semester: CalendarEntry | null;
  onClose: () => void;
}

const DAYS = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

export default function VenueDetail({ venue, entry, now, semester, onClose }: Props) {
  const occupancy = useMemo(
    () => computeOccupancy(entry, now, semester),
    [entry, now, semester]
  );

  const currentWeek = semester ? getCurrentWeek(semester.start) : null;
  const todayName = DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1];

  return (
    <div
      className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-mono text-2xl font-bold text-nus-blue">
              {venue}
            </h2>
            <span className="text-xs text-zinc-400">{entry.cluster}</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Current status */}
        <div className="mb-4">
          <StatusBadge info={occupancy} />
        </div>
        {occupancy.status === "vacant" && occupancy.nextClass && (
          <p className="mb-4 text-sm text-zinc-500">
            Next class: {occupancy.nextClass.module} at{" "}
            {formatTime(occupancy.nextClass.start)}
          </p>
        )}

        {/* Today's schedule */}
        <div className="mb-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {todayName} Schedule
          </h3>
          {semester ? (
            <TodaySchedule
              entry={entry}
              dayName={todayName}
              currentWeek={currentWeek}
              semester={semester.semester}
            />
          ) : (
            <p className="text-sm text-zinc-400">No active semester.</p>
          )}
        </div>

        {/* Full week toggle could go here */}
        <details className="group">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-600">
            Full Week
          </summary>
          <div className="mt-3 space-y-3">
            {DAYS.map((day) => {
              const slots = (entry as any)[day];
              if (!slots || slots.length === 0) return null;
              const filtered = semester
                ? slots.filter((s: any) => s.semester === semester.semester && s.weeks.includes(currentWeek))
                : [];
              if (filtered.length === 0) return null;
              return (
                <div key={day}>
                  <h4 className="mb-1 text-xs font-medium text-zinc-500">{day}</h4>
                  <div className="space-y-1">
                    {filtered.map((s: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded bg-white/50 px-3 py-1.5 text-xs"
                      >
                        <span className="font-mono text-zinc-600">
                          {formatTime(s.start)}–{formatTime(s.end)}
                        </span>
                        <span className="font-mono font-medium text-nus-blue">
                          {s.module}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      </div>
    </div>
  );
}

function TodaySchedule({
  entry,
  dayName,
  currentWeek,
  semester,
}: {
  entry: VenueEntry;
  dayName: string;
  currentWeek: number | null;
  semester: number;
}) {
  const allSlots = (entry as any)[dayName] as
    | { start: string; end: string; module: string; semester: number; weeks: number[] }[]
    | undefined;

  if (!allSlots || allSlots.length === 0) {
    return <p className="text-sm text-zinc-400">No classes scheduled.</p>;
  }

  // Show slots matching this semester and week
  const relevant = allSlots.filter(
    (s) => s.semester === semester && (currentWeek ? s.weeks.includes(currentWeek) : true)
  );

  if (relevant.length === 0) {
    return <p className="text-sm text-zinc-400">No classes this week.</p>;
  }

  // Also show "other semester" slots greyed out
  const other = allSlots.filter((s) => s.semester !== semester);
  const showOther = other.length > 0 && relevant.length > 0;

  return (
    <div className="space-y-1">
      {relevant.map((s, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded bg-nus-blue/5 px-3 py-1.5 text-xs"
        >
          <span className="font-mono text-zinc-600">
            {formatTime(s.start)}–{formatTime(s.end)}
          </span>
          <span className="font-mono font-medium text-nus-blue">{s.module}</span>
        </div>
      ))}
      {showOther && (
        <>
          <p className="pt-1 text-[10px] text-zinc-300">Other semester:</p>
          {other.slice(0, 3).map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded px-3 py-1 text-xs text-zinc-300"
            >
              <span className="font-mono">{formatTime(s.start)}–{formatTime(s.end)}</span>
              <span className="font-mono">{s.module}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
