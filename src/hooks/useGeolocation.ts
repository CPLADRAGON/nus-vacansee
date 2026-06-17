"use client";

import { useState, useCallback } from "react";

export type GeoErrorCode =
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported"
  | "insecure"
  | null;

interface GeoState {
  lat: number | null;
  lng: number | null;
  loading: boolean;
  error: string | null;
  errorCode: GeoErrorCode;
}

const MESSAGES: Record<Exclude<GeoErrorCode, null>, string> = {
  denied: "Location is blocked — allow it for this app, then retry.",
  unavailable: "Couldn't determine your location right now.",
  timeout: "Locating timed out — please retry.",
  unsupported: "Your browser doesn't support location.",
  insecure: "Location needs a secure (HTTPS) connection.",
};

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    lat: null,
    lng: null,
    loading: false,
    error: null,
    errorCode: null,
  });

  const setError = useCallback((code: Exclude<GeoErrorCode, null>) => {
    setState((s) => ({
      ...s,
      loading: false,
      error: MESSAGES[code],
      errorCode: code,
    }));
  }, []);

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setError("unsupported");
      return;
    }
    // Geolocation requires a secure context (HTTPS or localhost).
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      setError("insecure");
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null, errorCode: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          loading: false,
          error: null,
          errorCode: null,
        });
      },
      (err) => {
        const code: Exclude<GeoErrorCode, null> =
          err.code === err.PERMISSION_DENIED
            ? "denied"
            : err.code === err.TIMEOUT
              ? "timeout"
              : "unavailable";
        setError(code);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
  }, [setError]);

  return { ...state, requestLocation };
}
