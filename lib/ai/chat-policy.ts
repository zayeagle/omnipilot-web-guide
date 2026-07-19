import type { UiLocale } from '../i18n/locale';

/**
 * Chat policy for host-page side effects.
 * - Guidance (how-to) is always allowed.
 * - DOM/CSS/script mutation is always refused.
 * - Assisted click/operate requires opt-in + explicit user confirmation (UI).
 */

const HOW_TO =
  /^(怎么|如何|怎样|咋|请问怎么|请问如何|how\s+(do|can|to|should|would)|where\s+(do|can|is|are)|what\s+(should|do)\s+i)/i;

const ASSIST_CLICK_ZH =
  /(帮我|替我|为我|给我|代我|麻烦你|请你|你来|你直接|自动).{0,20}(点一下|点击|点选|按下|按一下)/;

const ASSIST_CLICK_EN =
  /\b((please|can you|could you|would you)\s+)?(click|press|tap)\b.{0,48}\b(for\s+me|on\s+my\s+behalf|instead of me)\b/i;

const AUTOMATE_CLICK_EN =
  /\b(click\s+it\s+for\s+me|do\s+the\s+click\s+for\s+me)\b/i;

const ASSIST_OPERATE_ZH =
  /(帮我|替我|为我|代我|请你|麻烦你).{0,12}(操作|执行该操作|按步骤(点击|操作))/;

const ASSIST_OPERATE_EN =
  /\b((please|can you|could you)\s+)?(do\s+it\s+for\s+me|operate\s+for\s+me|perform\s+(the\s+)?(steps|actions)\s+for\s+me)\b/i;

const CONFIRM_EXECUTE_ZH = /^(确认执行|确认|开始执行|执行吧|好的执行|可以执行)$/i;
const CONFIRM_EXECUTE_EN = /^(confirm|yes,? confirm|execute|run it|go ahead)$/i;

const CANCEL_ZH = /^(取消|不要了|算了)$/;
const CANCEL_EN = /^(cancel|never ?mind|no)$/i;

const DO_FOR_ME_OTHER_ZH =
  /(帮我|替我|为我|给我|代我|麻烦你|请你|你来|你直接|自动).{0,20}(填写|填入|填上|提交|删除|移除|隐藏|修改|改掉|改成|注入|操控)/;

const DO_FOR_ME_OTHER_EN =
  /\b((please|can you|could you|would you)\s+)?(fill|submit|type|delete|remove|hide|modify|change|inject)\b.{0,48}\b(for\s+me|on\s+my\s+behalf|instead of me)\b/i;

const SCRIPT_INJECT =
  /(注入|执行|运行).{0,12}(脚本|javascript|js代码|css)/i;

const SCRIPT_INJECT_EN =
  /\b(inject|run|execute)\b.{0,40}\b(script|javascript|\bjs\b|css)\b/i;

const MUTATE_PAGE_ZH =
  /(修改|改写|篡改|删除|移除|隐藏|破坏|影响).{0,12}(页面|网页|dom|css|样式表|页面功能|网页功能|页面行为)/i;

const MUTATE_PAGE_EN =
  /\b(modify|alter|mutate|change|break|affect)\b.{0,28}\b((the\s+)?(page|dom|document)|page\s+(css|function|behavior|functionality))\b/i;

const CONTROL_PAGE_ZH = /(操控|控制|代理操作).{0,10}(页面|网页|元素|控件)/;

export type ChatPageActionKind =
  | 'none'
  | 'assist_click'
  | 'assist_operate'
  | 'confirm_execute'
  | 'cancel_execute'
  | 'forbidden';

export function classifyChatPageAction(question: string): ChatPageActionKind {
  const t = question.trim();
  if (!t) return 'none';

  if (CONFIRM_EXECUTE_ZH.test(t) || CONFIRM_EXECUTE_EN.test(t)) {
    return 'confirm_execute';
  }
  if (CANCEL_ZH.test(t) || CANCEL_EN.test(t)) {
    return 'cancel_execute';
  }

  if (SCRIPT_INJECT.test(t) || SCRIPT_INJECT_EN.test(t)) return 'forbidden';
  if (CONTROL_PAGE_ZH.test(t)) return 'forbidden';
  if (DO_FOR_ME_OTHER_ZH.test(t) || DO_FOR_ME_OTHER_EN.test(t)) {
    return 'forbidden';
  }

  if (ASSIST_OPERATE_ZH.test(t) || ASSIST_OPERATE_EN.test(t)) {
    return 'assist_operate';
  }
  if (ASSIST_CLICK_ZH.test(t) || ASSIST_CLICK_EN.test(t) || AUTOMATE_CLICK_EN.test(t)) {
    return 'assist_click';
  }

  if (MUTATE_PAGE_ZH.test(t) || MUTATE_PAGE_EN.test(t)) {
    if (
      HOW_TO.test(t) &&
      !/(dom|css|脚本|javascript|样式表|html|注入)/i.test(t)
    ) {
      return 'none';
    }
    return 'forbidden';
  }

  return 'none';
}

export function isAssistRequest(kind: ChatPageActionKind): boolean {
  return kind === 'assist_click' || kind === 'assist_operate';
}

/** @deprecated use classifyChatPageAction */
export function isForbiddenPageActionRequest(question: string): boolean {
  return classifyChatPageAction(question) === 'forbidden';
}

export function forbiddenPageActionRefusal(locale: UiLocale): string {
  if (locale === 'zh') {
    return (
      '已拒绝该请求。\n\n' +
      '出于安全策略，OmniPilot 禁止修改页面、注入脚本或代你填写/提交等操作。\n\n' +
      '若只需代为点击，请先在设置中勾选「允许代为点击页面元素」，再在问一问中选择「帮我操作」并确认链路。'
    );
  }
  return (
    'Request refused.\n\n' +
    'OmniPilot must not modify the page, inject scripts, or fill/submit forms for you.\n\n' +
    'For assisted clicks, enable the setting, choose “Do it for me”, and confirm the click chain.'
  );
}

export function assistedClickDisabledRefusal(locale: UiLocale): string {
  if (locale === 'zh') {
    return (
      '已拒绝代为操作。\n\n' +
      '该能力默认关闭。请打开设置，勾选「允许代为点击页面元素」并保存后再试。\n\n' +
      '开启后：先看到点击链路 → 你确认 → 才会执行。'
    );
  }
  return (
    'Assisted operate refused.\n\n' +
    'Off by default. Enable “Allow clicking page elements for me” in Settings.\n\n' +
    'When enabled: you will see the click chain first, confirm, then it runs.'
  );
}

export function assistedClickDoneMessage(
  locale: UiLocale,
  label: string,
): string {
  if (locale === 'zh') {
    return `已代为点击：${label}\n\n请查看页面是否出现预期结果。`;
  }
  return `Clicked for you: ${label}\n\nCheck the page for the expected result.`;
}

export function assistedClickMissMessage(locale: UiLocale): string {
  if (locale === 'zh') {
    return (
      '未能匹配到可执行步骤。\n\n' +
      '操作链路可以是 1 步或多步。请说具体控件名（如「播放」），或「跳到 20:00」。'
    );
  }
  return (
    'No executable steps matched.\n\n' +
    'A chain can be 1 or more steps. Name a control (e.g. Play) or say “jump to 20:00”.'
  );
}
