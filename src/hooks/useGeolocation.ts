"use client";

import { useState, useEffect, useCallback } from "react";

interface GeoState {
  lat: number | null;
  lng: number | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    lat: null,
    lng: null,
    loading: false,
    error: null,
  });

  const [manualCluster, setManualCluster] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("spacefinder_cluster");
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: "Geolocation not supported" }));
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          loading: false,
          error: null,
        });
      },
      (err) => {
        setState((s) => ({
          ...s,
          loading: false,
          error: err.message || "Location denied",
        }));
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, []);

  const setCluster = useCallback((cluster: string | null) => {
    setManualCluster(cluster);
    if (cluster) {
      localStorage.setItem("spacefinder_cluster", cluster);
    } else {
      localStorage.removeItem("spacefinder_cluster");
    }
  }, []);

  return { ...state, manualCluster, requestLocation, setCluster };
}
