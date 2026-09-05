import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { AppShell, EmptyState, PageTitle } from "@/components/AppShell";
import { TaskDialog } from "@/components/TaskDialog";
import { TaskRow } from "@/components/TaskRow";
import { dayKey, deleteTask, useAppState, type Task } from "@/lib/focus-store";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — FocusFlow" },
      {
        name: "description",
        content:
          "Organise your tasks into today, upcoming and completed. Set priority, due dates and times, all stored on your device.",
      },
      { property: "og:title", content: "Tasks — FocusFlow" },
      {
        property: "og:description",
        content: "A fast, offline checklist with priorities and due dates.",
      },
    ],
  }),
  component: TasksPage,
});

type Filter = "all" | "active" | "completed";

export function TasksPage() {
  const { tasks } = useAppState();
  const [filter, setFilter] = useState<Filter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const today = dayKey();

  const groups = useMemo(() => {
    const visible = tasks.filter((t) =>
      filter === "all" ? true : filter === "active" ? !t.completed : t.completed,
    );
    const byTime = (a: Task, b: Task) =>
      (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
      (a.dueTime ?? "99:99").localeCompare(b.dueTime ?? "99:99");
    return {
      today: visible.filter((t) => !t.completed && (!t.dueDate || t.dueDate <= today)).sort(byTime),
      upcoming: visible.filter((t) => !t.completed && t.dueDate && t.dueDate > today).sort(byTime),
      completed: visible
        .filter((t) => t.completed)
        .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)),
    };
  }, [tasks, filter, today]);

  const empty =
    groups.today.length === 0 && groups.upcoming.length === 0 && groups.completed.length === 0;

  return (
    <AppShell>
      <PageTitle title="Tasks" subtitle="Everything on your plate, grouped simply." />

      <div className="mt-4 flex gap-2 px-5">
        {(["all", "active", "completed"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3.5 py-1.5 text-[12px] font-medium capitalize transition ${
              filter === f
                ? "border-primary/50 bg-primary/12 text-primary"
                : "border-line bg-panel text-muted-foreground"
            }`}
          >
            {f}
          </button>
        ))}
        <button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          className="ml-auto flex items-center gap-1 rounded-full bg-primary px-3.5 py-1.5 text-[12px] font-semibold text-primary-foreground active:scale-95"
        >
          <Plus className="size-3.5" /> Add
        </button>
      </div>

      {empty ? (
        <div className="mt-8">
          <EmptyState title="Nothing planned yet." body="Add a task and start your day." />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <Section
            title="Today"
            tasks={groups.today}
            onEdit={(t) => {
              setEditing(t);
              setDialogOpen(true);
            }}
          />
          <Section
            title="Upcoming"
            tasks={groups.upcoming}
            onEdit={(t) => {
              setEditing(t);
              setDialogOpen(true);
            }}
          />
          <Section
            title="Completed"
            tasks={groups.completed}
            onEdit={(t) => {
              setEditing(t);
              setDialogOpen(true);
            }}
          />
        </div>
      )}

      <TaskDialog open={dialogOpen} task={editing} onClose={() => setDialogOpen(false)} />
    </AppShell>
  );
}

function Section({
  title,
  tasks,
  onEdit,
}: {
  title: string;
  tasks: Task[];
  onEdit: (t: Task) => void;
}) {
  if (tasks.length === 0) return null;
  return (
    <div className="px-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-[13px] font-semibold uppercase tracking-wider text-subtle">
          {title}
        </h2>
        <span className="text-[11px] text-subtle">{tasks.length}</span>
      </div>
      <div className="space-y-2.5">
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} onEdit={onEdit} onDelete={(x) => deleteTask(x.id)} />
        ))}
      </div>
    </div>
  );
}
