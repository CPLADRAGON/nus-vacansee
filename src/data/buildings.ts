// Best-effort building coordinates for NUS venues, keyed by the building prefix
// of a venue code (the part before the first "-" or "_"). Sourced from public
// map knowledge of the Kent Ridge campus (and Bukit Timah for Law). These are
// building-level approximations, not field-verified survey points. Venues whose
// building isn't listed fall back to their faculty cluster centroid.
export interface BuildingCoord {
  lat: number;
  lng: number;
  name: string;
}

export const BUILDINGS: Record<string, BuildingCoord> = {
  // Computing
  COM1: { lat: 1.2945, lng: 103.774, name: "COM1 — School of Computing" },
  COM2: { lat: 1.294, lng: 103.7745, name: "COM2 — School of Computing" },
  COM3: { lat: 1.2951, lng: 103.774, name: "COM3 — School of Computing" },
  COM4: { lat: 1.2954, lng: 103.7736, name: "COM4 — School of Computing" },

  // FASS (Arts & Social Sciences)
  AS1: { lat: 1.2949, lng: 103.7716, name: "AS1 — FASS" },
  AS2: { lat: 1.2946, lng: 103.7713, name: "AS2 — FASS" },
  AS3: { lat: 1.2943, lng: 103.771, name: "AS3 — FASS" },
  AS4: { lat: 1.2947, lng: 103.7707, name: "AS4 — FASS" },
  AS5: { lat: 1.2951, lng: 103.771, name: "AS5 — FASS" },
  AS6: { lat: 1.2945, lng: 103.772, name: "AS6 — FASS" },
  AS7: { lat: 1.2953, lng: 103.7713, name: "AS7 — FASS / Shaw Foundation" },
  AS8: { lat: 1.295, lng: 103.7705, name: "AS8 — FASS" },
  HSS: { lat: 1.294, lng: 103.7717, name: "HSS — Hon Sui Sen / FASS" },

  // Business
  BIZ1: { lat: 1.2934, lng: 103.7748, name: "BIZ1 — Biz School" },
  BIZ2: { lat: 1.293, lng: 103.7751, name: "BIZ2 — Mochtar Riady Building" },
  MRB: { lat: 1.293, lng: 103.7751, name: "Mochtar Riady Building" },

  // Engineering
  E1: { lat: 1.3004, lng: 103.7708, name: "E1 — Engineering" },
  EA: { lat: 1.3007, lng: 103.7716, name: "EA — Engineering" },
  E2: { lat: 1.3, lng: 103.7714, name: "E2 — Engineering" },
  E2A: { lat: 1.3002, lng: 103.7718, name: "E2A — Engineering" },
  E3: { lat: 1.2998, lng: 103.7704, name: "E3 — Engineering" },
  E3A: { lat: 1.2996, lng: 103.7701, name: "E3A — Engineering" },
  E4: { lat: 1.3008, lng: 103.7701, name: "E4 — Engineering" },
  E4A: { lat: 1.301, lng: 103.7699, name: "E4A — Engineering" },
  E5: { lat: 1.3012, lng: 103.7705, name: "E5 — Engineering" },
  E6: { lat: 1.2995, lng: 103.7717, name: "E6 — Engineering" },
  E7: { lat: 1.2993, lng: 103.7721, name: "E7 — Engineering" },
  ERC: { lat: 1.3015, lng: 103.7712, name: "ERC — Engineering" },
  EC: { lat: 1.3018, lng: 103.771, name: "EC — Engineering" },

  // Science
  S1A: { lat: 1.2966, lng: 103.7805, name: "S1A — Science" },
  S11: { lat: 1.2972, lng: 103.7808, name: "S11 — Science" },
  S12: { lat: 1.2974, lng: 103.781, name: "S12 — Science" },
  S16: { lat: 1.2976, lng: 103.7806, name: "S16 — Science" },
  S17: { lat: 1.2978, lng: 103.7804, name: "S17 — Science" },

  // Design & Environment
  SDE1: { lat: 1.2972, lng: 103.7702, name: "SDE1 — Design & Environment" },
  SDE2: { lat: 1.297, lng: 103.7699, name: "SDE2 — Design & Environment" },
  SDE3: { lat: 1.2968, lng: 103.7696, name: "SDE3 — Design & Environment" },
  SDE4: { lat: 1.2974, lng: 103.77, name: "SDE4 — Design & Environment" },

  // Medicine (Yong Loo Lin)
  MD1: { lat: 1.2925, lng: 103.7813, name: "MD1 — Medicine" },
  MD3: { lat: 1.292, lng: 103.7818, name: "MD3 — Medicine" },
  MD6: { lat: 1.2918, lng: 103.7822, name: "MD6 — Centre for Translational Medicine" },

  // University Town
  UTSRC: { lat: 1.3048, lng: 103.7723, name: "UTown — Stephen Riady Centre" },
  YSTCM: { lat: 1.303, lng: 103.7717, name: "Yong Siew Toh Conservatory of Music" },
  CAPT: { lat: 1.3062, lng: 103.7725, name: "CAPT — College of Alice & Peter Tan" },
  RC1: { lat: 1.3055, lng: 103.772, name: "UTown Residential College" },
  RC2: { lat: 1.3058, lng: 103.7722, name: "UTown Residential College" },
  RC3: { lat: 1.306, lng: 103.7728, name: "UTown Residential College" },
  ERC1: { lat: 1.3046, lng: 103.7726, name: "UTown — Educational Resource Centre" },

  // Law (Bukit Timah campus — far from Kent Ridge)
  LAW: { lat: 1.319, lng: 103.8168, name: "NUS Law — Bukit Timah Campus" },
};
