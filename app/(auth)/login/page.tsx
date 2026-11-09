"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/api";

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
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
    <main className="min-h-dvh bg-background lg:grid lg:h-dvh lg:grid-cols-2 lg:overflow-hidden">
      <section className="relative hidden h-dvh flex-col justify-between overflow-hidden bg-sidebar p-12 text-white lg:flex">
        <Image
          src="/riadna-mark-black.png"
          alt=""
          aria-hidden
          width={231}
          height={222}
          priority
          className="pointer-events-none absolute -bottom-24 -right-24 h-[min(80vh,640px)] w-auto select-none opacity-25"
        />

        <Image
          src="/riadna-logo-white.png"
          alt="Riadna"
          width={500}
          height={500}
          priority
          className="relative z-10 h-16 w-auto shrink-0 self-start"
        />

        <div className="relative z-10 max-w-sm">
          <h2 className="font-display text-4xl font-semibold leading-[1.15]">
            A calmer way to run your riad.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Rooms, arrivals, guests and bookings. All in one place.
          </p>
        </div>

        <p className="relative z-10 text-xs text-white/45">Morocco</p>
      </section>

      <section className="flex min-h-dvh flex-col px-5 py-6 sm:px-8 lg:h-dvh lg:px-16">
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-6">
          <div className="mb-8 lg:hidden">
            <Image
              src="/riadna-logo-black.png"
              alt="Riadna"
              width={500}
              height={500}
              className="h-14 w-auto"
            />
          </div>

          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Sign in</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your details to open your workspace.
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
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
                  className="h-11 pl-10"
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
                  onClick={() => setResetOpen(true)}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
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
                  className="h-11 pl-10 pr-11"
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
            </div>

            {error ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <Button
              type="submit"
              className="h-11 w-full"
              disabled={!email || !password || loading}
              aria-busy={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : null}
              <span>{loading ? "Signing in..." : "Sign in"}</span>
              {!loading ? <ArrowRight className="size-4" /> : null}
            </Button>
          </form>
        </div>

        <footer className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© 2026 Riadna</p>
          <a
            href="https://creaovo.co/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground hover:underline"
          >
            built with Creaovo
          </a>
        </footer>
      </section>

      <ResetPasswordDialog
        key={resetOpen ? "open" : "closed"}
        open={resetOpen}
        onOpenChange={setResetOpen}
        defaultEmail={email}
      />
    </main>
  );
}

function ResetPasswordDialog({
  open,
  onOpenChange,
  defaultEmail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail: string;
}) {
  const [resetEmail, setResetEmail] = useState(defaultEmail);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!resetEmail.trim()) return setError("Enter your email address.");
    setSending(true);
    setError(null);
    try {
      await requestPasswordReset(resetEmail);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the reset email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset your password</DialogTitle>
          <DialogDescription>
            We&apos;ll email you a link to choose a new password. The link expires in 30 minutes.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex items-start gap-2 rounded-md border border-success/30 bg-success/5 px-3 py-3 text-sm text-success">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <span>If an account exists for {resetEmail}, a reset link is on its way.</span>
          </div>
        ) : null}

        {error ? (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {!sent ? (
          <div className="grid gap-1.5">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              autoComplete="email"
              value={resetEmail}
              onChange={(event) => setResetEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submit();
              }}
              placeholder="you@yourriad.ma"
            />
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {sent ? "Close" : "Cancel"}
          </Button>
          {!sent ? (
            <Button type="button" size="sm" onClick={() => void submit()} disabled={sending || !resetEmail.trim()}>
              {sending ? <Loader2 className="animate-spin" /> : <Mail />}
              Send reset link
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
