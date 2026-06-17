import { BUILDINGS } from "@/data/buildings";
import { getClusterCoords } from "@/lib/cluster-map";
import type { VenueEntry } from "@/types";

export interface Destination {
  lat: number;
  lng: number;
  label: string;
  approx: boolean; // true when we fell back to the faculty cluster centroid
}

// Building key = the venue code up to the first "-" or "_", uppercased.
// e.g. "COM1-0210" -> "COM1", "LAW_SR5" -> "LAW", "LT17" -> "LT17".
export function buildingKey(venue: string): string {
  const m = venue.toUpperCase().match(/^[^-_]+/);
  return m ? m[0] : venue.toUpperCase();
}

// Resolution order: exact NUSMods venue coordinates -> curated building table
// -> faculty cluster centroid (flagged approximate).
export function getDestination(venue: string, entry: VenueEntry): Destination {
  if (typeof entry.lat === "number" && typeof entry.lng === "number") {
    const label = entry.roomName
      ? entry.floor != null
        ? `${entry.roomName} · L${entry.floor}`
        : entry.roomName
      : venue;
    return { lat: entry.lat, lng: entry.lng, label, approx: false };
  }

  const b = BUILDINGS[buildingKey(venue)];
  if (b) {
    return { lat: b.lat, lng: b.lng, label: b.name, approx: false };
  }

  const c = getClusterCoords(entry.cluster);
  return {
    lat: c.lat,
    lng: c.lng,
    label: `${entry.cluster} (approx. area)`,
    approx: true,
  };
}

// Universal Google Maps directions URL. Opens the Maps app on mobile and the
// web on desktop; the origin defaults to the user's current location.
export function mapsUrl(dest: { lat: number; lng: number }): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`;
}
