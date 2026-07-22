/**
 * Sticky operate intent for「帮我操作」.
 * Chat corrections / complaints must not replace the real page-action goal.
 */

const INTENT_TAIL =
  /(?:只是要|只是想|只要|只想|我要|我想要|我想|需要|帮我|替我|为我)\s*(.+)$/u;

const META_FEEDBACK =
  /^(你为什么|为什么要|为啥要|这不对|不对啊|错了|太多了|少了|我说的不是|不是让你|别执行|不要执行)/u;

const META_ABOUT_STEPS =
  /(为什么要执行|执行两步|两步|一步就|只要一步|不需要.*步|多余的?步骤)/u;

const ACTIONISH =
  /(打开|点击|点一下|进入|跳到|切换到|选择|播放|暂停|关闭|搜索|提交|怎么|如何|怎样|how\s+to|open|click|go\s+to)/i;

export function extractEmbeddedIntent(message: string): string | null {
  const t = message.trim();
  if (!t) return null;
  const m = t.match(INTENT_TAIL);
  const tail = m?.[1]?.trim();
  if (tail && tail.length >= 2 && ACTIONISH.test(tail)) return tail;
  if (tail && tail.length >= 2 && /[\u4e00-\u9fff]{2,}/.test(tail)) return tail;
  return null;
}

export function isMetaOperateFeedback(message: string): boolean {
  const t = message.trim();
  if (!t) return true;
  if (extractEmbeddedIntent(t)) return false;
  if (META_FEEDBACK.test(t)) return true;
  if (META_ABOUT_STEPS.test(t) && !ACTIONISH.test(t)) return true;
  return false;
}

/**
 * Update sticky operate goal from a new user chat line.
 * Returns previous goal when the line is meta feedback without a new intent.
 */
export function resolveOperateGoal(message: string, previousGoal: string): string {
  const t = message.trim();
  if (!t) return previousGoal;

  const embedded = extractEmbeddedIntent(t);
  if (embedded) return embedded;

  if (isMetaOperateFeedback(t)) return previousGoal;

  return t;
}
