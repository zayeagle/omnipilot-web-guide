import { describe, expect, it } from 'vitest';
import {
  assistedClickDisabledRefusal,
  classifyChatPageAction,
  forbiddenPageActionRefusal,
  isAssistRequest,
  isForbiddenPageActionRequest,
} from './chat-policy';

describe('chat-policy', () => {
  it('allows how-to guidance questions', () => {
    expect(classifyChatPageAction('怎么点击保存按钮？')).toBe('none');
    expect(classifyChatPageAction('如何修改个人资料？')).toBe('none');
  });

  it('classifies assist / confirm / forbidden', () => {
    expect(classifyChatPageAction('帮我点击保存按钮')).toBe('assist_click');
    expect(classifyChatPageAction('帮我操作播放')).toBe('assist_operate');
    expect(classifyChatPageAction('确认执行')).toBe('confirm_execute');
    expect(classifyChatPageAction('取消')).toBe('cancel_execute');
    expect(isAssistRequest('assist_operate')).toBe(true);
    expect(classifyChatPageAction('替我填写这个表单')).toBe('forbidden');
    expect(classifyChatPageAction('注入一段脚本到页面')).toBe('forbidden');
    expect(isForbiddenPageActionRequest('替我填写这个表单')).toBe(true);
  });

  it('refusal text is localized', () => {
    expect(forbiddenPageActionRefusal('zh')).toContain('已拒绝');
    expect(assistedClickDisabledRefusal('zh')).toContain('默认关闭');
  });
});
