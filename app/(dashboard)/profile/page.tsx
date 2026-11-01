"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, KeyRound, Loader2, Save, UserRound } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword, getMyProfile, updateMyProfile, type MyProfile } from "@/lib/api";

/** Open to every signed-in user (owners and staff). */
export default function Page() {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getMyProfile()
      .then((next) => {
        if (!cancelled) setProfile(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Could not load your profile.");
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  function retry() {
    setLoadError(null);
    setRefreshKey((key) => key + 1);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold">My profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">Update your name and the password you sign in with.</p>
      </div>

      {loadError ? (
        <Message tone="error">
          <span className="flex-1">{loadError}</span>
          <button type="button" onClick={retry} className="font-medium underline">
            Retry
          </button>
        </Message>
      ) : null}

      {profile?.mustChangePassword ? (
        <Message tone="error">
          <span className="flex-1">You are still using a temporary password. Please choose a new one below.</span>
        </Message>
      ) : null}

      {!profile ? (
        loadError ? null : (
          <div className="grid gap-5 xl:grid-cols-2" aria-busy="true" aria-label="Loading profile">
            <div className="h-80 animate-pulse rounded-lg border border-border bg-card" />
            <div className="h-80 animate-pulse rounded-lg border border-border bg-card" />
          </div>
        )
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-2">
          <DetailsCard profile={profile} onSaved={setProfile} />
          <PasswordCard onChanged={() => setProfile((p) => (p ? { ...p, mustChangePassword: false } : p))} />
        </div>
      )}
    </div>
  );
}

function DetailsCard({ profile, onSaved }: { profile: MyProfile; onSaved: (profile: MyProfile) => void }) {
  const { refreshUser } = useAuth();
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const dirty = firstName !== profile.firstName || lastName !== profile.lastName;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!firstName.trim()) return setError("Enter your first name.");

    setSaving(true);
    try {
      const saved = await updateMyProfile({ firstName, lastName });
      setFirstName(saved.firstName);
      setLastName(saved.lastName);
      onSaved(saved);
      refreshUser();
      setNotice("Your name was saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your name.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card icon={<UserRound className="size-[18px]" />} title="Your details" text="Shown in the top bar and to your team.">
      <form onSubmit={submit} noValidate className="grid gap-5 p-5">
        {error ? <Message tone="error">{error}</Message> : null}
        {notice ? <Message tone="success">{notice}</Message> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="profile-first-name">First name</Label>
            <Input
              id="profile-first-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              autoComplete="given-name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-last-name">Last name</Label>
            <Input
              id="profile-last-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              autoComplete="family-name"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="profile-email">Email</Label>
          <Input id="profile-email" value={profile.email} disabled />
          <p className="text-xs text-muted-foreground">Ask your administrator to change your email.</p>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!dirty || saving}
            onClick={() => {
              setFirstName(profile.firstName);
              setLastName(profile.lastName);
            }}
          >
            Reset
          </Button>
          <Button type="submit" size="sm" disabled={!dirty || saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            Save name
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordCard({ onChanged }: { onChanged: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!currentPassword) return setError("Enter your current password.");
    if (newPassword.length < 8) return setError("New password must be at least 8 characters.");
    if (newPassword !== confirmPassword) return setError("The new passwords do not match.");
    if (newPassword === currentPassword) return setError("Choose a password different from the current one.");

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onChanged();
      setNotice("Your password was changed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change your password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card icon={<KeyRound className="size-[18px]" />} title="Change password" text="Use at least 8 characters.">
      <form onSubmit={submit} noValidate className="grid gap-5 p-5">
        {error ? <Message tone="error">{error}</Message> : null}
        {notice ? <Message tone="success">{notice}</Message> : null}

        <div className="grid gap-2">
          <Label htmlFor="profile-current-password">Current password</Label>
          <Input
            id="profile-current-password"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="profile-new-password">New password</Label>
            <Input
              id="profile-new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-confirm-password">Confirm new password</Label>
            <Input
              id="profile-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="flex justify-end border-t border-border pt-4">
          <Button type="submit" size="sm" disabled={!currentPassword || !newPassword || saving}>
            {saving ? <Loader2 className="animate-spin" /> : <KeyRound />}
            Change password
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Card({ icon, title, text, children }: { icon: ReactNode; title: string; text: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <header className="flex items-center gap-3 border-b border-border px-5 py-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <div>
          <h3 className="font-display text-base font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{text}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function Message({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          : "flex items-center gap-2 rounded-md border border-success/30 bg-success/5 px-4 py-3 text-sm text-success"
      }
    >
      <Icon className="size-4 shrink-0" />
      {children}
    </div>
  );
}
