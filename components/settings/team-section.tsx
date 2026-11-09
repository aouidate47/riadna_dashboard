"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Trash2, UserPlus, Users } from "lucide-react";
import { NewUserDialog } from "@/components/settings/new-user-dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { getTeam, removeTeamMember, updateTeamMemberRole } from "@/lib/api";
import { cn, initials } from "@/lib/utils";
import type { TeamMember, TeamRole } from "@/types";

const ROLE_LABELS: Record<TeamRole, string> = { OWNER: "Owner", ADMIN: "Admin", STAFF: "Staff" };
const ROLE_ORDER: Record<TeamRole, number> = { OWNER: 0, ADMIN: 1, STAFF: 2 };

const sortTeam = (team: TeamMember[]) =>
  [...team].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.name.localeCompare(b.name));

/** Settings → Team access: list, add, change role, remove. Owners only (like the page). */
export function TeamSection({
  currentUserId,
  onNotice,
  onError,
}: {
  currentUserId?: string;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [newUserOpen, setNewUserOpen] = useState(false);
  /** The member being changed: `role` while saving a role, `remove` while removing. */
  const [busy, setBusy] = useState<{ id: string; action: "role" | "remove" } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTeam()
      .then((members) => {
        if (cancelled) return;
        setTeam(members);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Could not load the team.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  function reload() {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }

  async function changeRole(member: TeamMember, role: TeamRole) {
    if (role === member.role) return;
    setBusy({ id: member.id, action: "role" });
    try {
      const updated = await updateTeamMemberRole(member.id, role);
      setTeam((current) => sortTeam(current.map((m) => (m.id === updated.id ? updated : m))));
      onNotice(`${updated.name} is now ${ROLE_LABELS[updated.role].toLowerCase()}.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not change the role.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(member: TeamMember) {
    if (confirmRemove !== member.id) return setConfirmRemove(member.id);
    setConfirmRemove(null);
    setBusy({ id: member.id, action: "remove" });
    try {
      await removeTeamMember(member.id);
      setTeam((current) => current.filter((m) => m.id !== member.id));
      onNotice(`${member.name} no longer has access to this riad.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not remove the team member.");
    } finally {
      setBusy(null);
    }
  }

  function handleCreated(member: TeamMember, existingAccount: boolean) {
    setTeam((current) => sortTeam([...current, member]));
    setNewUserOpen(false);
    onNotice(
      existingAccount
        ? `${member.name} already had an account, so they were added with their own password.`
        : `${member.name} added. Share the temporary password with them; they'll choose a new one when they sign in.`,
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <header className="flex items-center gap-3 border-b border-border/70 bg-muted/30 px-5 py-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Users className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold">Team access</h3>
          <p className="text-xs text-muted-foreground">
            {loading ? "Loading…" : `${team.length} account${team.length === 1 ? "" : "s"} for this riad`}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setNewUserOpen(true)}>
          <UserPlus />
          New user
        </Button>
      </header>

      {loadError ? (
        <div className="flex items-center justify-between gap-3 px-5 py-4 text-sm text-destructive">
          <span>{loadError}</span>
          <Button type="button" variant="outline" size="sm" onClick={reload}>
            <RefreshCw />
            Retry
          </Button>
        </div>
      ) : loading && team.length === 0 ? (
        <div className="space-y-3 px-5 py-4" aria-busy="true">
          {[0, 1].map((index) => (
            <div key={index} className="h-9 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {team.map((member) => {
            const isMe = member.id === currentUserId;
            const memberBusy = busy?.id === member.id;
            return (
              <li key={member.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {initials(member.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{member.name}</p>
                    {isMe ? <span className="shrink-0 text-[10px] font-medium text-muted-foreground">You</span> : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  {member.mustChangePassword ? (
                    <p className="text-[11px] text-muted-foreground">Hasn&apos;t signed in yet (temporary password)</p>
                  ) : null}
                </div>

                {isMe ? (
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {ROLE_LABELS[member.role]}
                  </span>
                ) : (
                  <div className="flex shrink-0 items-center gap-1">
                    <Select
                      aria-label={`Role of ${member.name}`}
                      value={member.role}
                      onChange={(event) => void changeRole(member, event.target.value as TeamRole)}
                      disabled={memberBusy}
                      className="h-8 w-[6.5rem] text-xs"
                    >
                      <option value="OWNER">Owner</option>
                      {member.role === "ADMIN" ? <option value="ADMIN">Admin</option> : null}
                      <option value="STAFF">Staff</option>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size={confirmRemove === member.id ? "sm" : "icon"}
                      className={cn(
                        confirmRemove === member.id ? "h-8 text-destructive" : "size-8 text-muted-foreground",
                        "hover:text-destructive",
                      )}
                      onClick={() => void remove(member)}
                      onBlur={() => setConfirmRemove((id) => (id === member.id ? null : id))}
                      disabled={memberBusy}
                      aria-label={`Remove ${member.name}`}
                      title="Remove from the team"
                    >
                      {memberBusy && busy?.action === "remove" ? <Loader2 className="animate-spin" /> : <Trash2 />}
                      {confirmRemove === member.id ? "Remove?" : null}
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <NewUserDialog open={newUserOpen} onOpenChange={setNewUserOpen} onCreated={handleCreated} />
    </section>
  );
}
