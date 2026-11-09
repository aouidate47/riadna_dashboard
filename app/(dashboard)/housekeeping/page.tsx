"use client";

import { useEffect, useState } from "react";
import { format, endOfMonth, startOfMonth, subMonths } from "date-fns";
import {
  AlertCircle,
  Check,
  ClipboardCheck,
  Loader2,
  Plus,
  Sparkles,
  SprayCan,
  Trash2,
  Wrench,
} from "lucide-react";
import {
  createMaintenance,
  deleteMaintenance,
  getBookings,
  getHousekeeping,
  getRooms,
  listMaintenance,
  setHousekeepingStatus,
  updateMaintenance,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type {
  Booking,
  HousekeepingRow,
  HousekeepingStatus,
  MaintenancePriority,
  MaintenanceTask,
  Room,
} from "@/types";

const HOUSEKEEPING_OPTIONS: { value: HousekeepingStatus; label: string; className: string }[] = [
  { value: "clean", label: "Clean", className: "bg-success/10 text-success" },
  { value: "dirty", label: "Dirty", className: "bg-destructive/10 text-destructive" },
  { value: "inspected", label: "Inspected", className: "bg-primary/10 text-primary" },
];

const PRIORITY_CLASS: Record<MaintenancePriority, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-primary/10 text-primary",
  urgent: "bg-destructive/10 text-destructive",
};

export default function Page() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [housekeeping, setHousekeeping] = useState<HousekeepingRow[]>([]);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [inHouse, setInHouse] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingRoom, setSavingRoom] = useState<string | null>(null);
  const [taskRoom, setTaskRoom] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<MaintenancePriority>("normal");
  const [addingTask, setAddingTask] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const now = new Date();
    Promise.all([
      getRooms(),
      getHousekeeping(),
      listMaintenance(),
      getBookings({
        from: format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd"),
        to: format(endOfMonth(now), "yyyy-MM-dd"),
      }),
    ])
      .then(([roomList, statuses, maintenanceTasks, bookings]) => {
        if (cancelled) return;
        setRooms(roomList);
        setHousekeeping(statuses);
        setTasks(maintenanceTasks);
        setInHouse(bookings.filter((booking) => booking.status === "CHECKED_IN"));
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load housekeeping.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const statusFor = (roomId: string) => housekeeping.find((row) => row.roomId === roomId)?.status ?? "clean";
  const guestFor = (roomId: string) => inHouse.find((booking) => booking.roomId === roomId);

  async function changeStatus(roomId: string, status: HousekeepingStatus) {
    setSavingRoom(roomId);
    setError(null);
    try {
      const row = await setHousekeepingStatus(roomId, status);
      setHousekeeping((current) => [...current.filter((item) => item.roomId !== roomId), row]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the room.");
    } finally {
      setSavingRoom(null);
    }
  }

  async function addTask() {
    if (!taskRoom || !taskTitle.trim()) return;
    setAddingTask(true);
    setError(null);
    try {
      const task = await createMaintenance({ roomId: taskRoom, title: taskTitle.trim(), priority: taskPriority });
      setTasks((current) => [task, ...current]);
      setTaskTitle("");
      setTaskPriority("normal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the task.");
    } finally {
      setAddingTask(false);
    }
  }

  async function toggleTask(task: MaintenanceTask) {
    const next = task.status === "done" ? "open" : "done";
    setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, status: next } : item)));
    try {
      await updateMaintenance(task.id, { status: next });
    } catch (err) {
      setTasks((current) => current.map((item) => (item.id === task.id ? task : item)));
      setError(err instanceof Error ? err.message : "Could not update the task.");
    }
  }

  async function removeTask(task: MaintenanceTask) {
    setTasks((current) => current.filter((item) => item.id !== task.id));
    try {
      await deleteMaintenance(task.id);
    } catch (err) {
      setTasks((current) => [task, ...current]);
      setError(err instanceof Error ? err.message : "Could not delete the task.");
    }
  }

  const counts = HOUSEKEEPING_OPTIONS.map((option) => ({
    ...option,
    count: rooms.filter((room) => statusFor(room.id) === option.value).length,
  }));
  const openTasks = tasks.filter((task) => task.status === "open");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Housekeeping &amp; maintenance</h2>
        <p className="mt-1 text-sm text-muted-foreground">Track room readiness and keep repairs moving.</p>
      </div>

      {error ? (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading housekeeping">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-lg border border-border bg-card" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {counts.map((option) => (
              <div key={option.value} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{option.label}</p>
                  {option.value === "clean" ? (
                    <Sparkles className="size-4 text-success" />
                  ) : option.value === "dirty" ? (
                    <SprayCan className="size-4 text-destructive" />
                  ) : (
                    <ClipboardCheck className="size-4 text-primary" />
                  )}
                </div>
                <p className="mt-2 font-display text-2xl font-semibold">{option.count}</p>
                <p className="text-xs text-muted-foreground">rooms</p>
              </div>
            ))}
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Open tasks</p>
                <Wrench className="size-4 text-primary" />
              </div>
              <p className="mt-2 font-display text-2xl font-semibold">{openTasks.length}</p>
              <p className="text-xs text-muted-foreground">maintenance</p>
            </div>
          </div>

          <section className="rounded-lg border border-border bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <h3 className="font-display text-base font-semibold">Rooms</h3>
              <p className="text-xs text-muted-foreground">Set the readiness after each cleaning or inspection.</p>
            </div>
            <ul className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {rooms.map((room) => {
                const status = statusFor(room.id);
                const guest = guestFor(room.id);
                const option = HOUSEKEEPING_OPTIONS.find((item) => item.value === status) ?? HOUSEKEEPING_OPTIONS[0];
                return (
                  <li key={room.id} className="rounded-md border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{room.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {guest ? `In-house · ${guest.guestName}` : "Vacant"}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${option.className}`}>
                        {option.label}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1">
                        <Select
                          aria-label={`Housekeeping status for ${room.name}`}
                          value={status}
                          disabled={savingRoom === room.id}
                          onChange={(event) => void changeStatus(room.id, event.target.value as HousekeepingStatus)}
                          className="h-8 text-xs"
                        >
                          {HOUSEKEEPING_OPTIONS.map((item) => (
                            <option key={item.value} value={item.value}>
                              Mark {item.label.toLowerCase()}
                            </option>
                          ))}
                        </Select>
                      </div>
                      {savingRoom === room.id ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-lg border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div>
                <h3 className="font-display text-base font-semibold">Maintenance tasks</h3>
                <p className="text-xs text-muted-foreground">Log repairs and mark them done when fixed.</p>
              </div>
            </div>

            <div className="grid gap-2 border-b border-border p-4 sm:grid-cols-[1fr_1.4fr_8rem_auto]">
              <Select
                aria-label="Task room"
                value={taskRoom}
                onChange={(event) => setTaskRoom(event.target.value)}
                className="h-9"
              >
                <option value="">Select a room…</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </Select>
              <Input
                aria-label="Task description"
                placeholder="Describe the problem"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void addTask();
                }}
                className="h-9"
              />
              <Select
                aria-label="Task priority"
                value={taskPriority}
                onChange={(event) => setTaskPriority(event.target.value as MaintenancePriority)}
                className="h-9"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
              </Select>
              <Button size="sm" onClick={() => void addTask()} disabled={addingTask || !taskRoom || !taskTitle.trim()}>
                {addingTask ? <Loader2 className="animate-spin" /> : <Plus />}
                Add
              </Button>
            </div>

            {tasks.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No maintenance tasks. Nice and quiet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-3 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void toggleTask(task)}
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full border ${
                        task.status === "done"
                          ? "border-success bg-success text-white"
                          : "border-border text-transparent hover:border-primary"
                      }`}
                      aria-label={task.status === "done" ? "Reopen task" : "Mark task done"}
                    >
                      <Check className="size-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm ${task.status === "done" ? "text-muted-foreground line-through" : "font-medium"}`}>
                        {task.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {rooms.find((room) => room.id === task.roomId)?.name ?? "Room"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${PRIORITY_CLASS[task.priority]}`}
                    >
                      {task.priority}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground"
                      onClick={() => void removeTask(task)}
                      aria-label="Delete task"
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
