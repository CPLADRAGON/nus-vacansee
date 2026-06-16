"use client";

import { useMemo } from "react";
import type { VenueEntry, CalendarEntry } from "@/types";
import { computeOccupancy, formatTime } from "@/lib/occupancy-engine";
import { getCurrentWeek } from "@/lib/calendar";
import StatusBadge from "./StatusBadge";
import WeekGrid from "./WeekGrid";

interface Props {
  venue: string;
  entry: VenueEntry;
  now: Date;
  semester: CalendarEntry | null;
  onClose: () => void;
}

export default function VenueDetail({ venue, entry, now, semester, onClose }: Props) {
  const occupancy = useMemo(
    () => computeOccupancy(entry, now, semester),
    [entry, now, semester]
  );

  const currentWeek = semester ? getCurrentWeek(semester.start) : null;

  return (
    <div
      className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto p-5"
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
        <div className="mb-2">
          <StatusBadge info={occupancy} />
        </div>
        {occupancy.status === "vacant" && occupancy.nextClass && (
          <p className="mb-4 text-sm text-zinc-500">
            Next class: {occupancy.nextClass.module} at{" "}
            {formatTime(occupancy.nextClass.start)}
          </p>
        )}
        {occupancy.status !== "vacant" && occupancy.until && (
          <p className="mb-4 text-sm text-zinc-500">
            {occupancy.currentModule} · ends {formatTime(occupancy.until)}
          </p>
        )}

        {/* Weekly timetable */}
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Weekly Timetable
          </h3>
          {semester ? (
            <span className="rounded-full bg-nus-blue/10 px-2 py-0.5 text-[10px] font-medium text-nus-blue">
              Week {currentWeek}
            </span>
          ) : (
            <span className="text-[10px] text-amber-600">Between semesters</span>
          )}
        </div>
        <p className="mb-3 text-[11px] text-zinc-400">
          Blue = booked · empty = free. Tap a class for details.
        </p>

        <WeekGrid entry={entry} now={now} semester={semester} />
      </div>
    </div>
  );
}
