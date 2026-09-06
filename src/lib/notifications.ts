/**
 * Session-end notifications.
 *
 * Inside the Android app the WebView can be frozen or killed while a session
 * runs, so JavaScript is often not alive at the moment a timer ends. Firing a
 * notification from `completeInterval` would therefore fail in exactly the case
 * that matters. Instead we hand the end time to the OS up front and let it
 * deliver — scheduling on start, re-scheduling when the end time moves, and
 * cancelling on pause/reset.
 *
 * On the web there is no scheduling primitive, so we keep the original
 * behaviour: fire a Notification at completion, which is fine because the tab
 * has to be alive for the timer to complete at all.
 */
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

/** Single reused id — there is only ever one pending session-end notification. */
const SESSION_END_ID = 1001;

/**
 * Android freezes a channel's importance, sound and vibration when it is first
 * created, and later edits are ignored for anyone who already has it. Changing
 * how the alert behaves therefore means publishing a *new* channel id — hence
 * the version suffix. Bump it again if these settings ever need to change.
 *
 * Capacitor's implicit `default` channel is importance 3 with no vibration,
 * which lands the alert silently in the shade; this one is MAX so it comes in
 * as a heads-up banner with sound and vibration even when the app is closed.
 */
const SESSION_CHANNEL_ID = "session-alerts-v2";

/**
 * Must name a real file in `android/app/src/main/res/raw`. Capacitor gives the
 * channel *no* sound when the file is missing, rather than falling back to the
 * system default, so a typo here would make the alert silent.
 */
const SESSION_SOUND = "session_end.wav";

export const isNativeApp = () => Capacitor.isNativePlatform();

/** Last end time handed to the OS, so repeated ticks don't re-schedule. */
let scheduledFor: number | null = null;

/** Created once per launch; the OS ignores repeat calls for the same id. */
let channelReady: Promise<void> | null = null;

function ensureChannel(): Promise<void> {
  if (!isNativeApp()) return Promise.resolve();
  channelReady ??= LocalNotifications.createChannel({
    id: SESSION_CHANNEL_ID,
    name: "Session alerts",
    description: "Sounds when a focus session or break ends.",
    importance: 5,
    visibility: 1,
    sound: SESSION_SOUND,
    vibration: true,
    lights: true,
  }).catch(() => {
    /* channel unavailable — schedule anyway, the OS falls back to default */
  });
  return channelReady;
}

export function notificationsSupported(): boolean {
  if (typeof window === "undefined") return false;
  return isNativeApp() || "Notification" in window;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    if (isNativeApp()) {
      const { display } = await LocalNotifications.requestPermissions();
      // Create it now so the alert's sound and importance are visible under the
      // app's notification settings before a session has ever been run.
      if (display === "granted") await ensureChannel();
      return display === "granted";
    }
    if (!("Notification" in window)) return false;
    if (Notification.permission === "default") {
      return (await Notification.requestPermission()) === "granted";
    }
    return Notification.permission === "granted";
  } catch {
    return false;
  }
}

/** Schedule (or re-schedule) the session-end notification for `at`. */
export function scheduleSessionEnd(at: number, title: string, body: string): void {
  if (!isNativeApp()) return;
  if (scheduledFor === at) return;
  scheduledFor = at;
  void (async () => {
    try {
      await ensureChannel();
      await LocalNotifications.cancel({ notifications: [{ id: SESSION_END_ID }] });
      // A time already past would fire immediately on some OS versions.
      if (at - Date.now() < 500) return;
      await LocalNotifications.schedule({
        notifications: [
          {
            id: SESSION_END_ID,
            title,
            body,
            channelId: SESSION_CHANNEL_ID,
            schedule: { at: new Date(at), allowWhileIdle: true },
          },
        ],
      });
    } catch {
      /* notifications unavailable — the in-app toast still fires */
    }
  })();
}

export function cancelSessionEnd(): void {
  if (!isNativeApp()) return;
  if (scheduledFor === null) return;
  scheduledFor = null;
  void LocalNotifications.cancel({ notifications: [{ id: SESSION_END_ID }] }).catch(() => {
    /* nothing pending */
  });
}

/**
 * Show a notification right now. Web only: on the device the scheduled one
 * covers it, and firing a second here would double up.
 */
export function showNow(title: string, body: string): void {
  if (isNativeApp()) return;
  if (typeof window === "undefined" || !("Notification" in window)) return;
  try {
    if (Notification.permission === "granted") new Notification(title, { body });
  } catch {
    /* notifications unsupported */
  }
}
