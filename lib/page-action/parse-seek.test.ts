import { describe, expect, it } from 'vitest';
import { formatSeconds, parseSeekIntent } from './parse-seek';

describe('parseSeekIntent', () => {
  it('parses mm:ss jump goals', () => {
    const hit = parseSeekIntent('当前视频进度 跳到20:00');
    expect(hit?.seconds).toBe(1200);
    expect(hit?.display).toBe('20:00');
  });

  it('parses h:mm:ss', () => {
    expect(parseSeekIntent('跳到1:02:03')?.seconds).toBe(3723);
  });

  it('returns null for plain click goals', () => {
    expect(parseSeekIntent('帮我点击播放')).toBeNull();
  });

  it('formats seconds', () => {
    expect(formatSeconds(65)).toBe('1:05');
  });
});
