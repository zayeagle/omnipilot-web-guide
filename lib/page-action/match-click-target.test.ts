import { describe, expect, it } from 'vitest';
import { matchClickTarget, rankClickTargets } from './match-click-target';

describe('matchClickTarget', () => {
  it('matches Chinese label inside the question', () => {
    const hit = matchClickTarget('帮我点击保存按钮', [
      { uid: 'c0', text: '取消', ariaLabel: '' },
      { uid: 'c1', text: '保存', ariaLabel: '' },
    ]);
    expect(hit?.uid).toBe('c1');
  });

  it('matches via synonyms without prior analyze labels', () => {
    const hit = matchClickTarget('帮我操作播放', [
      { uid: 'c9', text: '', ariaLabel: 'Play' },
      { uid: 'c4', text: '静音', ariaLabel: '' },
    ]);
    expect(hit?.uid).toBe('c9');
  });

  it('returns null when nothing matches', () => {
    expect(
      matchClickTarget('帮我跳到火星', [
        { uid: 'c0', text: 'Save', ariaLabel: '' },
      ]),
    ).toBeNull();
  });

  it('ranks live-scan candidates without analyzed features', () => {
    const ranked = rankClickTargets('请暂停视频', [
      { uid: 'c1', text: '播放', ariaLabel: '' },
      { uid: 'c2', text: '暂停', ariaLabel: 'Pause' },
      { uid: 'c3', text: '设置', ariaLabel: '' },
    ]);
    expect(ranked[0]?.uid).toBe('c2');
  });
});
