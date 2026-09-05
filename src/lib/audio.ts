/**
 * Tiny WebAudio helper: a soft completion chime and a low ambient focus tone.
 * Everything is synthesised — no audio files to download.
 */

let ctx: AudioContext | null = null;
let ambient: { osc: OscillatorNode[]; gain: GainNode } | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Must be called from a user gesture on mobile so audio is allowed later. */
export function unlockAudio() {
  getCtx();
}

export function playChime() {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const notes = [880, 1174.7, 1567.98];
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = now + i * 0.14;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.16, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.1);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + 1.2);
  });
}

export function startAmbient() {
  const ac = getCtx();
  if (!ac || ambient) return;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.035, ac.currentTime + 2.5);
  gain.connect(ac.destination);

  const osc: OscillatorNode[] = [];
  [110, 164.81, 220.5].forEach((freq) => {
    const o = ac.createOscillator();
    o.type = "sine";
    o.frequency.value = freq;
    const g = ac.createGain();
    g.gain.value = freq > 200 ? 0.25 : 0.6;
    o.connect(g).connect(gain);
    o.start();
    osc.push(o);
  });
  ambient = { osc, gain };
}

export function stopAmbient() {
  const ac = ctx;
  if (!ac || !ambient) return;
  const { osc, gain } = ambient;
  ambient = null;
  const now = ac.currentTime;
  try {
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
  } catch {
    /* ignore */
  }
  osc.forEach((o) => {
    try {
      o.stop(now + 1.3);
    } catch {
      /* ignore */
    }
  });
}
