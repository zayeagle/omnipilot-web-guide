import type { UiLocale } from '../i18n/locale';
import type { Candidate } from '../scanner';

export type GuideFeature = {
  uid: string;
  name: string;
  description: string;
  howTo: string[];
  source: 'ai' | 'rules';
};

export function rulesFallbackFeatures(
  candidates: Candidate[],
  locale: UiLocale = 'en',
): {
  pageSummary: string;
  features: GuideFeature[];
} {
  const zh = locale === 'zh';
  return {
    pageSummary: zh ? '规则分析' : 'Rules-only analysis',
    features: candidates.slice(0, 30).map((c) => {
      const label = (c.text || c.ariaLabel || c.kind || (zh ? '控件' : 'Control')).slice(
        0,
        80,
      );
      return {
        uid: c.uid,
        name: label,
        description: c.nearbyHeading
          ? zh
            ? `${c.kind}，靠近「${c.nearbyHeading}」`
            : `${c.kind} near “${c.nearbyHeading}”`
          : zh
            ? `检测到 ${c.kind} 控件`
            : `Detected ${c.kind} control`,
        howTo: [
          zh ? '找到高亮的控件' : 'Locate the highlighted control',
          c.kind === 'input' || c.kind === 'textarea'
            ? zh
              ? '输入所需内容'
              : 'Enter the required value'
            : zh
              ? '点击 / 激活该控件'
              : 'Activate / click the control',
          zh ? '如有确认弹窗请确认' : 'Confirm any follow-up dialog if shown',
        ],
        source: 'rules' as const,
      };
    }),
  };
}
