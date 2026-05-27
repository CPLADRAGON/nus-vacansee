"use client";

import { useMemo } from "react";
import type { VenueEntry, CalendarEntry } from "@/types";
import { computeOccupancy, formatTime } from "@/lib/occupancy-engine";
import StatusBadge from "./StatusBadge";

interface Props {
  venue: string;
  entry: VenueEntry;
  now: Date;
  semester: CalendarEntry | null;
}

export default function RoomCard({ venue, entry, now, semester }: Props) {
  const occupancy = useMemo(
    () => computeOccupancy(entry, now, semester),
    [entry, now, semester]
  );

  const isOccupied = occupancy.status === "occupied" || occupancy.status === "crunch";

  return (
    <div className="glass p-4 transition-transform duration-200 hover:scale-[1.02]">
      <div className="mb-2 flex items-start justify-between">
        <span className="font-mono text-xl font-bold tracking-tight text-nus-blue">
          {venue}
        </span>
        <span className="whitespace-nowrap rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-500">
          {entry.cluster}
        </span>
      </div>

      <div className="mb-2">
        <StatusBadge info={occupancy} />
      </div>

      {isOccupied && occupancy.currentTitle && (
        <p className="text-sm text-zinc-700">
          <span className="font-medium">{occupancy.currentModule}</span>{" "}
          {occupancy.currentTitle}
          {occupancy.currentType && (
            <span className="ml-1 text-xs text-zinc-400">
              ({occupancy.currentType})
            </span>
          )}
        </p>
      )}

      {isOccupied && occupancy.until && (
        <p className="mt-0.5 text-xs text-zinc-400">
          Ends {formatTime(occupancy.until)}
        </p>
      )}

      {occupancy.status === "vacant" && occupancy.nextClass && (
        <p className="text-xs text-zinc-400">
          Next: {occupancy.nextClass.module} at{" "}
          {formatTime(occupancy.nextClass.start)}
        </p>
      )}

      {occupancy.status === "vacant" && !occupancy.nextClass && (
        <p className="text-xs text-zinc-300">Free rest of day</p>
      )}
    </div>
  );
}
