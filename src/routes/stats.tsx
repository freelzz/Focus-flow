import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, ChevronRight } from "lucide-react";

import { AppShell, PageTitle } from "@/components/AppShell";
import {
  currentStreak,
  dayKey,
  formatMinutes,
  last7Days,
  statsForDay,
  useAppState,
  weekStats,
} from "@/lib/focus-store";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Statistics — FocusFlow" },
      {
        name: "description",
        content:
          "Track focus minutes, completed sessions and tasks for today and this week, plus your current focus streak.",
      },
      { property: "og:title", content: "Statistics — FocusFlow" },
      {
        property: "og:description",
        content: "Your focus minutes, sessions and streak at a glance.",
      },
    ],
  }),
  component: StatsPage,
});

function StatsPage() {
  const state = useAppState();
  const today = statsForDay(state);
  const week = weekStats(state);
  const days = last7Days(state);
  const streak = currentStreak(state);
  const weekKeys = new Set(days.map((d) => d.key));
  const weekSessions = state.sessions.filter((s) => weekKeys.has(dayKey(s.endedAt))).length;
  const peak = Math.max(30, ...days.map((d) => d.minutes));

  return (
    <AppShell>
      <PageTitle title="Statistics" subtitle="A quiet look at how your week is going." />

      <div className="mt-5 px-5">
        <div className="rounded-2xl border border-primary/25 bg-panel2 px-5 py-4 shadow-glow">
          <div className="flex items-center gap-3">
            <Flame className="size-6 text-primary" />
            <div>
              <div className="font-display text-2xl font-bold leading-none">
                {streak} {streak === 1 ? "day" : "days"}
              </div>
              <div className="mt-1 text-[12px] text-subtle">Current focus streak</div>
            </div>
          </div>
        </div>
      </div>

      <Group title="Today">
        <Metric label="Tasks completed" value={`${today.tasksCompleted}`} />
        <Metric label="Focus sessions" value={`${today.sessions}`} />
        <Metric label="Focus minutes" value={`${today.minutes}`} accent />
      </Group>

      <Group title="This week">
        <Metric label="Focus time" value={formatMinutes(week.minutes)} accent />
        <Metric label="Tasks done" value={`${week.tasks}`} />
        <Metric label="Sessions" value={`${weekSessions}`} />
      </Group>

      <div className="mt-7 px-5">
        <h2 className="mb-3 font-display text-[13px] font-semibold uppercase tracking-wider text-subtle">
          Focus minutes · last 7 days
        </h2>
        <div className="rounded-2xl border border-line bg-panel px-4 pb-3 pt-5">
          <div className="flex h-32 items-end gap-2">
            {days.map((d) => (
              <div key={d.key} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-full w-full items-end">
                  <div
                    className="w-full rounded-t-md bg-primary/80 transition-[height] duration-500"
                    style={{ height: `${Math.max(2, (d.minutes / peak) * 100)}%` }}
                    title={`${d.minutes} min`}
                  />
                </div>
                <span className="text-[10px] text-subtle">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 px-5">
        <Link
          to="/history"
          className="flex items-center justify-between rounded-2xl border border-line bg-panel px-4 py-4 text-[14px]"
        >
          Session history
          <ChevronRight className="size-4 text-subtle" />
        </Link>
      </div>
    </AppShell>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-7 px-5">
      <h2 className="mb-3 font-display text-[13px] font-semibold uppercase tracking-wider text-subtle">
        {title}
      </h2>
      <div className="grid grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-panel px-3 py-3">
      <div className={`font-display text-xl ${accent ? "text-primary" : ""}`}>{value}</div>
      <div className="mt-1 text-[10px] leading-tight text-subtle">{label}</div>
    </div>
  );
}
