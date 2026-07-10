export interface Point {
  x: number;
  y: number;
}

export interface MathRange {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface PreprocessedFunction {
  xs: number[];
  ys: number[];
  isFunctionOfX: boolean;
  backtrackFraction: number;
}

export interface SplineSegment {
  x0: number;
  x1: number;
  a: number;
  b: number;
  c: number;
  d: number;
}

export interface SplineFitResult {
  kind: 'spline';
  segments: SplineSegment[];
}

export interface CleanFormulaCandidate {
  familyName: string;
  latex: string;
  paramCount: number;
  nrmse: number;
  score: number;
  predict: (x: number) => number;
}

export interface CleanFormulaFitResult {
  kind: 'cleanFormula';
  best: CleanFormulaCandidate;
  candidates: CleanFormulaCandidate[];
  isPoorFit: boolean;
}

export type FitResult = SplineFitResult | CleanFormulaFitResult;

export type Mode = 'spline' | 'cleanFormula';
