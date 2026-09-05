import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Play } from "lucide-react";

import { AppShell, EmptyState, PageTitle } from "@/components/AppShell";
import { TaskDialog } from "@/components/TaskDialog";
import { TaskRow } from "@/components/TaskRow";
import {
  dayKey,
  deleteTask,
  formatMinutes,
  statsForDay,
  useAppState,
  type Task,
} from "@/lib/focus-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FocusFlow — Today's tasks and focus timer" },
      {
        name: "description",
        content:
          "See today's tasks, track completed focus sessions, and start a Pomodoro session in one tap. Works offline, no account needed.",
      },
      { property: "og:title", content: "FocusFlow — Today's tasks and focus timer" },
      {
        property: "og:description",
        content: "A calm to-do list and Pomodoro timer that works offline on your phone.",
      },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const state = useAppState();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const today = dayKey();
  const stats = statsForDay(state, today);

  const todayTasks = useMemo(
    () =>
      state.tasks
        .filter((t) => !t.dueDate || t.dueDate <= today)
        .sort((a, b) => {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          const rank = { high: 0, medium: 1, low: 2 } as const;
          if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority];
          return (a.dueTime ?? "99:99").localeCompare(b.dueTime ?? "99:99");
        }),
    [state.tasks, today],
  );

  const remaining = todayTasks.filter((t) => !t.completed).length;

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <AppShell>
      <PageTitle
        title="Ready to focus?"
        subtitle={
          remaining > 0
            ? `${remaining} task${remaining === 1 ? "" : "s"} left · ${formatMinutes(stats.minutes)} focused today.`
            : "Nothing left on today's list. Start a session anyway?"
        }
      />

      <div className="mt-5 grid grid-cols-3 gap-3 px-5">
        <Stat label="Tasks" value={`${stats.tasksCompleted}`} sub={`/${todayTasks.length}`} />
        <Stat label="Sessions" value={`${stats.sessions}`} />
        <Stat label="Focus" value={formatMinutes(stats.minutes)} accent />
      </div>

      <div className="mt-5 px-5">
        <button
          onClick={() => navigate({ to: "/focus" })}
          className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-primary font-display text-[16px] font-bold tracking-tight text-primary-foreground shadow-glow transition active:scale-[0.98]"
        >
          <Play className="size-4 fill-current" />
          Start Focus
        </button>
      </div>

      <div className="mt-7 px-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[15px] font-semibold">Today's Tasks</h2>
          <button
            onClick={openNew}
            className="flex items-center gap-1 text-[12px] font-medium text-primary active:opacity-70"
          >
            <Plus className="size-3.5" /> Add Task
          </button>
        </div>

        {todayTasks.length === 0 ? (
          <div className="-mx-5">
            <EmptyState
              title="Nothing planned yet."
              body="Add a task and start your day."
            />
          </div>
        ) : (
          <div className="space-y-2.5">
            {todayTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                focusing={state.timer.taskId === task.id && state.timer.status === "running"}
                onEdit={(t) => {
                  setEditing(t);
                  setDialogOpen(true);
                }}
                onDelete={(t) => deleteTask(t.id)}
              />
            ))}
          </div>
        )}
      </div>

      <TaskDialog
        open={dialogOpen}
        task={editing}
        defaultDate={today}
        onClose={() => setDialogOpen(false)}
      />
    </AppShell>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-panel px-3 py-3">
      <div className="text-[10px] uppercase tracking-wider text-subtle">{label}</div>
      <div
        className={`mt-1 font-display text-xl ${accent ? "text-primary" : "text-foreground"}`}
      >
        {value}
        {sub ? <span className="text-sm text-subtle">{sub}</span> : null}
      </div>
    </div>
  );
}
