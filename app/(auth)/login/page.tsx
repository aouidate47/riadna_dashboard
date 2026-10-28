"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { getDemoAccounts } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Set to true to also show the demo box in production (e.g. a Netlify demo deploy). */
const SHOW_DEMO_ACCOUNTS = process.env.NODE_ENV !== "production";
const demoAccounts = SHOW_DEMO_ACCOUNTS ? getDemoAccounts() : [];

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
    <main className="grid h-dvh overflow-hidden lg:grid-cols-[1.05fr_1fr]">
      <section className="brand-gradient relative hidden h-full overflow-hidden text-white lg:block">
        {/* soft light from the top-left, and a dark fade at the bottom so the white text stays readable */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_15%,rgba(255,255,255,0.2),transparent)]"
        />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-black/55 to-transparent" />

        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <Image src="/riadna-logo.png" alt="" width={500} height={500} priority className="h-20 w-auto shrink-0" />
            <span className="font-display text-2xl font-semibold">Riadna</span>
          </div>
          <div className="max-w-md">
            <h2 className="font-display text-4xl font-semibold leading-tight">
              Rooms, arrivals and bookings for your riad, all in one place.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/90">
              See who arrives today, which rooms are free tonight, and what the month is bringing in.
            </p>
          </div>
        </div>
      </section>

      <section className="no-scrollbar flex h-full overflow-y-auto px-6 py-6">
        <div className="m-auto w-full max-w-sm">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <Image src="/riadna-logo.png" alt="" width={500} height={500} className="h-12 w-auto shrink-0" />
            <span className="font-display text-xl font-semibold text-foreground">Riadna</span>
          </div>

          <h1 className="font-display text-3xl font-semibold text-[#ff914d]">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">Use the account for your riad.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@yourriad.ma"
                required
                className="border-foreground/20"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!error}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Your password"
                  required
                  className="border-foreground/20 pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!error}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={!email || !password} aria-busy={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {loading ? "Signing in" : "Sign in"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() =>
                  setResetHint("Password resets are managed by your Riadna administrator.")
                }
                className="text-sm font-medium text-primary hover:underline"
              >
                Forgot password?
              </button>
              {resetHint ? (
                <p role="status" className="mt-1 text-xs text-muted-foreground">
                  {resetHint}
                </p>
              ) : null}
            </div>
          </form>

          {demoAccounts.length > 0 && (
            <div className="mt-6 rounded-md border border-dashed border-foreground/25 p-4">
              <h2 className="text-sm font-medium">Demo accounts</h2>
              <p className="mt-1 text-xs text-muted-foreground">Select one to fill the form.</p>
              <ul className="mt-2 grid grid-cols-2 gap-1">
                {demoAccounts.map((a) => (
                  <li key={a.email}>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(a.email);
                        setPassword(a.password);
                        setError(null);
                      }}
                      className="flex h-full w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      <span className="flex w-full items-center justify-between gap-1.5">
                        <span className="truncate font-medium">{a.riadName}</span>
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {a.role === "OWNER" ? "Owner" : "Staff"}
                        </span>
                      </span>
                      <span className="block w-full truncate text-xs text-muted-foreground">{a.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}