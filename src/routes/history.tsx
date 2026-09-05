import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { AppShell, EmptyState, PageTitle } from "@/components/AppShell";
import { dayKey, formatMinutes, useAppState, type FocusSession } from "@/lib/focus-store";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — FocusFlow" },
      {
        name: "description",
        content:
          "Browse every completed focus session with its date, time, duration and the task you worked on.",
      },
      { property: "og:title", content: "History — FocusFlow" },
      { property: "og:description", content: "Every focus session you've completed." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { sessions } = useAppState();

  const grouped = useMemo(() => {
    const map = new Map<string, FocusSession[]>();
    [...sessions]
      .sort((a, b) => b.endedAt - a.endedAt)
      .forEach((s) => {
        const key = dayKey(s.endedAt);
        map.set(key, [...(map.get(key) ?? []), s]);
      });
    return [...map.entries()];
  }, [sessions]);

  const todayKey = dayKey();

  return (
    <AppShell>
      <PageTitle title="History" subtitle="Every session you've finished." />

      {grouped.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No focus sessions yet."
            body="Complete your first session to see it here."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {grouped.map(([key, items]) => (
            <div key={key} className="px-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-[13px] font-semibold uppercase tracking-wider text-subtle">
                  {key === todayKey
                    ? "Today"
                    : new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                </h2>
                <span className="text-[11px] text-subtle">
                  {formatMinutes(items.reduce((n, s) => n + s.minutes, 0))}
                </span>
              </div>
              <div className="space-y-2.5">
                {items.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-3.5"
                  >
                    <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 font-display text-[12px] font-semibold text-primary">
                      {s.minutes}m
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px]">
                        {s.taskTitle ?? "Focus session"}
                      </div>
                      <div className="mt-0.5 text-[11px] text-subtle">
                        {new Date(s.endedAt).toLocaleTimeString(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
