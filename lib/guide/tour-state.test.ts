import { describe, expect, it } from 'vitest';
import {
  createTour,
  currentStep,
  endTour,
  featuresToSteps,
  nextTour,
  skipTour,
} from './tour-state';

describe('tour-state', () => {
  it('TC-F4-U01: howTo[3] → 3 steps', () => {
    const steps = featuresToSteps([
      { uid: 'c0', name: 'Save', howTo: ['a', 'b', 'c'] },
    ]);
    expect(steps).toHaveLength(3);
    const tour = createTour(steps);
    expect(currentStep(tour)?.body).toBe('a');
  });

  it('TC-F4-U02: missing feature uid → empty tour', () => {
    const steps = featuresToSteps(
      [{ uid: 'c0', name: 'Save', howTo: ['a'] }],
      'c99',
    );
    expect(createTour(steps).active).toBe(false);
  });

  it('TC-F4-U03: empty features → no start', () => {
    expect(createTour([]).active).toBe(false);
  });

  it('TC-F4-U04: last next ends cleanly', () => {
    let t = createTour([
      { uid: 'c0', title: '1', body: 'a' },
      { uid: 'c0', title: '2', body: 'b' },
    ]);
    t = nextTour(t);
    expect(t.active).toBe(true);
    t = nextTour(t);
    expect(t.active).toBe(false);
    expect(endTour(t).active).toBe(false);
    expect(skipTour(createTour([{ uid: 'c0', title: '1', body: 'a' }])).active).toBe(
      false,
    );
  });
});
