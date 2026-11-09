"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe2,
  Link2,
  Loader2,
  MapPin,
  Save,
  ShieldCheck,
  Sparkles,
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
import { cn } from "@/lib/utils";
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

  const hasPin = form?.latitude != null && form?.longitude != null;

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
    <div className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Riad settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your property details, stay rules and team access.
          </p>
        </div>
        {current ? (
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                form?.isPublished
                  ? "border-success/25 bg-success/10 text-success"
                  : "border-border bg-muted text-muted-foreground",
              )}
            >
              <Globe2 className="size-3.5" />
              {form?.isPublished ? "Published" : "Hidden"}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <Link2 className="size-3.5 shrink-0" />
              <span className="truncate">{current.slug}</span>
            </span>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{error}</span>
          {!form ? (
            <button type="button" onClick={retry} className="shrink-0 font-medium underline">
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {notice ? (
        <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss message"
            className="shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      {!dataReady || loading ? (
        <SettingsSkeleton />
      ) : !form || !current ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <AlertCircle className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Settings are unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">Try loading the page again.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={retry}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="grid items-start gap-5 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <form onSubmit={submit} noValidate className="min-w-0 space-y-5 sm:space-y-6">
            <SectionCard
              icon={<Building2 className="size-[18px]" />}
              title="Riad profile"
              description="Shown across the dashboard and on guest communications."
            >
              <RiadLogoField riad={current} onChanged={handleImageChanged} onError={setError} />

              <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <Field label="Riad name" htmlFor="settings-name">
                  <Input
                    id="settings-name"
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                  />
                </Field>
                <Field
                  label="Booking site address"
                  htmlFor="settings-slug"
                  hint="Contact support to change this."
                >
                  <Input id="settings-slug" value={current.slug} disabled />
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              icon={<MapPin className="size-[18px]" />}
              title="Location & contact"
              description="Where you are and how guests can reach you."
            >
              <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <Field label="Address" htmlFor="settings-address">
                  <Textarea
                    id="settings-address"
                    value={form.address}
                    onChange={(event) => update("address", event.target.value)}
                    maxLength={300}
                    rows={2}
                  />
                </Field>
                <Field label="City" htmlFor="settings-city">
                  <Input
                    id="settings-city"
                    value={form.city}
                    onChange={(event) => update("city", event.target.value)}
                    placeholder="Marrakech"
                    maxLength={80}
                  />
                </Field>
              </div>

              <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-muted/20 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-card text-muted-foreground shadow-sm">
                    <MapPin className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Exact location</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {hasPin
                        ? `${form.latitude!.toFixed(5)}, ${form.longitude!.toFixed(5)}`
                        : "No exact pin yet. Guests use it for directions."}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {hasPin ? (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${form.latitude}&mlon=${form.longitude}#map=17/${form.latitude}/${form.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      View map
                    </a>
                  ) : null}
                  <Button type="button" variant="outline" size="sm" onClick={() => setMapOpen(true)}>
                    <MapPin />
                    {hasPin ? "Change location" : "Pick on map"}
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone" htmlFor="settings-phone">
                  <Input
                    id="settings-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) => update("phone", event.target.value)}
                  />
                </Field>
                <Field
                  label="WhatsApp"
                  htmlFor="settings-whatsapp"
                  hint="With the country code. Guests message you here."
                >
                  <Input
                    id="settings-whatsapp"
                    type="tel"
                    inputMode="numeric"
                    value={form.whatsapp}
                    onChange={(event) => update("whatsapp", event.target.value)}
                    placeholder="212600000000"
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              icon={<Clock3 className="size-[18px]" />}
              title="Stay rules"
              description="Check-in times, taxes and cancellation terms."
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Check-in time" htmlFor="settings-check-in">
                  <Input
                    id="settings-check-in"
                    type="time"
                    value={form.checkInTime}
                    onChange={(event) => update("checkInTime", event.target.value)}
                  />
                </Field>
                <Field label="Check-out time" htmlFor="settings-check-out">
                  <Input
                    id="settings-check-out"
                    type="time"
                    value={form.checkOutTime}
                    onChange={(event) => update("checkOutTime", event.target.value)}
                  />
                </Field>
                <Field
                  label="Tourist tax (MAD)"
                  htmlFor="settings-tourist-tax"
                  hint="Per adult per night."
                >
                  <Input
                    id="settings-tourist-tax"
                    type="number"
                    min={0}
                    step={1}
                    value={form.touristTax}
                    onChange={(event) => update("touristTax", Number(event.target.value))}
                  />
                </Field>
              </div>

              <Field
                label="Cancellation policy"
                htmlFor="settings-cancellation"
                hint="Guests agree to this before booking."
              >
                <Textarea
                  id="settings-cancellation"
                  value={form.cancellationPolicy}
                  onChange={(event) => update("cancellationPolicy", event.target.value)}
                  placeholder="Free cancellation up to 7 days before arrival."
                  maxLength={2000}
                  rows={3}
                />
              </Field>
            </SectionCard>

            <SectionCard
              icon={<Sparkles className="size-[18px]" />}
              title="Booking site"
              description="What guests see on your landing page."
            >
              <RiadHeroImageField riad={current} onChanged={handleImageChanged} onError={setError} />

              <Field label="Tagline" htmlFor="settings-tagline">
                <Input
                  id="settings-tagline"
                  value={form.tagline}
                  onChange={(event) => update("tagline", event.target.value)}
                  placeholder="A quiet courtyard in the heart of the medina"
                  maxLength={160}
                />
              </Field>

              <Field label="About the riad" htmlFor="settings-about-the-riad">
                <Textarea
                  id="settings-about-the-riad"
                  value={form.about}
                  onChange={(event) => update("about", event.target.value)}
                  maxLength={5000}
                  className="min-h-[110px]"
                />
              </Field>

              <Field
                label="Highlights"
                htmlFor="settings-highlights"
                hint={`One per line, up to ${MAX_HIGHLIGHTS}.`}
              >
                <Textarea
                  id="settings-highlights"
                  value={form.highlights}
                  onChange={(event) => update("highlights", event.target.value)}
                  placeholder={"Pool courtyard\nRooftop breakfast\n5 min from Jemaa el-Fna"}
                  rows={3}
                />
              </Field>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm transition hover:bg-muted/40">
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
            </SectionCard>

            <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-elevated backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <p className={cn("text-xs", dirty ? "text-foreground" : "text-muted-foreground")}>
                {dirty ? "You have unsaved changes." : "All changes are saved."}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => baseline && setForm(baseline)}
                  disabled={!dirty || saving}
                >
                  Reset
                </Button>
                <Button type="submit" size="sm" className="flex-1 sm:flex-none" disabled={!dirty || saving}>
                  {saving ? <Loader2 className="animate-spin" /> : <Save />}
                  Save changes
                </Button>
              </div>
            </div>
          </form>

          <aside className="space-y-5 sm:space-y-6 xl:sticky xl:top-20 xl:self-start">
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

            <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <header className="flex items-start gap-3 border-b border-border/70 bg-muted/30 px-5 py-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="size-[18px]" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-base font-semibold leading-tight">Permissions</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Who can do what in this workspace.</p>
                </div>
              </header>
              <div className="space-y-4 p-5">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Only owners can open settings and view revenue figures. Staff can still manage
                  bookings, rooms, blocked dates and guest records.
                </p>
                <dl className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-muted/20">
                  <PermissionRow label="Signed in as" value={user?.name ?? "Owner"} />
                  <PermissionRow label="Role" value="Owner" />
                  <PermissionRow label="Workspace" value={current.slug} />
                </dl>
              </div>
            </section>
          </aside>
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

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <header className="flex items-start gap-3 border-b border-border/70 bg-muted/30 px-5 py-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold leading-tight">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </header>
      <div className="grid gap-5 p-5 sm:p-6">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function PermissionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate font-medium">{value}</dd>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div
      className="grid items-start gap-5 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]"
      aria-busy="true"
      aria-label="Loading settings"
    >
      <div className="space-y-5 sm:space-y-6">
        <div className="h-56 animate-pulse rounded-xl border border-border bg-card" />
        <div className="h-72 animate-pulse rounded-xl border border-border bg-card" />
        <div className="h-52 animate-pulse rounded-xl border border-border bg-card" />
      </div>
      <div className="space-y-5 sm:space-y-6">
        <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
        <div className="h-48 animate-pulse rounded-xl border border-border bg-card" />
      </div>
    </div>
  );
}
