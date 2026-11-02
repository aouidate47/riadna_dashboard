"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { getDemoAccounts } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initials } from "@/lib/utils";

/** Set to true to also show the demo box in production (e.g. a Netlify demo deploy). */
const SHOW_DEMO_ACCOUNTS = false;
const demoAccounts = SHOW_DEMO_ACCOUNTS ? getDemoAccounts() : [];

const features = [
  { icon: CalendarDays, title: "Live availability" },
  { icon: Users, title: "Guest-ready" },
  { icon: ShieldCheck, title: "Private workspace" },
];

const stats = [
  { label: "Arrivals", value: "6" },
  { label: "Departures", value: "4" },
  { label: "Rooms", value: "8" },
];

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetHint, setResetHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  function fillDemoAccount(account: { email: string; password: string }) {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
    setResetHint(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <main className="h-dvh overflow-hidden bg-background lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* LEFT: brand panel (fixed, no scroll) */}
      <section className="relative hidden h-dvh overflow-hidden bg-sidebar text-white lg:block">
        <div className="absolute inset-0 brand-gradient" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_0%_0%,rgba(255,255,255,0.24),transparent_55%)]" />
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/15 to-transparent" />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div aria-hidden="true" className="absolute -left-24 top-16 size-72 rounded-full bg-white/20 blur-3xl" />
        <div aria-hidden="true" className="absolute -right-24 bottom-8 size-80 rounded-full bg-gold/20 blur-3xl" />
        <div aria-hidden="true" className="absolute -right-32 top-24 size-96 rounded-full border border-white/10" />
        <div aria-hidden="true" className="absolute -right-16 top-40 size-72 rounded-full border border-white/10" />

        <div className="relative flex h-full flex-col justify-between gap-6 p-10 xl:p-14">
          <div className="flex items-center gap-3">
            <Image
              src="/riadna-logo.png"
              alt="Riadna"
              width={500}
              height={500}
              priority
              className="h-16 w-auto shrink-0"
            />
            <span className="font-display text-2xl font-semibold">Riadna</span>
          </div>

          <div className="max-w-lg">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/85 backdrop-blur">
              <Sparkles className="size-3.5" />
              Riad operations, simplified
            </span>
            <h2 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-tight xl:text-5xl">
              Your riad,
              <br />
              running beautifully.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/80">
              One calm place for rooms, arrivals and the numbers that matter.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-2.5">
              {features.map(({ icon: Icon, title }) => (
                <div key={title} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <Icon className="size-4 text-white/75" />
                  <p className="mt-2 text-xs font-medium leading-snug">{title}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
                    Today at a glance
                  </p>
                  <p className="mt-1 font-display text-xl">A calm day ahead</p>
                </div>
                <span className="rounded-full bg-success/20 px-2.5 py-1 text-[11px] font-medium text-white">
                  82% occupied
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 divide-x divide-white/10">
                {stats.map(({ label, value }) => (
                  <div key={label} className="px-3 first:pl-0 last:pr-0">
                    <p className="font-display text-2xl font-semibold">{value}</p>
                    <p className="mt-0.5 text-[11px] text-white/60">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <p className="flex items-center gap-2 text-xs text-white/55">
              <ShieldCheck className="size-4" />
              Private workspace for your team
            </p>
          </div>
        </div>
      </section>

      {/* RIGHT: login (fixed, no scroll) */}
      <section className="relative flex h-dvh w-full min-w-0 flex-col overflow-hidden px-5 py-4 sm:px-8 lg:px-12 lg:py-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_100%_0%,rgba(255,145,77,0.14),transparent_60%)]"
        />

        {/* Card area: takes the free space and centers the card */}
        <div className="relative mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col justify-center">
          <div className="mb-3 flex items-center gap-2.5 lg:hidden">
            <Image
              src="/riadna-logo.png"
              alt="Riadna"
              width={500}
              height={500}
              className="h-9 w-auto shrink-0"
            />
            <div>
              <p className="font-display text-base font-semibold">Riadna</p>
              <p className="text-[11px] text-muted-foreground">Riad operations, simplified</p>
            </div>
          </div>

          <div className="min-w-0 rounded-lg border border-border/80 bg-card/95 p-5 shadow-elevated backdrop-blur sm:p-6">
            <div className="flex items-center justify-between gap-3 [@media(max-height:760px)]:hidden">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                <Sparkles className="size-3" />
                Riadna workspace
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <ShieldCheck className="size-3.5" />
                Secure
              </span>
            </div>

            <h1 className="mt-4 font-display text-[26px] font-semibold tracking-tight [@media(max-height:760px)]:mt-0 sm:text-3xl">
              Welcome back
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Sign in to manage your rooms, arrivals and bookings.
            </p>

            <form onSubmit={onSubmit} className="mt-4 min-w-0 space-y-3" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="you@yourriad.ma"
                    required
                    className="h-10 border-border/80 pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!error}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() =>
                      setResetHint("Password resets are managed by your Riadna administrator.")
                    }
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Your password"
                    required
                    className="h-10 border-border/80 pl-10 pr-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={!!error}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {resetHint ? (
                  <p role="status" className="text-xs text-muted-foreground">
                    {resetHint}
                  </p>
                ) : null}
              </div>

              {error ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <Button
                type="submit"
                size="lg"
                className="h-10 w-full"
                disabled={!email || !password || loading}
                aria-busy={loading}
              >
                {loading ? <Loader2 className="animate-spin" /> : null}
                <span>{loading ? "Signing in..." : "Sign in"}</span>
                {!loading ? <ArrowRight className="size-4" /> : null}
              </Button>

              <p className="text-center text-xs text-muted-foreground [@media(max-height:820px)]:hidden">
                Need help? Ask your riad administrator.
              </p>
            </form>

            {demoAccounts.length > 0 ? (
              <div className="mt-4 border-t border-border pt-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Demo access
                  </h2>
                  <span className="text-[11px] text-muted-foreground">Tap to fill</span>
                </div>

                <div className="mt-2 sm:hidden">
                  <select
                    aria-label="Choose a demo account"
                    value={email}
                    onChange={(e) => {
                      const account = demoAccounts.find((item) => item.email === e.target.value);
                      if (account) fillDemoAccount(account);
                    }}
                    className="h-10 w-full rounded-xl border border-border bg-background/60 px-3 text-xs font-medium text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                  >
                    <option value="">Choose a demo account…</option>
                    {demoAccounts.map((account) => (
                      <option key={account.email} value={account.email}>
                        {account.riadName} — {account.role === "OWNER" ? "Owner" : "Staff"}
                      </option>
                    ))}
                  </select>
                </div>

                <ul className="mt-2 hidden min-w-0 gap-2 sm:grid sm:grid-cols-2">
                  {demoAccounts.map((account) => (
                    <li key={account.email} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => fillDemoAccount(account)}
                        className="group flex h-full w-full min-w-0 items-center gap-2 rounded-xl border border-border bg-background/60 p-2 text-left transition hover:border-primary/35 hover:bg-primary/5"
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">
                          {initials(account.riadName)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1">
                            <span className="truncate text-xs font-semibold">
                              {account.riadName}
                            </span>
                            <span className="shrink-0 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                              {account.role === "OWNER" ? "Owner" : "Staff"}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                            {account.email}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground sm:text-xs">
            <LockKeyhole className="size-3.5" />
            Your workspace is private to your team.
          </p>
        </div>

        {/* Footer: pinned at the bottom, copyright left, credit right */}
        <footer className="relative flex shrink-0 items-center justify-between gap-3 pt-3 text-[11px] text-muted-foreground">
          <p>© 2026 Riadna. All rights reserved.</p>
          <a
            href="https://creaovo.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-gold hover:text-primary"
          >
            powered by creaovo
          </a>
        </footer>
      </section>
    </main>
  );
}