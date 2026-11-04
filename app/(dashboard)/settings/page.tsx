"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MapPin,
  Save,
  ShieldCheck,
  X,
} from "lucide-react";
import { AuthGuard } from "@/components/providers/auth-guard";
import { useAuth } from "@/components/providers/auth-provider";
import {
  LocationPickerDialog,
  type Coordinates,
} from "@/components/settings/location-picker-dialog";
import { RiadHeroImageField } from "@/components/settings/riad-hero-image-field";
import { RiadLogoField } from "@/components/settings/riad-logo-field";
import { TeamSection } from "@/components/settings/team-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentRiad, updateRiad } from "@/lib/api";
import type { Riad } from "@/types";

/** Every value is a primitive so "dirty" is a plain comparison. Highlights are one per line. */
interface RiadForm {
  name: string;
  address: string;
  city: string;
  phone: string;
  whatsapp: string;
  checkInTime: string;
  checkOutTime: string;
  latitude?: number;
  longitude?: number;
  about: string;
  tagline: string;
  highlights: string;
  cancellationPolicy: string;
  touristTax: number;
  isPublished: boolean;
}
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_HIGHLIGHTS = 6;

const toForm = (riad: Riad): RiadForm => ({
  name: riad.name,
  address: riad.address,
  city: riad.city ?? "",
  phone: riad.phone,
  whatsapp: riad.whatsapp ?? "",
  checkInTime: riad.checkInTime,
  checkOutTime: riad.checkOutTime,
  latitude: riad.latitude,
  longitude: riad.longitude,
  about: riad.about ?? "",
  tagline: riad.tagline ?? "",
  highlights: (riad.highlights ?? []).join("\n"),
  cancellationPolicy: riad.cancellationPolicy ?? "",
  touristTax: riad.touristTaxPerAdultPerNight ?? 0,
  isPublished: riad.isPublished ?? false,
});

export default function Page() {
  return (
    <AuthGuard roles={["OWNER"]}>
      <SettingsContent />
    </AuthGuard>
  );
}

function SettingsContent() {
  const { user, refreshRiad } = useAuth();
  const [current, setCurrent] = useState<Riad | null>(null);
  const [form, setForm] = useState<RiadForm | null>(null);
  const [baseline, setBaseline] = useState<RiadForm | null>(null);
  const [dataReady, setDataReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCurrentRiad()
      .then((riad) => {
        if (cancelled) return;
        const next = toForm(riad);
        setCurrent(riad);
        setForm(next);
        setBaseline(next);
        setError(null);
        setLoading(false);
        setDataReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load the settings.");
        setLoading(false);
        setDataReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const dirty =
    !!form &&
    !!baseline &&
    (Object.keys(form) as (keyof RiadForm)[]).some((key) => form[key] !== baseline[key]);

  function update<K extends keyof RiadForm>(key: K, value: RiadForm[K]) {
    setForm((currentForm) => (currentForm ? { ...currentForm, [key]: value } : currentForm));
  }

  function retry() {
    setLoading(true);
    setError(null);
    setRefreshKey((key) => key + 1);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setError(null);
    setNotice(null);

    const name = form.name.trim();
    const whatsapp = form.whatsapp.replace(/[\s+()-]/g, "");
    const highlights = form.highlights
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!name) return setError("Enter the riad name.");
    if (!TIME_PATTERN.test(form.checkInTime)) return setError("Enter a valid check-in time.");
    if (!TIME_PATTERN.test(form.checkOutTime)) return setError("Enter a valid check-out time.");
    if (whatsapp && !/^\d{8,15}$/.test(whatsapp)) {
      return setError("Enter the WhatsApp number with its country code, e.g. 212600000000.");
    }
    if (highlights.length > MAX_HIGHLIGHTS) return setError(`Keep it to ${MAX_HIGHLIGHTS} highlights.`);
    if (highlights.some((line) => line.length > 60)) return setError("Each highlight must be 60 characters or fewer.");
    if (!Number.isInteger(form.touristTax) || form.touristTax < 0) {
      return setError("The tourist tax must be a whole number of MAD.");
    }
    if (form.isPublished && !whatsapp) {
      return setError("Add a WhatsApp number before publishing: guests use it to contact you.");
    }

    setSaving(true);
    try {
      // The pin is saved by the map dialog, so it isn't sent here.
      const updated = await updateRiad({
        name,
        address: form.address.trim(),
        city: form.city.trim(),
        phone: form.phone.trim(),
        whatsapp,
        checkInTime: form.checkInTime,
        checkOutTime: form.checkOutTime,
        about: form.about.trim(),
        tagline: form.tagline.trim(),
        highlights,
        cancellationPolicy: form.cancellationPolicy.trim(),
        touristTaxPerAdultPerNight: form.touristTax,
        isPublished: form.isPublished,
      });
      const saved = toForm(updated);
      setCurrent(updated);
      setForm(saved);
      setBaseline(saved);
      await refreshRiad();
      setNotice("Riad details saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the settings.");
    } finally {
      setSaving(false);
    }
  }

  async function saveLocation(next: Coordinates) {
    const updated = await updateRiad({ latitude: next.lat, longitude: next.lng });
    setCurrent(updated);
    setForm((currentForm) =>
      currentForm
        ? { ...currentForm, latitude: updated.latitude, longitude: updated.longitude }
        : currentForm,
    );
    setBaseline((currentBaseline) =>
      currentBaseline
        ? { ...currentBaseline, latitude: updated.latitude, longitude: updated.longitude }
        : currentBaseline,
    );
    setError(null);
    setNotice("Riad location saved.");
    setMapOpen(false);
    await refreshRiad().catch(() => undefined);
  }

  function handleImageChanged(updated: Riad, message: string) {
    setCurrent(updated);
    setError(null);
    setNotice(message);
    refreshRiad().catch(() => undefined);
  }


  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Riad settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your property details, check-in times and team access.
        </p>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span className="flex-1">{error}</span>
          {!form ? (
            <button type="button" onClick={retry} className="font-medium underline">
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {notice ? (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          <CheckCircle2 className="size-4 shrink-0" />
          <span className="flex-1">{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message">
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      {!dataReady || loading ? (
        <SettingsSkeleton />
      ) : !form || !current ? (
        <div className="rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center">
          <AlertCircle className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Settings are unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">Try loading the page again.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={retry}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
          <section className="rounded-lg border border-border bg-card shadow-sm">
            <header className="flex items-center gap-3 border-b border-border px-5 py-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Building2 className="size-[18px]" />
              </span>
              <div>
                <h3 className="font-display text-base font-semibold">Riad profile</h3>
                <p className="text-xs text-muted-foreground">
                  Shown across the dashboard and on guest communications.
                </p>
              </div>
            </header>

            <form onSubmit={submit} noValidate className="grid gap-5 p-5">
              <RiadLogoField riad={current} onChanged={handleImageChanged} onError={setError} />

              <div className="grid gap-2">
                <Label htmlFor="settings-name">Riad name</Label>
                <Input
                  id="settings-name"
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="grid gap-2">
                  <Label htmlFor="settings-address">Address</Label>
                  <Textarea
                    id="settings-address"
                    value={form.address}
                    onChange={(event) => update("address", event.target.value)}
                    maxLength={300}
                    rows={2}
                  />
                </div>
                <div className="grid content-start gap-2">
                  <Label htmlFor="settings-city">City</Label>
                  <Input
                    id="settings-city"
                    value={form.city}
                    onChange={(event) => update("city", event.target.value)}
                    placeholder="Marrakech"
                    maxLength={80}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Exact location</Label>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMapOpen(true)}
                  >
                    <MapPin />
                    {form.latitude != null && form.longitude != null
                      ? "Change location"
                      : "Pick on map"}
                  </Button>
                  {form.latitude != null && form.longitude != null ? (
                    <>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                      </span>
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${form.latitude}&mlon=${form.longitude}#map=17/${form.latitude}/${form.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <ExternalLink className="size-3" />
                        View map
                      </a>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">No exact pin yet.</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Guests will use this pin for directions.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="settings-phone">Phone</Label>
                  <Input
                    id="settings-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) => update("phone", event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="settings-whatsapp">WhatsApp</Label>
                  <Input
                    id="settings-whatsapp"
                    type="tel"
                    inputMode="numeric"
                    value={form.whatsapp}
                    onChange={(event) => update("whatsapp", event.target.value)}
                    placeholder="212600000000"
                  />
                  <p className="text-xs text-muted-foreground">With the country code. Guests message you here.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="settings-check-in">Check-in time</Label>
                  <Input
                    id="settings-check-in"
                    type="time"
                    value={form.checkInTime}
                    onChange={(event) => update("checkInTime", event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="settings-check-out">Check-out time</Label>
                  <Input
                    id="settings-check-out"
                    type="time"
                    value={form.checkOutTime}
                    onChange={(event) => update("checkOutTime", event.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="settings-tourist-tax">Tourist tax (MAD)</Label>
                  <Input
                    id="settings-tourist-tax"
                    type="number"
                    min={0}
                    step={1}
                    value={form.touristTax}
                    onChange={(event) => update("touristTax", Number(event.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Per adult per night. Children are exempt.</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="settings-slug">Booking site address</Label>
                  <Input id="settings-slug" value={current.slug} disabled />
                  <p className="text-xs text-muted-foreground">Contact support to change this.</p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="settings-cancellation">Cancellation policy</Label>
                <Textarea
                  id="settings-cancellation"
                  value={form.cancellationPolicy}
                  onChange={(event) => update("cancellationPolicy", event.target.value)}
                  placeholder="Free cancellation up to 7 days before arrival…"
                  maxLength={2000}
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">Guests agree to this before booking.</p>
              </div>

              <div className="grid gap-5 border-t border-border pt-5">
                <div>
                  <h4 className="text-sm font-semibold">Booking site</h4>
                  <p className="text-xs text-muted-foreground">What guests see on your landing page.</p>
                </div>

                <RiadHeroImageField riad={current} onChanged={handleImageChanged} onError={setError} />

                <div className="grid gap-2">
                  <Label htmlFor="settings-tagline">Tagline</Label>
                  <Input
                    id="settings-tagline"
                    value={form.tagline}
                    onChange={(event) => update("tagline", event.target.value)}
                    placeholder="A quiet courtyard in the heart of the medina"
                    maxLength={160}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="settings-about-the-riad">About the riad</Label>
                  <Textarea
                    id="settings-about-the-riad"
                    value={form.about}
                    onChange={(event) => update("about", event.target.value)}
                    maxLength={5000}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="settings-highlights">Highlights</Label>
                  <Textarea
                    id="settings-highlights"
                    value={form.highlights}
                    onChange={(event) => update("highlights", event.target.value)}
                    placeholder={"Pool courtyard\nRooftop breakfast\n5 min from Jemaa el-Fna"}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">One per line, up to {MAX_HIGHLIGHTS}.</p>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-muted/20 px-3 py-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(event) => update("isPublished", event.target.checked)}
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <span>
                    <span className="block font-medium">Published on the booking site</span>
                    <span className="block text-xs text-muted-foreground">
                      When off, guests can&apos;t find or book the riad online.
                    </span>
                  </span>
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">
                  {dirty ? "You have unsaved changes." : "All changes are saved."}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => baseline && setForm(baseline)}
                    disabled={!dirty || saving}
                  >
                    Reset
                  </Button>
                  <Button type="submit" size="sm" disabled={!dirty || saving}>
                    {saving ? <Loader2 className="animate-spin" /> : <Save />}
                    Save changes
                  </Button>
                </div>
              </div>
            </form>
          </section>

          <div className="space-y-5">
            <TeamSection
              currentUserId={user?.id}
              onNotice={(message) => {
                setError(null);
                setNotice(message);
              }}
              onError={(message) => {
                setNotice(null);
                setError(message);
              }}
            />

            <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <ShieldCheck className="size-[18px]" />
                </span>
                <h3 className="font-display text-base font-semibold">Permissions</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Only owners can open settings and view revenue figures. Staff can still manage
                bookings, rooms, blocked dates and guest records.
              </p>
              <dl className="mt-4 grid gap-3 border-t border-border pt-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Signed in as</dt>
                  <dd className="truncate font-medium">{user?.name ?? "Owner"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Role</dt>
                  <dd className="font-medium">Owner</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Workspace</dt>
                  <dd className="truncate font-medium">{current.slug}</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      )}

      <LocationPickerDialog
        open={mapOpen}
        onOpenChange={setMapOpen}
        latitude={form?.latitude}
        longitude={form?.longitude}
        onSave={saveLocation}
      />
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]" aria-busy="true" aria-label="Loading settings">
      <div className="h-[32rem] animate-pulse rounded-lg border border-border bg-card" />
      <div className="space-y-5">
        <div className="h-64 animate-pulse rounded-lg border border-border bg-card" />
        <div className="h-48 animate-pulse rounded-lg border border-border bg-card" />
      </div>
    </div>
  );
}
