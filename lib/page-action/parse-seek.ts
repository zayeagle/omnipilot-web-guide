/** Parse "jump to time" intents from a user goal. */

export type SeekIntent = {
  seconds: number;
  display: string;
};

function pad(n: number): string {
  return String(Math.floor(n)).padStart(2, '0');
}

export function formatSeconds(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${m}:${pad(sec)}`;
}

/**
 * Detect seek/jump-to-time goals like「跳到20:00」「进度到 1:30」「seek to 2:05」.
 */
export function parseSeekIntent(goal: string): SeekIntent | null {
  const g = goal.trim();
  if (!g) return null;

  const looksSeek =
    /(跳到|跳转|进度|seek|scrub|快进到|定位到|拖到)/i.test(g) ||
    /\bto\s+\d/i.test(g);
  if (!looksSeek && !/\d{1,2}:\d{2}/.test(g)) return null;

  // H:MM:SS or M:SS
  const hms = g.match(/(\d{1,2}):(\d{2}):(\d{2})/);
  if (hms) {
    const seconds =
      Number(hms[1]) * 3600 + Number(hms[2]) * 60 + Number(hms[3]);
    return { seconds, display: formatSeconds(seconds) };
  }
  const ms = g.match(/(\d{1,3}):(\d{2})(?!\d)/);
  if (ms) {
    const seconds = Number(ms[1]) * 60 + Number(ms[2]);
    return { seconds, display: formatSeconds(seconds) };
  }

  const mins = g.match(/(\d+(?:\.\d+)?)\s*(分钟|分|min|minutes?)/i);
  if (mins) {
    const seconds = Math.round(Number(mins[1]) * 60);
    return { seconds, display: formatSeconds(seconds) };
  }
  const secs = g.match(/(\d+)\s*(秒|s|sec|seconds?)/i);
  if (secs && looksSeek) {
    const seconds = Number(secs[1]);
    return { seconds, display: formatSeconds(seconds) };
  }

  return null;
}
