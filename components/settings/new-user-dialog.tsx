"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { addTeamMember } from "@/lib/api";
import type { TeamMember, TeamRole } from "@/types";
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
import { Select } from "@/components/ui/select";

export function NewUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (member: TeamMember, existingAccount: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open ? (
          <NewUserForm
            onCreated={onCreated}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function NewUserForm({
  onCreated,
  onCancel,
}: {
  onCreated: (member: TeamMember, existingAccount: boolean) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("STAFF");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Enter the team member's name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setError("Enter a valid email address.");
    }
    if (password.length < 8) return setError("Password must be at least 8 characters.");

    setSaving(true);
    try {
      const { existingAccount, ...member } = await addTeamMember({ name, email, role, temporaryPassword: password });
      onCreated(member, existingAccount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the user.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <DialogHeader>
        <DialogTitle>New team user</DialogTitle>
        <DialogDescription>
          Create an account so a teammate can manage bookings and rooms for this riad.
        </DialogDescription>
      </DialogHeader>

      {error ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="new-user-name">Full name</Label>
        <Input
          id="new-user-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Salma Idrissi"
          autoFocus
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="new-user-email">Email</Label>
        <Input
          id="new-user-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@riad.ma"
          autoComplete="off"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="new-user-role">Role</Label>
          <Select
            id="new-user-role"
            value={role}
            onChange={(event) => setRole(event.target.value as TeamRole)}
          >
            <option value="STAFF">Staff</option>
            <option value="OWNER">Owner</option>
          </Select>
          <p className="text-xs text-muted-foreground">
            Owners can open settings and view revenue.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="new-user-password">Temporary password</Label>
          <Input
            id="new-user-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
          <p className="text-xs text-muted-foreground">
            Share it securely. They choose their own at first sign-in. Ignored if the email already has an account.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : null}
          Add user
        </Button>
      </DialogFooter>
    </form>
  );
}
