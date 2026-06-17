"use client";

import { useMemo } from "react";
import type { VenueEntry, CalendarEntry } from "@/types";
import { computeOccupancy, formatTime } from "@/lib/occupancy-engine";
import { getCurrentWeek } from "@/lib/calendar";
import { getDestination, mapsUrl } from "@/lib/directions";
import StatusBadge from "./StatusBadge";
import WeekGrid from "./WeekGrid";

interface Props {
  venue: string;
  entry: VenueEntry;
  now: Date;
  semester: CalendarEntry | null;
  isFavorite?: boolean;
  onToggleFavorite?: (venue: string) => void;
  onClose: () => void;
}

export default function VenueDetail({
  venue,
  entry,
  now,
  semester,
  isFavorite,
  onToggleFavorite,
  onClose,
}: Props) {
  const occupancy = useMemo(
    () => computeOccupancy(entry, now, semester),
    [entry, now, semester]
  );

  const currentWeek = semester ? getCurrentWeek(semester.start) : null;
  const dest = getDestination(venue, entry);

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
            {entry.roomName && (
              <p className="text-sm text-zinc-600">{entry.roomName}</p>
            )}
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-400">
              <span>{entry.cluster}</span>
              {entry.type && (
                <>
                  <span className="text-zinc-300">·</span>
                  <span className="font-medium text-nus-blue">{entry.type}</span>
                </>
              )}
              {entry.capacity ? (
                <>
                  <span className="text-zinc-300">·</span>
                  <span>~{entry.capacity} seats</span>
                </>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(venue)}
                aria-label={isFavorite ? "Remove from saved" : "Save room"}
                aria-pressed={isFavorite}
                className="rounded-full p-1 transition-transform active:scale-90"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill={isFavorite ? "#EF7C00" : "none"}
                  stroke={isFavorite ? "#EF7C00" : "#A1A1AA"}
                  strokeWidth="2"
                  strokeLinejoin="round"
                >
                  <path d="M12 17.3l-5.4 3.1 1.4-6.1-4.7-4.1 6.2-.5L12 4l2.5 5.7 6.2.5-4.7 4.1 1.4 6.1z" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
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

        {/* Directions */}
        <div className="mb-4 flex items-center gap-2">
          <a
            href={mapsUrl(dest)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-nus-blue px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-nus-blue/90 active:scale-[0.98]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 21s-7-6.5-7-11a7 7 0 1114 0c0 4.5-7 11-7 11z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" />
            </svg>
            Directions
          </a>
          <span className="text-xs text-zinc-400">{dest.label}</span>
        </div>

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
