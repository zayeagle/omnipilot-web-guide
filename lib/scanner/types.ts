export type CandidateKind =
  | 'button'
  | 'link'
  | 'input'
  | 'select'
  | 'textarea'
  | 'menu'
  | 'other';

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Candidate = {
  uid: string;
  tag: string;
  role: string;
  text: string;
  ariaLabel: string;
  placeholder: string;
  nearbyHeading: string;
  kind: CandidateKind;
  rect: Rect;
  inViewport: boolean;
  /** Never include real password / sensitive input values */
  inputType?: string;
};

export type ScanOptions = {
  maxCandidates?: number;
  minSize?: number;
  preferViewport?: boolean;
};

export const DEFAULT_SCAN_OPTIONS: Required<ScanOptions> = {
  maxCandidates: 60,
  minSize: 8,
  preferViewport: true,
};
