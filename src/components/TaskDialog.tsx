import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  addTask,
  dayKey,
  updateTask,
  type Priority,
  type Task,
} from "@/lib/focus-store";

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export function TaskDialog({
  open,
  task,
  defaultDate,
  onClose,
}: {
  open: boolean;
  task: Task | null;
  defaultDate?: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setPriority(task?.priority ?? "medium");
    setDueDate(task?.dueDate ?? defaultDate ?? dayKey());
    setDueTime(task?.dueTime ?? "");
  }, [open, task, defaultDate]);

  if (!open) return null;

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const payload = {
      title: trimmed,
      priority,
      dueDate: dueDate || null,
      dueTime: dueTime || null,
    };
    if (task) updateTask(task.id, payload);
    else addTask(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl border border-line bg-panel p-5 pb-8 animate-rise sm:rounded-3xl sm:pb-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[17px] font-semibold">
            {task ? "Edit task" : "New task"}
          </h2>
          <button
            aria-label="Close"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg border border-line text-subtle"
          >
            <X className="size-4" />
          </button>
        </div>

        <label className="block text-[11px] uppercase tracking-wider text-subtle">Task</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="What needs doing?"
          className="mt-1.5 w-full rounded-xl border border-line bg-panel2 px-3.5 py-3 text-[14px] outline-none placeholder:text-subtle focus:border-primary/50"
        />

        <div className="mt-4 text-[11px] uppercase tracking-wider text-subtle">Priority</div>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              onClick={() => setPriority(p.value)}
              className={`rounded-xl border px-3 py-2.5 text-[13px] font-medium transition ${
                priority === p.value
                  ? "border-primary/50 bg-primary/12 text-primary"
                  : "border-line bg-panel2 text-muted-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-subtle">
              Due date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-panel2 px-3 py-2.5 text-[13px] outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-subtle">
              Time (optional)
            </label>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-panel2 px-3 py-2.5 text-[13px] outline-none focus:border-primary/50"
            />
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!title.trim()}
          className="mt-5 h-13 w-full rounded-2xl bg-primary py-4 font-display text-[15px] font-bold tracking-tight text-primary-foreground shadow-glow transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
        >
          {task ? "Save changes" : "Add task"}
        </button>
      </div>
    </div>
  );
}
