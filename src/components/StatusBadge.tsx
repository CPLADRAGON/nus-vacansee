"use client";

import type { OccupancyInfo } from "@/types";
import { formatTime } from "@/lib/occupancy-engine";

const STYLES: Record<string, string> = {
  vacant:
    "bg-emerald-50 text-emerald-700 border-emerald-200",
  occupied:
    "bg-red-50 text-red-700 border-red-200",
  crunch:
    "bg-amber-50 text-amber-700 border-amber-200",
};

const DOTS: Record<string, string> = {
  vacant: "bg-status-vacant",
  occupied: "bg-status-occupied",
  crunch: "bg-status-crunch",
};

export default function StatusBadge({ info }: { info: OccupancyInfo }) {
  const style = STYLES[info.status];
  const dot = DOTS[info.status];

  let label: string;
  if (info.status === "vacant" && info.nextClass) {
    label = `VACANT UNTIL ${formatTime(info.nextClass.start)}`;
  } else if (info.status === "vacant") {
    label = "VACANT";
  } else if (info.status === "crunch") {
    label = "CRUNCH HOUR";
  } else {
    label = `OCCUPIED (${info.currentModule ?? ""})`;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-medium ${style}`}
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
