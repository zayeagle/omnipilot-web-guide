import { describe, expect, it } from 'vitest';
import {
  clearPlanSessionsForTests,
  consumePlanSession,
  createPlanSession,
} from './plan-session';

describe('plan-session', () => {
  it('creates and consumes a one-time token for the same tab', () => {
    clearPlanSessionsForTests();
    const token = createPlanSession({
      tabId: 7,
      goal: 'play',
      steps: [{ kind: 'click', uid: 'c1', label: 'Play' }],
    });
    const first = consumePlanSession(token, 7);
    expect(first?.steps).toHaveLength(1);
    expect(consumePlanSession(token, 7)).toBeNull();
  });

  it('rejects wrong tabId', () => {
    clearPlanSessionsForTests();
    const token = createPlanSession({
      tabId: 1,
      goal: 'x',
      steps: [{ kind: 'seek', seconds: 10, label: 'seek' }],
    });
    expect(consumePlanSession(token, 2)).toBeNull();
  });
});
