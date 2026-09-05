import { createFileRoute } from "@tanstack/react-router";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import {
  formatClock,
  modeLabel,
  pauseTimer,
  requestNotificationPermission,
  resetTimer,
  selectTask,
  skipInterval,
  startTimer,
  syncAmbient,
  useAppState,
} from "@/lib/focus-store";
import { unlockAudio } from "@/lib/audio";

export const Route = createFileRoute("/focus")({
  head: () => ({
    meta: [
      { title: "Focus Timer — FocusFlow" },
      {
        name: "description",
        content:
          "A distraction-free Pomodoro timer with focus sessions, short breaks and long breaks. Stays accurate while your screen is off.",
      },
      { property: "og:title", content: "Focus Timer — FocusFlow" },
      {
        property: "og:description",
        content: "Pick a task, hit start, and focus for 25 minutes.",
      },
    ],
  }),
  component: FocusPage,
});

function FocusPage() {
  const state = useAppState();
  const { timer, settings, tasks } = state;
  const activeTasks = tasks.filter((t) => !t.completed);
  const selected = tasks.find((t) => t.id === timer.taskId) ?? null;

  const progress = timer.totalMs > 0 ? 1 - timer.remainingMs / timer.totalMs : 0;
  const degrees = Math.min(360, Math.max(0, progress * 360));
  const sessionNumber = (timer.completedInCycle % settings.sessionsBeforeLong) + 1;

  const onStart = () => {
    requestNotificationPermission();
    unlockAudio();
    startTimer();
    syncAmbient();
  };

  return (
    <AppShell>
      <div className="flex flex-col items-center px-5">
        <div className="flex w-full items-center justify-between">
          <span
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
              timer.mode === "focus"
                ? "border-primary/40 bg-primary/12 text-primary"
                : "border-line bg-panel text-muted-foreground"
            }`}
          >
            {modeLabel(timer.mode)}
          </span>
          <span className="text-[12px] text-subtle">
            Session {sessionNumber} / {settings.sessionsBeforeLong}
          </span>
        </div>

        <div
          className="relative mt-8 grid size-[268px] place-items-center rounded-full transition-[background] duration-500"
          style={{
            background: `conic-gradient(var(--primary) ${degrees}deg, var(--line) ${degrees}deg)`,
          }}
        >
          <div className="absolute inset-[8px] rounded-full bg-background" />
          {timer.status === "running" ? (
            <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl animate-breathe" />
          ) : null}
          <div className="relative text-center">
            <p className="font-display text-[62px] font-bold leading-none tracking-tight tabular-nums">
              {formatClock(timer.remainingMs)}
            </p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-subtle">
              {timer.status === "running"
                ? timer.mode === "focus"
                  ? "Focusing"
                  : "On a break"
                : timer.status === "paused"
                  ? "Paused"
                  : "Ready"}
            </p>
          </div>
        </div>

        <div className="mt-8 w-full">
          <label className="text-[11px] uppercase tracking-wider text-subtle">
            {timer.mode === "focus" ? "Focusing on" : "Next up"}
          </label>
          <select
            value={timer.taskId ?? ""}
            onChange={(e) => selectTask(e.target.value || null)}
            className="mt-1.5 w-full appearance-none rounded-2xl border border-line bg-panel px-4 py-3.5 text-[14px] outline-none focus:border-primary/50"
          >
            <option value="">No task selected</option>
            {activeTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
            {selected?.completed ? (
              <option value={selected.id}>{selected.title} (done)</option>
            ) : null}
          </select>
          {activeTasks.length === 0 ? (
            <p className="mt-2 text-[11px] text-subtle">
              No active tasks — you can still run a plain focus session.
            </p>
          ) : null}
        </div>

        <div className="mt-7 flex w-full items-center justify-center gap-3">
          <button
            aria-label="Reset"
            onClick={resetTimer}
            className="grid size-12 place-items-center rounded-full border border-line bg-panel text-muted-foreground transition active:scale-95"
          >
            <RotateCcw className="size-4" />
          </button>

          {timer.status === "running" ? (
            <button
              onClick={pauseTimer}
              className="grid size-[72px] place-items-center rounded-full bg-primary text-primary-foreground shadow-glow transition active:scale-95"
              aria-label="Pause"
            >
              <Pause className="size-6 fill-current" />
            </button>
          ) : (
            <button
              onClick={onStart}
              className="grid size-[72px] place-items-center rounded-full bg-primary text-primary-foreground shadow-glow transition active:scale-95"
              aria-label={timer.status === "paused" ? "Resume" : "Start"}
            >
              <Play className="size-6 fill-current" />
            </button>
          )}

          <button
            aria-label="Skip"
            onClick={skipInterval}
            className="grid size-12 place-items-center rounded-full border border-line bg-panel text-muted-foreground transition active:scale-95"
          >
            <SkipForward className="size-4" />
          </button>
        </div>

        <p className="mt-4 text-center text-[12px] text-subtle">
          {timer.status === "running"
            ? "Timer keeps counting if you lock your screen."
            : timer.status === "paused"
              ? "Paused — tap play to resume."
              : `${settings.focusMin} min focus · ${settings.shortMin} min break`}
        </p>
      </div>
    </AppShell>
  );
}
