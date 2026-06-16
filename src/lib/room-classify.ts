export type RoomType =
  | "Lecture Theatre"
  | "Seminar Room"
  | "Tutorial Room"
  | "Lab"
  | "Classroom";

export const ROOM_TYPES: RoomType[] = [
  "Lecture Theatre",
  "Tutorial Room",
  "Lab",
  "Seminar Room",
  "Classroom",
];

// Hybrid room-type inference. Unambiguous venue-code rules take precedence;
// otherwise fall back to the dominant lessonType (with capacity as a tie-break).
export function classifyRoom(
  venue: string,
  lessonTypes: string[],
  capacity: number
): RoomType {
  const v = venue.toUpperCase();

  // 1. High-confidence code rules.
  if (v.includes("LAB")) return "Lab";
  if (v.startsWith("LT")) return "Lecture Theatre";
  if (v.startsWith("SR") || v.includes("SEMINAR")) return "Seminar Room";
  if (v.startsWith("TR") || v.includes("TUT")) return "Tutorial Room";

  // 2. Dominant lessonType fallback.
  const tally = new Map<string, number>();
  for (const lt of lessonTypes) {
    const key = lt.trim();
    if (!key) continue;
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  let dominant = "";
  let max = -1;
  for (const [lt, n] of tally) {
    if (n > max) {
      max = n;
      dominant = lt;
    }
  }

  switch (dominant) {
    case "Laboratory":
      return "Lab";
    case "Tutorial":
    case "Recitation":
      return "Tutorial Room";
    case "Seminar-Style Module Class":
      return "Seminar Room";
    case "Lecture":
    case "Sectional Teaching":
      return capacity >= 100 ? "Lecture Theatre" : "Classroom";
    default:
      // 3. Default.
      return capacity >= 100 ? "Lecture Theatre" : "Classroom";
  }
}
