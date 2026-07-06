"use client";

export type ReportStatus = "free" | "occupied" | "locked";

export interface Report {
  status: ReportStatus;
  ts: number;
}

export type ReportsMap = Record<string, Report[]>;

export interface FetchReportsResult {
  reports: ReportsMap;
  // False when the backing Blob store hasn't been connected in the Vercel
  // dashboard yet (see ROADMAP.md S2.4) or the request failed outright.
  // Lets the UI show an honest "not available yet" state instead of
  // interactive-looking buttons that would silently fail on every tap.
  available: boolean;
}

const COOLDOWN_KEY_PREFIX = "vacansee_report_cooldown_";
const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes per venue, per browser

// Fetch all venues' recent (< 30 min old) community reports in one call.
// Small, edge-cached; safe to call once per venue-detail open.
export async function fetchReports(): Promise<FetchReportsResult> {
  try {
    const res = await fetch("/api/reports", { cache: "no-store" });
    if (!res.ok) return { reports: {}, available: false };
    const data = (await res.json()) as {
      reports?: ReportsMap;
      blobConfigured?: boolean;
    };
    return {
      reports: data.reports ?? {},
      available: Boolean(data.blobConfigured),
    };
  } catch {
    return { reports: {}, available: false };
  }
}

// Submit a one-tap "is this room actually free?" report for a venue.
export async function submitReport(
  venue: string,
  status: ReportStatus
): Promise<boolean> {
  try {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venue, status }),
    });
    if (res.ok) setCooldown(venue);
    return res.ok;
  } catch {
    return false;
  }
}

// Lightweight, client-only anti-spam deterrent (not a security control): once
// a report is submitted for a venue, disable the buttons for that venue in
// this browser for a short cooldown window.
function setCooldown(venue: string): void {
  try {
    localStorage.setItem(COOLDOWN_KEY_PREFIX + venue, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function isOnCooldown(venue: string): boolean {
  try {
    const raw = localStorage.getItem(COOLDOWN_KEY_PREFIX + venue);
    if (!raw) return false;
    return Date.now() - parseInt(raw, 10) < COOLDOWN_MS;
  } catch {
    return false;
  }
}

// Most-recent report summary for a venue, for a compact "N students reported
// X Y min ago" line. Returns null if there are no fresh reports.
export function summarizeReports(
  reports: Report[] | undefined
): { status: ReportStatus; count: number; latestTs: number } | null {
  if (!reports || reports.length === 0) return null;
  const latest = reports[reports.length - 1];
  const matching = reports.filter((r) => r.status === latest.status);
  return { status: latest.status, count: matching.length, latestTs: latest.ts };
}
