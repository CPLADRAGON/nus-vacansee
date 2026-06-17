# Acknowledgements & Data Sources

NUS Vacansee is an independent, student-built project. It is **not affiliated
with, endorsed by, or operated by** the National University of Singapore.

## Data sources

### NUSMods
Room availability is derived from NUS class schedules, and venue coordinates /
room names come from NUSMods:

- **Venue availability:** `https://api.nusmods.com/v2/{acadYear}/semesters/{sem}/venueInformation.json`
  (NUSMods public API)
- **Venue locations / room names / floors:** `venues.json` from the
  [`nusmodifications/nusmods`](https://github.com/nusmodifications/nusmods) repository

NUSMods asks that its services be used responsibly. This app fetches the data at
most once per ~12 hours, caches it client-side, and ships a static fallback
snapshot, keeping request volume minimal.

NUSMods is distributed under the MIT License:

```
The MIT License (MIT)

Copyright (c) 2014 - Present, NUSModifications

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

A heartfelt thank-you to the NUSMods team and contributors for maintaining this
public resource for NUS students.

### OneMap (Singapore Land Authority)
Map tiles are served by [OneMap](https://www.onemap.gov.sg/), © Singapore Land
Authority, used with attribution as required by the OneMap terms of use.

### Other
- Map rendering: [Leaflet](https://leafletjs.com/) / react-leaflet.
- Framework: Next.js / React, deployed on Vercel.

## Disclaimer
Availability is computed from published class timetables and may not reflect
ad-hoc bookings, events, or closures. Always verify a room is genuinely free
before relying on it.
