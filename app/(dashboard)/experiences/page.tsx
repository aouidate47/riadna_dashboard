"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  EyeOff,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { ExperienceDialog, PRICING_LABELS } from "@/components/experiences/experience-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getExperiences, reorderExperiences } from "@/lib/api";
import { formatMoney, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Experience } from "@/types";

type VisibilityFilter = "all" | "visible" | "hidden";

export default function Page() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialog, setDialog] = useState<{ experience: Experience | null } | null>(null);
  const [reordering, setReordering] = useState(false);
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");

  useEffect(() => {
    let cancelled = false;
    getExperiences()
      .then((data) => {
        if (cancelled) return;
        setExperiences(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load the experiences.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setDataReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const query = search.trim().toLowerCase();
  const isFiltered = Boolean(query) || visibility !== "all";
  const filtered = experiences.filter(
    (experience) =>
      (!query || `${experience.name} ${experience.description}`.toLowerCase().includes(query)) &&
      (visibility === "all" || (visibility === "visible") === experience.isActive),
  );
  const visibleCount = experiences.filter((experience) => experience.isActive).length;

  function refresh(message?: string) {
    setDialog(null);
    if (message) setNotice(message);
    setError(null);
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }

  /** Moves an experience one place earlier (-1) or later (+1) in the booking site's catalog. */
  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= experiences.length) return;

    const previous = experiences;
    const next = [...experiences];
    [next[index], next[target]] = [next[target], next[index]];
    setExperiences(next);
    setReordering(true);
    try {
      setExperiences(await reorderExperiences(next.map((experience) => experience.id)));
    } catch (err) {
      setExperiences(previous);
      setError(err instanceof Error ? err.message : "Could not change the order.");
    } finally {
      setReordering(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Experiences</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Extras guests can add to their stay on the booking site.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading}>
            <RefreshCw className={cn(loading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setDialog({ experience: null })} disabled={!dataReady}>
            <Plus />
            New experience
          </Button>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => refresh()} className="font-medium underline">
            Retry
          </button>
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

      {!dataReady ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading experiences">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-lg border border-border bg-card" />
          ))}
        </div>
      ) : experiences.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center">
          <Sparkles className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No experiences yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a hammam, a cooking class or an airport transfer for guests to book with their stay.
          </p>
          <Button size="sm" className="mt-4" onClick={() => setDialog({ experience: null })}>
            <Plus />
            New experience
          </Button>
        </div>
      ) : (
        <>
          <section className="rounded-lg border border-border bg-card p-3 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[minmax(15rem,1fr)_12rem_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search experiences…"
                  aria-label="Search experiences"
                  className="pl-9"
                />
              </div>
              <Select
                aria-label="Filter by visibility"
                value={visibility}
                onChange={(event) => setVisibility(event.target.value as VisibilityFilter)}
              >
                <option value="all">All experiences</option>
                <option value="visible">Visible on site</option>
                <option value="hidden">Hidden</option>
              </Select>
              <Button
                variant="ghost"
                className="h-10"
                disabled={!isFiltered}
                onClick={() => {
                  setSearch("");
                  setVisibility("all");
                }}
              >
                <X />
                Clear
              </Button>
            </div>
            <p className="mt-2 px-1 text-xs text-muted-foreground">
              {isFiltered
                ? `Showing ${filtered.length} of ${pluralize(experiences.length, "experience")}. Clear the filters to change the order.`
                : `${pluralize(visibleCount, "experience")} visible on the booking site. Use ↑ ↓ to set their order.`}
            </p>
          </section>

          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center">
              <Search className="mx-auto size-10 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No experiences match these filters</p>
            </div>
          ) : (
            <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3", loading && "opacity-60 transition-opacity")}>
              {filtered.map((experience) => {
                const index = experiences.indexOf(experience);
                return (
                  <article
                    key={experience.id}
                    className={cn(
                      "flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm",
                      !experience.isActive && "opacity-75",
                    )}
                  >
                    <div className="relative aspect-video bg-muted">
                      {experience.image ? (
                        <div
                          role="img"
                          aria-label={`${experience.name} image`}
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${JSON.stringify(experience.image)})` }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                          <Sparkles className="size-8" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate font-display text-base font-semibold">{experience.name}</h3>
                            <p className="text-sm font-medium">
                              {formatMoney(experience.price)}
                              <span className="font-normal text-muted-foreground"> {PRICING_LABELS[experience.pricing]}</span>
                            </p>
                          </div>
                        </div>
                        {!experience.isActive ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            <EyeOff className="size-3" />
                            Hidden
                          </span>
                        ) : null}
                      </div>
  
                      <p className="mt-3 line-clamp-3 flex-1 text-sm text-muted-foreground">
                        {experience.description || "No description yet."}
                      </p>
  
                      <div className="mt-4 flex items-center justify-end gap-1 border-t border-border pt-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground"
                          onClick={() => void move(index, -1)}
                          disabled={index === 0 || reordering || loading || isFiltered}
                          aria-label={`Move ${experience.name} earlier`}
                          title="Move earlier"
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground"
                          onClick={() => void move(index, 1)}
                          disabled={index === experiences.length - 1 || reordering || loading || isFiltered}
                          aria-label={`Move ${experience.name} later`}
                          title="Move later"
                        >
                          <ArrowDown />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setDialog({ experience })}>
                          <Pencil />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      <ExperienceDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        experience={dialog?.experience}
        onSaved={(saved) => refresh(dialog?.experience ? `${saved.name} updated.` : `${saved.name} added.`)}
        onDeleted={(deleted) => refresh(`${deleted.name} deleted.`)}
      />
    </div>
  );
}
