"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";

interface Props {
  lat: number;
  lng: number;
  label?: string;
}

// Read-only location preview. The marker has no click handler, so it cannot
// re-open the venue detail (avoids a detail -> map -> detail loop).
export default function VenueMiniMap({ lat, lng, label }: Props) {
  return (
    <div
      className="isolate overflow-hidden rounded-lg border border-zinc-200/70"
      style={{ height: 200 }}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={18}
        maxZoom={19}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.onemap.gov.sg/">OneMap</a> &copy; Singapore Land Authority'
          url="https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <CircleMarker
          center={[lat, lng]}
          radius={9}
          pathOptions={{
            color: "#FFFFFF",
            weight: 2,
            fillColor: "#003D7C",
            fillOpacity: 1,
          }}
        >
          {label && (
            <Tooltip permanent direction="top">
              {label}
            </Tooltip>
          )}
        </CircleMarker>
      </MapContainer>
    </div>
  );
}
