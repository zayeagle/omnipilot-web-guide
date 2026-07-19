import type { ClickPlanStep } from './build-click-plan';

export type PlanSession = {
  token: string;
  tabId: number;
  steps: ClickPlanStep[];
  goal: string;
  expiresAt: number;
};

const TTL_MS = 5 * 60 * 1000;
const sessions = new Map<string, PlanSession>();

function newToken(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `opg_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function prune(): void {
  const now = Date.now();
  for (const [k, v] of sessions) {
    if (v.expiresAt <= now) sessions.delete(k);
  }
}

/** Store a confirmed-capable plan; returns one-time token. */
export function createPlanSession(opts: {
  tabId: number;
  steps: ClickPlanStep[];
  goal: string;
}): string {
  prune();
  const token = newToken();
  sessions.set(token, {
    token,
    tabId: opts.tabId,
    steps: opts.steps.map((s) => ({ ...s })),
    goal: opts.goal,
    expiresAt: Date.now() + TTL_MS,
  });
  return token;
}

/** Consume a plan token (one-time). Returns null if missing/expired/wrong tab. */
export function consumePlanSession(
  token: string,
  tabId: number,
): PlanSession | null {
  prune();
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  if (session.tabId !== tabId) return null;
  sessions.delete(token);
  return session;
}

/** Test helper */
export function clearPlanSessionsForTests(): void {
  sessions.clear();
}
