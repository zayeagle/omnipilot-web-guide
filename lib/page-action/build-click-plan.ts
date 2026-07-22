import { matchClickTarget, rankClickTargets } from './match-click-target';
import { parseSeekIntent } from './parse-seek';

/**
 * One step in an operate chain.
 * A chain is 1..N steps — a single click/seek is a valid 1-step chain.
 */
export type ClickPlanStep =
  | { kind: 'click'; uid: string; label: string }
  | { kind: 'seek'; seconds: number; label: string };

export type ClickPlan = {
  goal: string;
  steps: ClickPlanStep[];
};

export type PlanFeature = {
  uid: string;
  name: string;
  description: string;
  howTo: string[];
};

export type PlanCandidate = {
  uid: string;
  text: string;
  ariaLabel: string;
};

function scoreFeature(goal: string, f: PlanFeature): number {
  const g = goal.toLowerCase();
  let score = 0;
  const name = (f.name || '').toLowerCase();
  const desc = (f.description || '').toLowerCase();
  if (name && g.includes(name)) score += 20 + name.length;
  if (desc) {
    for (const part of desc.split(/[\s,，。；;]/).filter((p) => p.length >= 2)) {
      if (g.includes(part)) score += Math.min(part.length, 12);
    }
  }
  for (const step of f.howTo || []) {
    const s = step.toLowerCase();
    if (s.length >= 2 && g.includes(s.slice(0, Math.min(12, s.length)))) {
      score += 4;
    }
  }
  return score;
}

/**
 * Build an operate chain (1 or more steps) from live scan + optional features.
 */
export function buildClickPlan(opts: {
  goal: string;
  features: PlanFeature[];
  candidates: PlanCandidate[];
  locale?: 'zh' | 'en';
}): ClickPlan | null {
  const goal = opts.goal.trim();
  if (!goal) return null;
  const zh = opts.locale !== 'en';

  // Seek / jump-to-time is a single-step chain (not a button click).
  const seek = parseSeekIntent(goal);
  if (seek) {
    return {
      goal,
      steps: [
        {
          kind: 'seek',
          seconds: seek.seconds,
          label: zh
            ? `将视频/音频进度跳到 ${seek.display}`
            : `Seek media to ${seek.display}`,
        },
      ],
    };
  }

  const steps: ClickPlanStep[] = [];
  const seen = new Set<string>();

  const pushClick = (uid: string, label: string) => {
    if (!uid || seen.has(uid)) return;
    seen.add(uid);
    steps.push({ kind: 'click', uid, label: label.trim() || uid });
  };

  // Explicit multi-step wording only — otherwise prefer a single clear click.
  const wantsMulti =
    /(步骤|依次|然后|接着|再点|一步步|按顺序|step\s*by\s*step|and\s+then|then\s+click)/i.test(
      goal,
    );

  // Primary: best live-scan match
  const ranked = rankClickTargets(goal, opts.candidates, 5);
  const primary = ranked[0];
  if (primary && !wantsMulti) {
    // Clear single control in the goal → do not expand unrelated howTo steps.
    return {
      goal,
      steps: [{ kind: 'click', uid: primary.uid, label: primary.label }],
    };
  }
  if (primary) {
    pushClick(primary.uid, primary.label);
  }

  // Optional extra steps from analyzed howTo (only when multi-step requested
  // or when there is still no primary match).
  let best: { f: PlanFeature; score: number } | null = null;
  for (const f of opts.features) {
    const score = scoreFeature(goal, f);
    if (score <= 0) continue;
    if (!best || score > best.score) best = { f, score };
  }
  if (best && (wantsMulti || !steps.length)) {
    for (const line of best.f.howTo || []) {
      const hit = matchClickTarget(line, opts.candidates);
      if (hit) pushClick(hit.uid, hit.label);
    }
    if (!steps.length) pushClick(best.f.uid, best.f.name);
  }

  if (!steps.length) {
    const direct = matchClickTarget(goal, opts.candidates);
    if (direct) pushClick(direct.uid, direct.label);
  }

  if (!steps.length) return null;
  return { goal, steps };
}

export function formatClickPlan(
  plan: ClickPlan,
  locale: 'zh' | 'en',
): string {
  const n = plan.steps.length;
  const lines = plan.steps.map((s, i) => `${i + 1}. ${s.label}`);
  if (locale === 'zh') {
    return (
      `将按以下操作步骤执行（共 ${n} 步，1 步也算完整链路，请确认）：\n\n` +
      `目标：${plan.goal}\n\n` +
      lines.join('\n') +
      `\n\n确认后才会执行；可取消。\n` +
      `（基于当前页面实时扫描，无需先点「分析页面」。）`
    );
  }
  return (
    `I will run these steps (${n} step${n === 1 ? '' : 's'} — a single step is a valid chain):\n\n` +
    `Goal: ${plan.goal}\n\n` +
    lines.join('\n') +
    `\n\nNothing runs until you confirm. You can cancel.\n` +
    `(Live page scan — Analyze is not required.)`
  );
}
