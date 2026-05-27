#!/usr/bin/env python3
"""NUSMods venue timetable parser.

Downloads the NUSMods module feed for the current academic year,
flattens timetable entries by venue, and outputs a compressed JSON
matrix for client-side occupancy computation.

Usage:
    python scripts/parse_nusmods.py
    python scripts/parse_nusmods.py --year 2026-2027
    python scripts/parse_nusmods.py --output ../public/venues_timetable.json
"""

import argparse
import concurrent.futures
import json
import os
import sys
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import date as Date, datetime, timedelta, timezone

API_BASE = "https://api.nusmods.com/v2"
# NUS academic years start in August. If month >= Aug we are in the "start"
# calendar year; otherwise we are in the "end" calendar year.
ACADEMIC_YEAR_START_MONTH = 8
DEFAULT_OUTPUT = "public/venues_timetable.json"

# Parallel fetch settings
FETCH_WORKERS = 16
PER_MODULE_TIMEOUT = 15  # seconds

# Cluster mapping: ordered most-specific first so the first prefix match wins.
CLUSTER_RULES = [
    ("COM", "Computing"),
    ("E1A", "Engineering"),
    ("E1", "Engineering"),
    ("E2", "Engineering"),
    ("E3", "Engineering"),
    ("E4", "Engineering"),
    ("EA", "Engineering"),
    ("EW", "Engineering"),
    ("ERC", "Engineering"),
    ("AS1", "FASS"),
    ("AS2", "FASS"),
    ("AS3", "FASS"),
    ("AS4", "FASS"),
    ("AS5", "FASS"),
    ("AS6", "FASS"),
    ("AS7", "FASS"),
    ("AS8", "FASS"),
    ("UT", "UTown"),
    ("BIZ", "Business"),
    ("SDE", "Design & Environment"),
    ("MD1", "Medicine"),
    ("MD6", "Medicine"),
    ("LAW", "Law"),
    ("MCH", "Music"),
    ("LT", "Lecture Theatre"),
]

SKIP_VENUE_PREFIXES = ("E-LEARN_", "ONLINE", "TBA", "_")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Parse NUSMods API data into a compressed venue timetable JSON."
    )
    parser.add_argument(
        "--year",
        help="Academic year (e.g. '2025-2026'). Auto-detected from current date.",
    )
    parser.add_argument(
        "--output",
        default=DEFAULT_OUTPUT,
        help=f"Output path (default: {DEFAULT_OUTPUT})",
    )
    return parser.parse_args()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def compute_academic_year(today: Date) -> int:
    """Return the start year of the current NUS academic year."""
    if today.month >= ACADEMIC_YEAR_START_MONTH:
        return today.year
    return today.year - 1


def nth_weekday_of_month(year: int, month: int, weekday: int, n: int) -> Date:
    """Return the *n*-th *weekday* (0=Mon .. 6=Sun) in *month*."""
    first = Date(year, month, 1)
    days_until = (weekday - first.weekday()) % 7
    return first + timedelta(days=days_until + 7 * (n - 1))


def compute_calendar(acad_year_start: int) -> dict:
    """Build semester start/end dates for the academic year.

    Sem 1 starts on the 2nd Monday of August; Sem 2 on the 2nd Monday of
    January.  Each semester lasts 17 weeks by convention.
    """
    end_year = acad_year_start + 1
    s1 = nth_weekday_of_month(acad_year_start, 8, 0, 2)
    s2 = nth_weekday_of_month(end_year, 1, 0, 2)
    return {
        1: {
            "start": s1.isoformat(),
            "end": (s1 + timedelta(weeks=17) - timedelta(days=1)).isoformat(),
        },
        2: {
            "start": s2.isoformat(),
            "end": (s2 + timedelta(weeks=17) - timedelta(days=1)).isoformat(),
        },
    }


def fetch_json(url: str, label: str = ""):
    """Fetch and parse JSON from *url*.  Exit on failure."""
    sys.stderr.write(f"  Fetching {label or url} ...\n")
    try:
        with urllib.request.urlopen(url, timeout=PER_MODULE_TIMEOUT) as resp:
            data = resp.read()
    except urllib.error.HTTPError as e:
        sys.stderr.write(f"    HTTP {e.code} — skipped\n")
        return None
    except urllib.error.URLError as e:
        sys.stderr.write(f"    Network error: {e.reason} — skipped\n")
        return None
    except OSError as e:
        sys.stderr.write(f"    {e} — skipped\n")
        return None
    sys.stderr.write(f"    Received {len(data) / 1024:.0f} KB\n")
    return json.loads(data.decode("utf-8"))


def infer_cluster(venue: str) -> str:
    """Map a venue code to its faculty cluster via prefix rules."""
    v = venue.upper().strip()
    for prefix, cluster in CLUSTER_RULES:
        if v.startswith(prefix):
            return cluster
    return "Other"


def should_skip_venue(venue: str) -> bool:
    """Return True if this venue should be excluded from the matrix."""
    v = venue.strip().upper()
    if not v:
        return True
    for prefix in SKIP_VENUE_PREFIXES:
        if v.startswith(prefix):
            return True
    return False


# ---------------------------------------------------------------------------
# Module fetching and processing
# ---------------------------------------------------------------------------

def fetch_module(module_code: str, base_url: str) -> dict | None:
    """Fetch a single module JSON and extract its timetable data."""
    url = f"{base_url}/modules/{module_code}.json"
    data = fetch_json(url, module_code)
    if data is None:
        return None
    return data


def process_timetable(module_data: dict, stats: dict) -> list[dict]:
    """Extract venue timetable slots from a module's semesterData."""
    slots: list[dict] = []
    module_code = module_data.get("moduleCode", "")
    sem_data = module_data.get("semesterData", [])

    for sem_entry in sem_data:
        semester = sem_entry.get("semester")
        if semester not in (1, 2):
            continue

        for entry in sem_entry.get("timetable", []):
            stats["entries_total"] += 1
            venue = (entry.get("venue") or "").strip()

            if should_skip_venue(venue):
                if not venue:
                    stats["skipped_no_venue"] += 1
                else:
                    stats["skipped_virtual"] += 1
                continue

            day = (entry.get("day") or "").strip()
            start_time = (entry.get("startTime") or "").strip()
            end_time = (entry.get("endTime") or "").strip()
            weeks = entry.get("weeks", [])

            if not day or not start_time or not end_time or not weeks:
                continue

            clean_weeks = sorted(set(w for w in weeks if isinstance(w, int)))
            if not clean_weeks:
                continue

            slots.append({
                "venue": venue,
                "day": day,
                "start": start_time,
                "end": end_time,
                "module": module_code,
                "semester": semester,
                "weeks": clean_weeks,
            })
            stats["entries_added"] += 1

    return slots


def build_venue_matrix(all_slots: list[dict]) -> dict:
    """Aggregate timetable slots into a venue-keyed dictionary."""
    venue_entries: dict[str, dict[str, list[dict]]] = defaultdict(lambda: defaultdict(list))

    for slot in all_slots:
        venue = slot.pop("venue")
        day = slot.pop("day")
        venue_entries[venue][day].append(slot)

    output: dict[str, dict] = {}
    for venue, by_day in venue_entries.items():
        entry: dict = {"cluster": infer_cluster(venue)}
        for day, slots in by_day.items():
            slots.sort(key=lambda s: s["start"])
            entry[day] = slots
        output[venue] = entry

    return output


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    args = parse_args()
    today = Date.today()

    # Resolve academic year -----------------------------------------------
    if args.year:
        try:
            parts = args.year.split("-")
            acad_year_start = int(parts[0])
        except (ValueError, IndexError):
            sys.stderr.write(f"Invalid year: {args.year!r}.  Use YYYY-YYYY (e.g. 2025-2026).\n")
            sys.exit(1)
    else:
        acad_year_start = compute_academic_year(today)

    acad_year = f"{acad_year_start}-{acad_year_start + 1}"
    sys.stderr.write(f"Target academic year: {acad_year}\n")

    base_url = f"{API_BASE}/{acad_year}"
    calendar = compute_calendar(acad_year_start)

    # Fetch module list (lightweight index) --------------------------------
    module_list = fetch_json(f"{base_url}/moduleList.json", "module list")
    if module_list is None:
        sys.exit(1)

    module_codes = [
        m["moduleCode"]
        for m in module_list
        if isinstance(m, dict) and m.get("moduleCode")
        and any(s in (1, 2) for s in m.get("semesters", []))
    ]

    total_to_fetch = len(module_codes)
    sys.stderr.write(f"Modules with Sem 1/2 data: {total_to_fetch}\n")

    # Fetch individual module files in parallel ---------------------------
    all_slots: list[dict] = []
    stats = {"entries_total": 0, "skipped_no_venue": 0, "skipped_virtual": 0, "entries_added": 0}

    sys.stderr.write(f"Fetching module data ({FETCH_WORKERS} workers)...\n")

    with concurrent.futures.ThreadPoolExecutor(max_workers=FETCH_WORKERS) as pool:
        fut_map = {
            pool.submit(fetch_module, code, base_url): code
            for code in module_codes
        }
        done = 0
        for fut in concurrent.futures.as_completed(fut_map):
            code = fut_map[fut]
            done += 1
            try:
                module_data = fut.result()
            except Exception as exc:
                sys.stderr.write(f"    {code} raised {exc}\n")
                continue

            if module_data is None:
                continue

            slots = process_timetable(module_data, stats)
            all_slots.extend(slots)

            if done % 500 == 0 or done == total_to_fetch:
                sys.stderr.write(f"  Progress: {done}/{total_to_fetch} modules processed\n")

    sys.stderr.write(f"  Done. {done}/{total_to_fetch} modules fetched.\n")

    # Build venue matrix --------------------------------------------------
    sys.stderr.write("Assembling venue matrix...\n")
    venues = build_venue_matrix(all_slots)

    # Assemble final output -----------------------------------------------
    output: dict = {
        "_meta": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "academic_year": acad_year,
            "venue_count": len(venues),
            "module_count": len(module_codes),
        },
        "_calendar": {acad_year: calendar},
    }
    output.update(venues)

    out_path = args.output
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    file_size = os.path.getsize(out_path)
    sys.stderr.write(
        f"\nDone — {file_size / 1024:.1f} KB written to {out_path}\n"
        f"  Modules fetched:           {done}\n"
        f"  Timetable entries total:   {stats['entries_total']}\n"
        f"  Entries added to matrix:   {stats['entries_added']}\n"
        f"  Skipped (no venue):        {stats['skipped_no_venue']}\n"
        f"  Skipped (E-Learn/Online):  {stats['skipped_virtual']}\n"
        f"  Unique venues in output:   {len(venues)}\n"
    )


if __name__ == "__main__":
    main()
