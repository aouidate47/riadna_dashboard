"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, LocateFixed, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface Coordinates {
  lat: number;
  lng: number;
}

const DEFAULT_CENTER: Coordinates = { lat: 31.6295, lng: -7.9811 };

export function LocationPickerDialog({
  open,
  onOpenChange,
  latitude,
  longitude,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  latitude?: number;
  longitude?: number;
  onSave: (coords: Coordinates) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        {open ? (
          <LocationPicker
            key={`${latitude ?? "new"}-${longitude ?? "new"}`}
            latitude={latitude}
            longitude={longitude}
            onSave={onSave}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function LocationPicker({
  latitude,
  longitude,
  onSave,
  onCancel,
}: {
  latitude?: number;
  longitude?: number;
  onSave: (coords: Coordinates) => Promise<void>;
  onCancel: () => void;
}) {
  const [coords, setCoords] = useState<Coordinates>(() => ({
    lat: latitude ?? DEFAULT_CENTER.lat,
    lng: longitude ?? DEFAULT_CENTER.lng,
  }));
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;
    let marker: Marker | null = null;

    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapContainerRef.current) return;

      const start = {
        lat: latitude ?? DEFAULT_CENTER.lat,
        lng: longitude ?? DEFAULT_CENTER.lng,
      };
      map = L.map(mapContainerRef.current, { zoomControl: true }).setView(
        [start.lat, start.lng],
        latitude != null && longitude != null ? 16 : 13,
      );

      if (cancelled) {
        map.remove();
        return;
      }

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: '<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:#0f172a;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);transform:rotate(-45deg)"></div>',
        iconSize: [26, 26],
        iconAnchor: [13, 26],
      });

      marker = L.marker([start.lat, start.lng], { draggable: true, icon }).addTo(map);
      marker.on("dragend", () => {
        const point = marker?.getLatLng();
        if (point) setCoords({ lat: point.lat, lng: point.lng });
      });

      map.on("click", (event) => {
        const point = event.latlng;
        marker?.setLatLng(point);
        setCoords({ lat: point.lat, lng: point.lng });
      });

      mapRef.current = map;
      markerRef.current = marker;
      window.setTimeout(() => {
        if (!cancelled) map?.invalidateSize();
      }, 100);
    })();

    return () => {
      cancelled = true;
      marker?.remove();
      map?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [latitude, longitude]);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;

    setSearching(true);
    setError(null);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) throw new Error("Search is unavailable right now.");
      const results = (await response.json()) as { lat: string; lon: string }[];
      if (!results.length) throw new Error("No matching place found. Try a more specific address.");

      const next = { lat: Number(results[0].lat), lng: Number(results[0].lon) };
      setCoords(next);
      mapRef.current?.setView([next.lat, next.lng], 17);
      markerRef.current?.setLatLng([next.lat, next.lng]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not search for that place.");
    } finally {
      setSearching(false);
    }
  }

  function locate() {
    if (!navigator.geolocation) {
      return setError("Geolocation is not supported by this browser.");
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCoords(next);
        mapRef.current?.setView([next.lat, next.lng], 17);
        markerRef.current?.setLatLng([next.lat, next.lng]);
        setLocating(false);
      },
      () => {
        setError("Could not get your current location. Check browser permissions.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await onSave(coords);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the location.");
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Pick the exact location</DialogTitle>
        <DialogDescription>
          Search for the riad, then click the map or drag the pin to the exact entrance. Guests
          will use this pin for directions.
        </DialogDescription>
      </DialogHeader>

      {error ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor="location-search" className="sr-only">
            Search for an address
          </Label>
          <Input
            id="location-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search an address or landmark, e.g. Jemaa el-Fna"
          />
        </div>
        <Button type="submit" variant="outline" disabled={searching || !query.trim()}>
          {searching ? <Loader2 className="animate-spin" /> : <Search />}
          Search
        </Button>
      </form>

      <div
        ref={mapContainerRef}
        className="h-[55vh] min-h-[320px] w-full overflow-hidden rounded-md border border-border bg-muted"
        aria-label="Map to choose the riad location"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs tabular-nums text-muted-foreground">
          {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={locate} disabled={locating}>
          {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />}
          Use my location
        </Button>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <MapPin />}
          Save location
        </Button>
      </DialogFooter>
    </div>
  );
}
