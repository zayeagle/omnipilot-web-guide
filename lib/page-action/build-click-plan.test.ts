import { describe, expect, it } from 'vitest';
import { buildClickPlan, formatClickPlan } from './build-click-plan';

describe('buildClickPlan', () => {
  it('1-step chain from a single live-scan click', () => {
    const plan = buildClickPlan({
      goal: '帮我操作播放',
      features: [],
      candidates: [
        { uid: 'c3', text: '播放', ariaLabel: 'Play' },
        { uid: 'c4', text: '静音', ariaLabel: '' },
      ],
      locale: 'zh',
    });
    expect(plan?.steps).toHaveLength(1);
    expect(plan?.steps[0]).toMatchObject({ kind: 'click', uid: 'c3' });
    expect(formatClickPlan(plan!, 'zh')).toContain('共 1 步');
  });

  it('1-step seek chain for jump-to-time goals', () => {
    const plan = buildClickPlan({
      goal: '当前视频进度 跳到20:00',
      features: [],
      candidates: [],
      locale: 'zh',
    });
    expect(plan?.steps).toHaveLength(1);
    expect(plan?.steps[0]).toMatchObject({ kind: 'seek', seconds: 1200 });
  });

  it('returns null when nothing matches', () => {
    expect(
      buildClickPlan({
        goal: '打开火星基地',
        features: [],
        candidates: [{ uid: 'c0', text: '搜索', ariaLabel: '' }],
      }),
    ).toBeNull();
  });
});
