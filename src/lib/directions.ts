import { BUILDINGS } from "@/data/buildings";
import { getClusterCoords } from "@/lib/cluster-map";

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

export function getDestination(venue: string, cluster: string): Destination {
  const key = buildingKey(venue);
  const b = BUILDINGS[key];
  if (b) {
    return { lat: b.lat, lng: b.lng, label: b.name, approx: false };
  }
  const c = getClusterCoords(cluster);
  return { lat: c.lat, lng: c.lng, label: `${cluster} (approx. area)`, approx: true };
}

// Universal Google Maps directions URL. Opens the Maps app on mobile and the
// web on desktop; the origin defaults to the user's current location.
export function mapsUrl(dest: { lat: number; lng: number }): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`;
}
