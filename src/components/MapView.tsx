"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import { useEffect } from "react";
import type { VenueEntry } from "@/types";
import type { OccupancyStatus } from "@/types";

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
    <div className="overflow-hidden rounded-2xl border border-zinc-200/70" style={{ height: "65vh" }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={16}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
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

        {pins.map((r) => (
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
            eventHandlers={{ click: () => onSelect(r.code, r.entry) }}
          >
            <Tooltip direction="top">
              <span className="font-mono font-semibold">{r.code}</span>
              {r.entry.roomName ? ` · ${r.entry.roomName}` : ""}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
