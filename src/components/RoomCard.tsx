"use client";

import { useMemo } from "react";
import type { VenueEntry, CalendarEntry } from "@/types";
import { computeOccupancy, formatTime, formatDuration } from "@/lib/occupancy-engine";
import StatusBadge from "./StatusBadge";

interface Props {
  venue: string;
  entry: VenueEntry;
  now: Date;
  semester: CalendarEntry | null;
  onSelect: (venue: string, entry: VenueEntry) => void;
}

const ACCENT: Record<string, string> = {
  vacant: "before:bg-status-vacant",
  occupied: "before:bg-status-occupied",
  crunch: "before:bg-status-crunch",
};

export default function RoomCard({ venue, entry, now, semester, onSelect }: Props) {
  const occupancy = useMemo(
    () => computeOccupancy(entry, now, semester),
    [entry, now, semester]
  );

  const isOccupied = occupancy.status === "occupied" || occupancy.status === "crunch";

  return (
    <button
      onClick={() => onSelect(venue, entry)}
      className={`glass relative w-full overflow-hidden p-4 text-left transition-transform duration-200 hover:scale-[1.02] hover:shadow-md cursor-pointer before:absolute before:inset-y-0 before:left-0 before:w-1 ${ACCENT[occupancy.status]}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="font-mono text-xl font-bold tracking-tight text-nus-blue">
          {venue}
        </span>
        <span className="whitespace-nowrap rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-500">
          {entry.cluster}
        </span>
      </div>

      {(entry.type || entry.capacity) && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {entry.type && (
            <span className="rounded-full bg-nus-blue/10 px-2 py-0.5 text-[11px] font-medium text-nus-blue">
              {entry.type}
            </span>
          )}
          {entry.capacity ? (
            <span className="text-[11px] text-zinc-400">~{entry.capacity} seats</span>
          ) : null}
        </div>
      )}

      <div className="mb-2">
        <StatusBadge info={occupancy} />
      </div>

      {isOccupied && (
        <p className="text-sm text-zinc-700">
          <span className="font-medium">{occupancy.currentModule}</span>
          {occupancy.until && (
            <span className="text-zinc-400"> · ends {formatTime(occupancy.until)}</span>
          )}
        </p>
      )}

      {occupancy.status === "vacant" && occupancy.freeMinutes != null && (
        <p className="text-sm text-emerald-700">
          Free for{" "}
          <span className="font-semibold">
            {formatDuration(occupancy.freeMinutes)}
          </span>
          {occupancy.nextClass && (
            <span className="text-zinc-400">
              {" "}
              · next {occupancy.nextClass.module} at{" "}
              {formatTime(occupancy.nextClass.start)}
            </span>
          )}
        </p>
      )}
    </button>
  );
}
