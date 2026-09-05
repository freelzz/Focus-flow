import { Check, Pencil, Trash2 } from "lucide-react";
import { formatTime, toggleTask, type Task } from "@/lib/focus-store";

const PRIORITY: Record<Task["priority"], { label: string; className: string }> = {
  high: { label: "High", className: "bg-primary/15 text-primary" },
  medium: { label: "Med", className: "bg-foreground/10 text-muted-foreground" },
  low: { label: "Low", className: "bg-foreground/5 text-subtle" },
};

export function TaskRow({
  task,
  focusing,
  onEdit,
  onDelete,
}: {
  task: Task;
  focusing?: boolean;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}) {
  const priority = PRIORITY[task.priority];
  const meta = task.dueTime
    ? formatTime(task.dueTime)
    : task.dueDate
      ? new Date(`${task.dueDate}T12:00:00`).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      : "No time set";

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-colors ${
        focusing ? "border-primary/30 bg-panel2 shadow-glow" : "border-line bg-panel"
      }`}
    >
      <button
        aria-label={task.completed ? "Mark as not done" : "Mark as done"}
        onClick={() => toggleTask(task.id)}
        className={`grid size-5 shrink-0 place-items-center rounded-md border transition ${
          task.completed
            ? "border-primary bg-primary text-primary-foreground"
            : "border-line bg-transparent"
        }`}
      >
        {task.completed ? <Check className="size-3 animate-pop" strokeWidth={3} /> : null}
      </button>

      <button
        onClick={() => onEdit?.(task)}
        className="min-w-0 flex-1 text-left"
        disabled={!onEdit}
      >
        <div
          className={`truncate text-[14px] ${
            task.completed ? "text-subtle line-through" : "text-foreground"
          }`}
        >
          {task.title}
        </div>
        {focusing ? (
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-primary">
            <span className="size-1.5 rounded-full bg-primary" /> Focusing now
          </div>
        ) : (
          <div className="mt-0.5 text-[11px] text-subtle">{meta}</div>
        )}
      </button>

      <span
        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${priority.className}`}
      >
        {priority.label}
      </span>

      {onEdit ? (
        <button
          aria-label="Edit task"
          onClick={() => onEdit(task)}
          className="text-subtle transition active:scale-90"
        >
          <Pencil className="size-3.5" />
        </button>
      ) : null}
      {onDelete ? (
        <button
          aria-label="Delete task"
          onClick={() => onDelete(task)}
          className="text-subtle transition active:scale-90"
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
