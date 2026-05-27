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
