"use client";

import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  Popup,
  useMap,
} from "react-leaflet";
import { useEffect } from "react";
import type { VenueEntry, OccupancyStatus } from "@/types";
import { getDestination, mapsUrl } from "@/lib/directions";

export interface MapRoom {
  code: string;
  entry: VenueEntry;
  status: OccupancyStatus;
}

interface Props {
  rooms: MapRoom[];
  userLoc: { lat: number; lng: number } | null;
  onSelect: (code: string, entry: VenueEntry) => void;
}

const NUS_CENTER = { lat: 1.2966, lng: 103.7764 };

const STATUS_COLOR: Record<OccupancyStatus, string> = {
  vacant: "#10B981",
  occupied: "#EF4444",
  crunch: "#F59E0B",
};

const STATUS_LABEL: Record<OccupancyStatus, string> = {
  vacant: "Free now",
  occupied: "Occupied",
  crunch: "Busy",
};

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export default function MapView({ rooms, userLoc, onSelect }: Props) {
  const center = userLoc ?? NUS_CENTER;
  const pins = rooms.filter(
    (r) => typeof r.entry.lat === "number" && typeof r.entry.lng === "number"
  );

  return (
    <div
      className="isolate overflow-hidden rounded-2xl border border-zinc-200/70"
      style={{ height: "65vh" }}
    >
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={17}
        maxZoom={19}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.onemap.gov.sg/">OneMap</a> &copy; Singapore Land Authority'
          url="https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {userLoc && <Recenter lat={userLoc.lat} lng={userLoc.lng} />}

        {userLoc && (
          <CircleMarker
            center={[userLoc.lat, userLoc.lng]}
            radius={8}
            pathOptions={{
              color: "#FFFFFF",
              weight: 3,
              fillColor: "#003D7C",
              fillOpacity: 1,
            }}
          >
            <Tooltip direction="top">You are here</Tooltip>
          </CircleMarker>
        )}

        {pins.map((r) => {
          const dest = getDestination(r.code, r.entry);
          return (
            <CircleMarker
              key={r.code}
              center={[r.entry.lat as number, r.entry.lng as number]}
              radius={7}
              pathOptions={{
                color: "#FFFFFF",
                weight: 1.5,
                fillColor: STATUS_COLOR[r.status],
                fillOpacity: 0.95,
              }}
            >
              <Tooltip direction="top">
                <span className="font-mono text-[10px] font-semibold">{r.code}</span>
              </Tooltip>
              <Popup>
                <div className="min-w-[150px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-nus-blue">
                      {r.code}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                      style={{ backgroundColor: STATUS_COLOR[r.status] }}
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                  </div>
                  {r.entry.roomName && (
                    <p className="mt-0.5 text-xs text-zinc-600">
                      {r.entry.roomName}
                      {r.entry.floor != null ? ` · L${r.entry.floor}` : ""}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => onSelect(r.code, r.entry)}
                      className="rounded bg-nus-blue px-2.5 py-1 text-xs font-medium text-white"
                    >
                      View details
                    </button>
                    <a
                      href={mapsUrl(dest)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded border border-nus-blue/40 px-2.5 py-1 text-xs font-medium text-nus-blue"
                    >
                      Directions
                    </a>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
