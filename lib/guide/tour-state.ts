export type TourStep = {
  uid: string;
  title: string;
  body: string;
};

export type TourState = {
  steps: TourStep[];
  index: number;
  active: boolean;
};

export function createTour(steps: TourStep[]): TourState {
  return { steps, index: 0, active: steps.length > 0 };
}

export function currentStep(state: TourState): TourStep | null {
  if (!state.active || !state.steps.length) return null;
  return state.steps[state.index] ?? null;
}

export function nextTour(state: TourState): TourState {
  if (!state.active) return state;
  const next = state.index + 1;
  if (next >= state.steps.length) {
    return { ...state, active: false, index: state.steps.length };
  }
  return { ...state, index: next };
}

export function skipTour(state: TourState): TourState {
  return { ...state, active: false };
}

export function endTour(state: TourState): TourState {
  return { steps: state.steps, index: 0, active: false };
}

export function featuresToSteps(
  features: Array<{ uid: string; name: string; howTo: string[] }>,
  featureUid?: string,
): TourStep[] {
  const list = featureUid
    ? features.filter((f) => f.uid === featureUid)
    : features;
  const steps: TourStep[] = [];
  for (const f of list) {
    const howTo = f.howTo?.length
      ? f.howTo
      : ['Locate the control', 'Activate it'];
    howTo.forEach((body, i) => {
      steps.push({
        uid: f.uid,
        title: `${f.name} (${i + 1}/${howTo.length})`,
        body,
      });
    });
  }
  return steps;
}
