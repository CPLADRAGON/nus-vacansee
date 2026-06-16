import { CLUSTERS, DEFAULT_LOCATION } from "@/data/clusters";

export function getClusterCoords(cluster: string) {
  const found = CLUSTERS.find(
    (c) => c.id.toLowerCase() === cluster.toLowerCase()
  );
  return found ?? DEFAULT_LOCATION;
}

export function findNearestCluster(lat: number, lng: number): string {
  let minDist = Infinity;
  let nearest = "Other";
  for (const c of CLUSTERS) {
    const d = Math.sqrt((c.lat - lat) ** 2 + (c.lng - lng) ** 2);
    if (d < minDist) {
      minDist = d;
      nearest = c.id;
    }
  }
  return nearest;
}

// Squared-ish planar distance from a coordinate to a cluster's centroid.
// Used only for relative ranking, so an exact great-circle distance is unneeded.
export function clusterDistance(
  clusterId: string,
  lat: number,
  lng: number
): number {
  const c = CLUSTERS.find((x) => x.id === clusterId);
  if (!c) return Infinity;
  return Math.sqrt((c.lat - lat) ** 2 + (c.lng - lng) ** 2);
}
