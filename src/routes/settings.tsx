import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { AppShell, PageTitle } from "@/components/AppShell";
import { playChime, unlockAudio } from "@/lib/audio";
import {
  clearCompletedTasks,
  requestNotificationPermission,
  resetAllData,
  syncAmbient,
  updateSettings,
  useAppState,
  type ThemePref,
} from "@/lib/focus-store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — FocusFlow" },
      {
        name: "description",
        content:
          "Adjust focus and break lengths, appearance, notifications, and manage the data stored on your device.",
      },
      { property: "og:title", content: "Settings — FocusFlow" },
      { property: "og:description", content: "Tune your timer, theme and notifications." },
    ],
  }),
  component: SettingsPage,
});

const THEMES: { value: ThemePref; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

function SettingsPage() {
  const { settings, tasks } = useAppState();
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <AppShell>
      <PageTitle title="Settings" subtitle="Everything stays on this device." />

      <Section title="Timer">
        <NumberRow
          label="Focus duration"
          suffix="min"
          value={settings.focusMin}
          min={1}
          max={120}
          onChange={(focusMin) => updateSettings({ focusMin })}
        />
        <NumberRow
          label="Short break"
          suffix="min"
          value={settings.shortMin}
          min={1}
          max={60}
          onChange={(shortMin) => updateSettings({ shortMin })}
        />
        <NumberRow
          label="Long break"
          suffix="min"
          value={settings.longMin}
          min={1}
          max={90}
          onChange={(longMin) => updateSettings({ longMin })}
        />
        <NumberRow
          label="Sessions before long break"
          value={settings.sessionsBeforeLong}
          min={2}
          max={10}
          onChange={(sessionsBeforeLong) => updateSettings({ sessionsBeforeLong })}
        />
      </Section>

      <Section title="Appearance">
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-[14px]">Theme</span>
          <div className="flex gap-1.5">
            {THEMES.map((t) => (
              <button
                key={t.value}
                onClick={() => updateSettings({ theme: t.value })}
                className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition ${
                  settings.theme === t.value
                    ? "border-primary/50 bg-primary/12 text-primary"
                    : "border-line bg-panel2 text-muted-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Sound">
        <ToggleRow
          label="Completion chime"
          hint="A soft three-note chime when a session or break ends."
          checked={settings.sounds}
          onChange={(next) => {
            updateSettings({ sounds: next });
            if (next) {
              unlockAudio();
              playChime();
            }
          }}
        />
        <ToggleRow
          label="Ambient focus tone"
          hint="A quiet background hum while you're focusing."
          checked={settings.ambientSound}
          onChange={(next) => {
            unlockAudio();
            updateSettings({ ambientSound: next });
            syncAmbient();
          }}
        />
      </Section>

      <Section title="Notifications">
        <div className="flex items-center justify-between px-4 py-3.5">
          <div>
            <div className="text-[14px]">Timer notifications</div>
            <div className="mt-0.5 text-[11px] text-subtle">
              Alerts when a session or break ends.
            </div>
          </div>
          <button
            role="switch"
            aria-checked={settings.notifications}
            onClick={() => {
              const next = !settings.notifications;
              updateSettings({ notifications: next });
              if (next) requestNotificationPermission();
            }}
            className={`h-7 w-12 rounded-full border transition ${
              settings.notifications ? "border-primary bg-primary/80" : "border-line bg-panel2"
            }`}
          >
            <span
              className={`block size-5 rounded-full bg-background transition-transform ${
                settings.notifications ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </Section>

      <Section title="Data">
        <button
          onClick={() => {
            if (completedCount === 0) {
              toast("Nothing to clear", { description: "You have no completed tasks." });
              return;
            }
            if (window.confirm(`Delete ${completedCount} completed task(s)?`)) {
              clearCompletedTasks();
              toast("Completed tasks cleared");
            }
          }}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left text-[14px]"
        >
          Clear completed tasks
          <span className="text-[12px] text-subtle">{completedCount}</span>
        </button>
        <div className="h-px bg-line" />
        <button
          onClick={() => {
            if (
              window.confirm(
                "Reset all productivity data? Tasks, sessions and stats will be permanently deleted.",
              )
            ) {
              resetAllData();
              toast("All data reset");
            }
          }}
          className="w-full px-4 py-3.5 text-left text-[14px] text-destructive"
        >
          Reset all productivity data
        </button>
      </Section>

      <p className="mt-8 px-5 text-center text-[11px] text-subtle">
        FocusFlow works offline. No account, no cloud.
      </p>
    </AppShell>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div className="pr-4">
        <div className="text-[14px]">{label}</div>
        {hint ? <div className="mt-0.5 text-[11px] text-subtle">{hint}</div> : null}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`h-7 w-12 shrink-0 rounded-full border transition ${
          checked ? "border-primary bg-primary/80" : "border-line bg-panel2"
        }`}
      >
        <span
          className={`block size-5 rounded-full bg-background transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-7 px-5">
      <h2 className="mb-3 font-display text-[13px] font-semibold uppercase tracking-wider text-subtle">
        {title}
      </h2>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
        {children}
      </div>
    </div>
  );
}

function NumberRow({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-[14px]">{label}</span>
      <div className="flex items-center gap-2">
        <button
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(clamp(value - 1))}
          className="grid size-8 place-items-center rounded-lg border border-line bg-panel2 text-muted-foreground active:scale-95"
        >
          −
        </button>
        <span className="w-14 text-center font-display text-[15px] tabular-nums">
          {value}
          {suffix ? <span className="text-[11px] text-subtle"> {suffix}</span> : null}
        </span>
        <button
          aria-label={`Increase ${label}`}
          onClick={() => onChange(clamp(value + 1))}
          className="grid size-8 place-items-center rounded-lg border border-line bg-panel2 text-muted-foreground active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}
