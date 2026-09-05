import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import {
  CalendarCheck,
  CheckSquare,
  Settings as SettingsIcon,
  Timer,
  BarChart3,
} from "lucide-react";

import { useAndroidBackButton } from "@/hooks/use-back-button";
import {
  hydrate,
  setFlashHandler,
  resyncClock,
  tick,
  useAppState,
  useHydrated,
} from "@/lib/focus-store";

const NAV = [
  { to: "/", label: "Today", icon: CalendarCheck, exact: true },
  { to: "/tasks", label: "Tasks", icon: CheckSquare, exact: false },
  { to: "/focus", label: "Focus", icon: Timer, exact: false },
  { to: "/stats", label: "Stats", icon: BarChart3, exact: false },
] as const;

function useEngine() {
  const { settings } = useAppState();

  useEffect(() => {
    hydrate();
    setFlashHandler((title, body) => toast(title, { description: body }));
    resyncClock();
    const id = window.setInterval(tick, 250);
    const onVisible = () => resyncClock();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const prefersLight =
        settings.theme === "light" ||
        (settings.theme === "system" && window.matchMedia("(prefers-color-scheme: light)").matches);
      root.classList.toggle("light", prefersLight);
      root.classList.toggle("dark", !prefersLight);
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [settings.theme]);
}

export function AppShell({ children }: { children: ReactNode }) {
  useEngine();
  useAndroidBackButton();
  const hydrated = useHydrated();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <header className="flex items-center justify-between px-5 pb-4 pt-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl border border-primary/25 bg-primary/10 shadow-glow">
              <div className="size-3.5 rounded-full bg-primary animate-breathe" />
            </div>
            <div>
              <div className="font-display text-[15px] font-semibold leading-none tracking-tight">
                FocusFlow
              </div>
              <div className="mt-1 text-[10px] text-subtle">{today}</div>
            </div>
          </Link>
          <Link
            to="/settings"
            aria-label="Settings"
            className="grid size-9 place-items-center rounded-xl border border-line bg-panel text-muted-foreground transition active:scale-95"
          >
            <SettingsIcon className="size-4" />
          </Link>
        </header>

        <main className="flex-1 pb-20">{hydrated ? children : null}</main>

        <nav className="sticky bottom-0 px-4 pb-6 pt-3 backdrop-blur-sm">
          <div className="grid grid-cols-4 items-center rounded-2xl border border-line bg-panel/85 px-2 py-2.5">
            {NAV.map(({ to, label, icon: Icon, exact }) => {
              const active = exact ? pathname === to : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex flex-col items-center gap-1 py-1 transition-colors ${
                    active ? "text-primary" : "text-subtle"
                  }`}
                >
                  <Icon className="size-[18px]" />
                  <span className="text-[10px] font-medium">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-5">
      <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-1 text-[13px] text-subtle">{subtitle}</p> : null}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-5 rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <p className="font-display text-[15px] font-semibold">{title}</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-subtle">{body}</p>
    </div>
  );
}
