/** UI + AI output locale helpers. */

export type UiLocale = 'zh' | 'en';

export function normalizeLocale(raw?: string | null): UiLocale {
  const tag = (raw || '').trim().toLowerCase();
  if (tag.startsWith('zh')) return 'zh';
  return 'en';
}

/** Prefer extension UI language; fall back to navigator. */
export function detectUiLocale(): UiLocale {
  try {
    if (typeof browser !== 'undefined' && browser.i18n?.getUILanguage) {
      return normalizeLocale(browser.i18n.getUILanguage());
    }
  } catch {
    /* ignore */
  }
  if (typeof navigator !== 'undefined') {
    return normalizeLocale(navigator.language);
  }
  return 'en';
}

export function localeLabel(locale: UiLocale): string {
  return locale === 'zh' ? 'Simplified Chinese (zh-CN)' : 'English';
}

export type GuideStrings = {
  brand: string;
  subtitle: string;
  analyze: string;
  startTour: string;
  next: string;
  end: string;
  tourThis: string;
  clickAction: (name: string) => string;
  clickNeedPermission: string;
  clickDone: string;
  clickFailed: string;
  helpOperate: string;
  confirmExecute: string;
  cancelExecute: string;
  planBuilding: string;
  executeRunning: string;
  executeDone: string;
  executeCancelled: string;
  settings: string;
  analyzing: string;
  analyzeFailed: string;
  featuresCount: (n: number) => string;
  rulesMode: string;
  tourRunning: string;
  tourFinished: string;
  tourFailed: string;
  tourEnded: string;
  chatPlaceholder: string;
  chatSend: string;
  chatThinking: string;
  chatFailed: string;
  chatEmpty: string;
  close: string;
  dragHint: string;
  tabGuide: string;
  tabChat: string;
  emptyTitle: string;
  emptyStepAnalyze: string;
  emptyStepAsk: string;
  pinTip: string;
};

const EN: GuideStrings = {
  brand: 'OmniPilot',
  subtitle: 'Page guidance',
  analyze: 'Analyze',
  startTour: 'Tour',
  next: 'Next',
  end: 'End',
  tourThis: 'Tour this',
  clickAction: (name) => `Click “${name}”`,
  clickNeedPermission: 'Enable “Allow clicking…” in Settings first',
  clickDone: 'Clicked',
  clickFailed: 'Click failed',
  helpOperate: 'Do it for me',
  confirmExecute: 'Confirm & run',
  cancelExecute: 'Cancel',
  planBuilding: 'Building click chain…',
  executeRunning: 'Running clicks…',
  executeDone: 'Click chain finished',
  executeCancelled: 'Cancelled',
  settings: 'Settings',
  analyzing: 'Analyzing…',
  analyzeFailed: 'Analyze failed',
  featuresCount: (n) => `${n} features`,
  rulesMode: 'rules mode',
  tourRunning: 'Tour running — Next',
  tourFinished: 'Tour finished',
  tourFailed: 'Tour failed',
  tourEnded: 'Tour ended',
  chatPlaceholder: 'Ask how to do something on this page…',
  chatSend: 'Send',
  chatThinking: 'Thinking…',
  chatFailed: 'Chat failed',
  chatEmpty:
    'Ask how to use this page. After an answer, you can choose “Do it for me” (opt-in) — confirm the click chain before it runs.',
  close: 'Close',
  dragHint: 'Drag',
  tabGuide: 'Guide',
  tabChat: 'Ask',
  emptyTitle: 'Get oriented on this page',
  emptyStepAnalyze: 'Tap Analyze to list actions and start a guided tour.',
  emptyStepAsk: 'Switch to Ask to chat about how to use the page.',
  pinTip:
    'Icon lives in the Extensions (puzzle) menu. Pin it to the toolbar yourself if you want — Chrome does not let extensions choose the default.',
};

const ZH: GuideStrings = {
  brand: 'OmniPilot',
  subtitle: '页面操作引导',
  analyze: '分析页面',
  startTour: '开始引导',
  next: '下一步',
  end: '结束',
  tourThis: '引导此项',
  clickAction: (name) => `点击「${name}」`,
  clickNeedPermission: '请先在设置中勾选「允许代为点击页面元素」',
  clickDone: '已点击',
  clickFailed: '点击失败',
  helpOperate: '帮我操作',
  confirmExecute: '确认执行',
  cancelExecute: '取消',
  planBuilding: '正在规划点击链路…',
  executeRunning: '正在按链路点击…',
  executeDone: '点击链路已执行完毕',
  executeCancelled: '已取消',
  settings: '设置',
  analyzing: '正在分析…',
  analyzeFailed: '分析失败',
  featuresCount: (n) => `${n} 个功能`,
  rulesMode: '规则模式',
  tourRunning: '引导进行中 — 点下一步',
  tourFinished: '引导已结束',
  tourFailed: '引导失败',
  tourEnded: '已结束引导',
  chatPlaceholder: '询问如何在本页操作（不代你操作）…',
  chatSend: '发送',
  chatThinking: '思考中…',
  chatFailed: '对话失败',
  chatEmpty:
    '可以问「怎么做…」。需要代操作时点「帮我操作」（需先在设置开启）— 先确认点击链路再执行。',
  close: '关闭',
  dragHint: '拖动',
  tabGuide: '看一看',
  tabChat: '问一问',
  emptyTitle: '先了解一下这个页面',
  emptyStepAnalyze: '点「分析页面」识别可操作项，再开始分步引导。',
  emptyStepAsk: '切到「问一问」可用对话询问本页怎么用。',
  pinTip:
    '扩展图标在右上角「扩展程序」（拼图）菜单里。需要时常显时请自行点图钉固定到工具栏——浏览器默认是否固定由 Chrome/Edge 决定，扩展无法改。',
};

export function guideStrings(locale: UiLocale): GuideStrings {
  return locale === 'zh' ? ZH : EN;
}
