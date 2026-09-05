import { useSyncExternalStore } from "react";

import { playChime, startAmbient, stopAmbient } from "./audio";
import {
  cancelSessionEnd,
  requestNotificationPermission as requestPermission,
  scheduleSessionEnd,
  showNow,
} from "./notifications";

export type Priority = "low" | "medium" | "high";
export type TimerMode = "focus" | "short" | "long";
export type TimerStatus = "idle" | "running" | "paused";
export type ThemePref = "dark" | "light" | "system";

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  dueDate: string | null; // YYYY-MM-DD
  dueTime: string | null; // HH:mm
  completed: boolean;
  completedAt: number | null;
  createdAt: number;
}

export interface FocusSession {
  id: string;
  taskId: string | null;
  taskTitle: string | null;
  startedAt: number;
  endedAt: number;
  minutes: number;
}

export interface Settings {
  focusMin: number;
  shortMin: number;
  longMin: number;
  sessionsBeforeLong: number;
  theme: ThemePref;
  notifications: boolean;
  sounds: boolean;
  ambientSound: boolean;
}

export interface TimerState {
  mode: TimerMode;
  status: TimerStatus;
  endsAt: number | null;
  remainingMs: number;
  totalMs: number;
  startedAt: number | null;
  completedInCycle: number;
  taskId: string | null;
}

export interface AppState {
  tasks: Task[];
  sessions: FocusSession[];
  settings: Settings;
  timer: TimerState;
}

export const DEFAULT_SETTINGS: Settings = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  sessionsBeforeLong: 4,
  theme: "dark",
  notifications: true,
  sounds: true,
  ambientSound: false,
};

const defaultTimer = (settings: Settings): TimerState => ({
  mode: "focus",
  status: "idle",
  endsAt: null,
  remainingMs: settings.focusMin * 60_000,
  totalMs: settings.focusMin * 60_000,
  startedAt: null,
  completedInCycle: 0,
  taskId: null,
});

export const DEFAULT_STATE: AppState = {
  tasks: [],
  sessions: [],
  settings: DEFAULT_SETTINGS,
  timer: defaultTimer(DEFAULT_SETTINGS),
};

const KEY = "focusflow.state.v1";

let state: AppState = DEFAULT_STATE;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — app keeps working in-memory */
  }
}

export function setState(updater: (prev: AppState) => AppState) {
  state = updater(state);
  persist();
  syncSessionNotification();
  emit();
}

export function getState() {
  return state;
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function isHydrated() {
  return hydrated;
}

export function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      const settings: Settings = { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) };
      state = {
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
        settings,
        timer: { ...defaultTimer(settings), ...(parsed.timer ?? {}) },
      };
      // A session that was running when the app closed keeps counting against
      // the real clock, not against the time the app was awake for.
      if (state.timer.status === "running" && state.timer.endsAt) {
        state.timer.remainingMs = Math.max(0, state.timer.endsAt - Date.now());
      }
    }
  } catch {
    state = DEFAULT_STATE;
  }
  hydrated = true;
  emit();
}

function snapshot() {
  return state;
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, snapshot, () => DEFAULT_STATE);
}

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => hydrated,
    () => false,
  );
}

/* ---------------- helpers ---------------- */

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/** Local-time YYYY-MM-DD key used to group tasks and sessions by day. */
export function dayKey(d: Date | number = Date.now()): string {
  const date = typeof d === "number" ? new Date(d) : d;
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${m}-${day}`;
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${`${m}`.padStart(2, "0")}:${`${s}`.padStart(2, "0")}`;
}

export function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatTime(hhmm: string): string {
  const parts = hhmm.split(":");
  const h = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 0);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 === 0 ? 12 : h % 12}:${`${m}`.padStart(2, "0")} ${suffix}`;
}

export function modeLabel(mode: TimerMode): string {
  return mode === "focus" ? "Focus" : mode === "short" ? "Short Break" : "Long Break";
}

export function durationFor(mode: TimerMode, s: Settings): number {
  const mins = mode === "focus" ? s.focusMin : mode === "short" ? s.shortMin : s.longMin;
  return Math.max(1, mins) * 60_000;
}

/* ---------------- tasks ---------------- */

export function addTask(input: {
  title: string;
  priority: Priority;
  dueDate: string | null;
  dueTime: string | null;
}): Task {
  const task: Task = {
    id: uid(),
    title: input.title.trim(),
    priority: input.priority,
    dueDate: input.dueDate,
    dueTime: input.dueTime,
    completed: false,
    completedAt: null,
    createdAt: Date.now(),
  };
  setState((s) => ({ ...s, tasks: [task, ...s.tasks] }));
  return task;
}

export function updateTask(id: string, patch: Partial<Omit<Task, "id">>) {
  setState((s) => ({
    ...s,
    tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  }));
}

export function deleteTask(id: string) {
  setState((s) => ({
    ...s,
    tasks: s.tasks.filter((t) => t.id !== id),
    timer: s.timer.taskId === id ? { ...s.timer, taskId: null } : s.timer,
  }));
}

export function toggleTask(id: string) {
  setState((s) => ({
    ...s,
    tasks: s.tasks.map((t) =>
      t.id === id
        ? { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : null }
        : t,
    ),
  }));
}

export function clearCompletedTasks() {
  setState((s) => ({ ...s, tasks: s.tasks.filter((t) => !t.completed) }));
}

export function resetAllData() {
  setState(() => ({ ...DEFAULT_STATE, settings: DEFAULT_SETTINGS }));
}

export function updateSettings(patch: Partial<Settings>) {
  setState((s) => {
    const settings = { ...s.settings, ...patch };
    let timer = s.timer;
    // Duration changes only apply to a timer that isn't mid-session.
    if (timer.status === "idle") {
      const totalMs = durationFor(timer.mode, settings);
      timer = { ...timer, totalMs, remainingMs: totalMs };
    }
    return { ...s, settings, timer };
  });
}

/* ---------------- timer ---------------- */

type FlashHandler = (title: string, body: string) => void;
let flashHandler: FlashHandler = () => {};
export function setFlashHandler(fn: FlashHandler) {
  flashHandler = fn;
}

function notify(title: string, body: string) {
  flashHandler(title, body);
  if (getState().settings.sounds) playChime();
  if (!getState().settings.notifications) return;
  showNow(title, body);
}

export function requestNotificationPermission() {
  void requestPermission();
}

/** Title/body the OS shows when the running interval reaches its end. */
function endOfIntervalMessage(mode: TimerMode): { title: string; body: string } {
  if (mode === "focus") {
    return { title: "Focus session complete 🎉", body: "Time for a break." };
  }
  return {
    title: mode === "long" ? "Long break complete" : "Short break complete",
    body: "Ready for another focus session?",
  };
}

/**
 * Keeps the OS-scheduled session-end notification in step with the timer.
 * Called on every state change; re-scheduling is deduped on the end time.
 */
function syncSessionNotification() {
  const { timer, settings } = getState();
  if (!settings.notifications || timer.status !== "running" || timer.endsAt === null) {
    cancelSessionEnd();
    return;
  }
  const { title, body } = endOfIntervalMessage(timer.mode);
  scheduleSessionEnd(timer.endsAt, title, body);
}

export function selectTask(taskId: string | null) {
  setState((s) => ({ ...s, timer: { ...s.timer, taskId } }));
}

export function startTimer() {
  setState((s) => {
    const t = s.timer;
    if (t.status === "running") return s;
    const totalMs = t.status === "paused" ? t.totalMs : durationFor(t.mode, s.settings);
    const remaining = t.status === "paused" ? t.remainingMs : totalMs;
    return {
      ...s,
      timer: {
        ...t,
        status: "running",
        totalMs,
        remainingMs: remaining,
        endsAt: Date.now() + remaining,
        startedAt: t.startedAt ?? Date.now(),
      },
    };
  });
}

export function pauseTimer() {
  setState((s) => {
    const t = s.timer;
    if (t.status !== "running") return s;
    const remaining = Math.max(0, (t.endsAt ?? Date.now()) - Date.now());
    return { ...s, timer: { ...t, status: "paused", remainingMs: remaining, endsAt: null } };
  });
}

export function resetTimer() {
  setState((s) => {
    const totalMs = durationFor(s.timer.mode, s.settings);
    return {
      ...s,
      timer: {
        ...s.timer,
        status: "idle",
        endsAt: null,
        startedAt: null,
        totalMs,
        remainingMs: totalMs,
      },
    };
  });
}

function goToMode(mode: TimerMode, autostart: boolean) {
  setState((s) => {
    const totalMs = durationFor(mode, s.settings);
    return {
      ...s,
      timer: {
        ...s.timer,
        mode,
        status: autostart ? "running" : "idle",
        totalMs,
        remainingMs: totalMs,
        startedAt: autostart ? Date.now() : null,
        endsAt: autostart ? Date.now() + totalMs : null,
      },
    };
  });
}

/** Finish the current interval: record it, notify, and move to the next mode. */
export function completeInterval(skipped = false) {
  const s = getState();
  const t = s.timer;

  if (t.mode === "focus") {
    const elapsedMs = Math.min(t.totalMs, t.totalMs - Math.max(0, t.remainingMs));
    const minutes = skipped ? Math.floor(elapsedMs / 60_000) : Math.round(t.totalMs / 60_000);
    const completedCycle = t.completedInCycle + (skipped ? 0 : 1);
    const nextMode: TimerMode =
      !skipped && completedCycle > 0 && completedCycle % s.settings.sessionsBeforeLong === 0
        ? "long"
        : "short";

    if (!skipped) {
      const task = s.tasks.find((x) => x.id === t.taskId) ?? null;
      const session: FocusSession = {
        id: uid(),
        taskId: task?.id ?? null,
        taskTitle: task?.title ?? null,
        startedAt: t.startedAt ?? Date.now() - t.totalMs,
        endedAt: Date.now(),
        minutes,
      };
      setState((prev) => ({
        ...prev,
        sessions: [session, ...prev.sessions],
        timer: { ...prev.timer, completedInCycle: completedCycle },
      }));
      notify(
        "Focus session complete 🎉",
        nextMode === "long" ? "Time for a long break." : "Time for a short break.",
      );
    }
    goToMode(nextMode, !skipped);
  } else {
    const wasLong = t.mode === "long";
    if (!skipped) {
      notify(
        wasLong ? "Long break complete" : "Short break complete",
        "Ready for another focus session?",
      );
    }
    goToMode("focus", false);
  }
}

export function skipInterval() {
  completeInterval(true);
}

/** Keeps the ambient focus tone in step with the timer. */
export function syncAmbient() {
  const { timer, settings } = getState();
  if (settings.ambientSound && timer.mode === "focus" && timer.status === "running") startAmbient();
  else stopAmbient();
}

/**
 * Re-derives the countdown from the device's real clock. Called on every tick,
 * on app launch, and whenever the app returns to the foreground, so a locked or
 * closed phone never loses (or gains) time. If several intervals elapsed while
 * the app was away, each one is settled in turn.
 */
export function resyncClock() {
  for (let i = 0; i < 12; i++) {
    const t = getState().timer;
    if (t.status !== "running" || !t.endsAt) break;
    if (t.endsAt - Date.now() > 0) break;
    setState((s) => ({ ...s, timer: { ...s.timer, remainingMs: 0 } }));
    completeInterval(false);
  }
  syncAmbient();
}

/** Drives the countdown. Mounted once by the app shell. */
export function tick() {
  syncAmbient();
  const t = getState().timer;
  if (t.status !== "running" || !t.endsAt) return;
  const remaining = t.endsAt - Date.now();
  if (remaining <= 0) {
    resyncClock();
    return;
  }
  // Guard against a device clock jumping backwards.
  const clamped = Math.min(remaining, t.totalMs);
  setState((s) => ({ ...s, timer: { ...s.timer, remainingMs: clamped } }));
}

/* ---------------- derived stats ---------------- */

export function sessionsOn(sessions: FocusSession[], key: string) {
  return sessions.filter((s) => dayKey(s.endedAt) === key);
}

export function statsForDay(state: AppState, key = dayKey()) {
  const daySessions = sessionsOn(state.sessions, key);
  return {
    tasksCompleted: state.tasks.filter(
      (t) => t.completed && t.completedAt && dayKey(t.completedAt) === key,
    ).length,
    sessions: daySessions.length,
    minutes: daySessions.reduce((sum, s) => sum + s.minutes, 0),
  };
}

export function last7Days(state: AppState) {
  const out: { key: string; label: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    out.push({
      key,
      label: d.toLocaleDateString(undefined, { weekday: "narrow" }),
      minutes: sessionsOn(state.sessions, key).reduce((sum, s) => sum + s.minutes, 0),
    });
  }
  return out;
}

export function weekStats(state: AppState) {
  const days = last7Days(state);
  const keys = new Set(days.map((d) => d.key));
  return {
    minutes: days.reduce((sum, d) => sum + d.minutes, 0),
    tasks: state.tasks.filter(
      (t) => t.completed && t.completedAt && keys.has(dayKey(t.completedAt)),
    ).length,
  };
}

export function currentStreak(state: AppState) {
  const withSession = new Set(state.sessions.map((s) => dayKey(s.endedAt)));
  if (withSession.size === 0) return 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!withSession.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (withSession.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
