import type { Candidate } from '../scanner';

/** Goal ↔ control label synonyms (media / common UI). */
const SYNONYM_GROUPS: string[][] = [
  ['播放', 'play', '播放视频', '开始播放', 'resume'],
  ['暂停', 'pause', '暂停播放'],
  ['静音', 'mute', '取消静音', 'unmute', '静音/取消静音'],
  ['全屏', 'fullscreen', '退出全屏', 'full screen'],
  ['字幕', 'subtitle', 'captions', 'cc'],
  ['设置', 'settings', '选项'],
  ['搜索', 'search', '查找'],
  ['关闭', 'close', 'dismiss'],
  ['下一步', 'next', '下一个'],
  ['上一个', 'previous', 'prev', '上一首'],
  ['点赞', 'like', '赞'],
  ['分享', 'share'],
  ['订阅', 'subscribe'],
  ['进度', 'progress', 'seek', 'scrubber', '进度条'],
];

function labelsOf(c: Pick<Candidate, 'text' | 'ariaLabel'>): string[] {
  return [c.text, c.ariaLabel]
    .map((s) => (s || '').trim())
    .filter((s) => s.length >= 1);
}

function synonymBoost(goal: string, label: string): number {
  const g = goal.toLowerCase();
  const l = label.toLowerCase();
  let boost = 0;
  for (const group of SYNONYM_GROUPS) {
    const goalHit = group.some((w) => g.includes(w.toLowerCase()));
    const labelHit = group.some((w) => l.includes(w.toLowerCase()));
    if (goalHit && labelHit) boost = Math.max(boost, 28);
  }
  return boost;
}

/** Score how well a scanned control matches the user goal (0 = no match). */
export function scoreClickTarget(
  question: string,
  candidate: Pick<Candidate, 'uid' | 'text' | 'ariaLabel'>,
): { score: number; label: string } {
  const q = question.trim().toLowerCase();
  if (!q) return { score: 0, label: '' };

  let bestLabel = '';
  let best = 0;

  for (const label of labelsOf(candidate)) {
    const needle = label.toLowerCase().slice(0, 80);
    let score = 0;
    if (needle.length >= 2 && q.includes(needle)) {
      score += 40 + Math.min(needle.length, 24);
    } else if (needle.length >= 2 && needle.includes(q.slice(0, Math.min(8, q.length)))) {
      score += 12;
    }
    // Partial: any 2+ char chunk of the label appears in the goal
    if (score === 0 && /[\u4e00-\u9fff]/.test(needle)) {
      for (let i = 0; i < needle.length - 1; i++) {
        const chunk = needle.slice(i, i + 2);
        if (q.includes(chunk)) {
          score += 8;
          break;
        }
      }
    }
    for (const word of needle.split(/[\s/|·\-_/]+/).filter((w) => w.length >= 2)) {
      if (q.includes(word)) score += 6;
    }
    score += synonymBoost(q, needle);
    if (score > best) {
      best = score;
      bestLabel = label;
    }
  }

  return { score: best, label: bestLabel };
}

/** Pick the best scanned control for a user question (live scan — no analyze required). */
export function matchClickTarget(
  question: string,
  candidates: Array<Pick<Candidate, 'uid' | 'text' | 'ariaLabel'>>,
): { uid: string; label: string } | null {
  if (!question.trim() || !candidates.length) return null;

  let best: { uid: string; label: string; score: number } | null = null;
  for (const c of candidates) {
    const { score, label } = scoreClickTarget(question, c);
    if (score <= 0) continue;
    if (!best || score > best.score) {
      best = { uid: c.uid, label: label || c.text || c.ariaLabel || c.uid, score };
    }
  }
  // Require a minimum score so unrelated noise doesn't win
  if (!best || best.score < 8) return null;
  return { uid: best.uid, label: best.label };
}

/** Rank all candidates that score above threshold. */
export function rankClickTargets(
  question: string,
  candidates: Array<Pick<Candidate, 'uid' | 'text' | 'ariaLabel'>>,
  limit = 5,
): Array<{ uid: string; label: string; score: number }> {
  return candidates
    .map((c) => {
      const { score, label } = scoreClickTarget(question, c);
      return {
        uid: c.uid,
        label: label || c.text || c.ariaLabel || c.uid,
        score,
      };
    })
    .filter((x) => x.score >= 8)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
