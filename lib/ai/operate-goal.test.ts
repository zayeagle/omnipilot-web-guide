import { describe, expect, it } from 'vitest';
import {
  extractEmbeddedIntent,
  isMetaOperateFeedback,
  resolveOperateGoal,
} from './operate-goal';

describe('operate-goal', () => {
  it('keeps previous goal for pure step complaints', () => {
    const prev = '打开数据库配置';
    expect(resolveOperateGoal('你为什么要执行两步', prev)).toBe(prev);
    expect(isMetaOperateFeedback('你为什么要执行两步')).toBe(true);
  });

  it('extracts intent from clarification complaints', () => {
    const msg = '你为什么要执行两步，我只是要打开数据库配置';
    expect(extractEmbeddedIntent(msg)).toBe('打开数据库配置');
    expect(resolveOperateGoal(msg, '旧目标')).toBe('打开数据库配置');
  });

  it('accepts normal how-to as a new goal', () => {
    expect(resolveOperateGoal('怎么打开数据库配置', '')).toBe(
      '怎么打开数据库配置',
    );
  });
});
