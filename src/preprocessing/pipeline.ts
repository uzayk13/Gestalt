import type { Point, PreprocessedFunction } from '../types';
import { resampleByArcLength } from './resample';
import { movingAverage } from './smooth';
import { toFunctionOfX } from './toFunctionOfX';

const RESAMPLE_POINTS = 200;
const SMOOTH_WINDOW = 7;
// Iterating a small box filter a few times approximates a Gaussian kernel and rejects hand-tremor
// jitter much better than a single pass, without widening the window (which would blur real corners).
const SMOOTH_ITERATIONS = 3;
const GRID_SIZE = 150;

// Below this x-width (out of the fixed [-10,10] math viewport), curve
// fitting is numerically unstable: dividing by a near-zero segment width
// blows up spline/regression coefficients into meaningless huge numbers for
// what's really just a tap or a tiny jitter, not an intentional stroke.
const MIN_DOMAIN_WIDTH = 0.3;

export interface PipelineResult extends PreprocessedFunction {
  warning: string | null;
}

const EMPTY_RESULT: PipelineResult = {
  xs: [],
  ys: [],
  isFunctionOfX: true,
  backtrackFraction: 0,
  warning: null,
};

export function preprocessStroke(rawPoints: Point[]): PipelineResult {
  if (rawPoints.length < 2) {
    return EMPTY_RESULT;
  }

  const resampled = resampleByArcLength(rawPoints, RESAMPLE_POINTS);
  const smoothed = movingAverage(resampled, SMOOTH_WINDOW, SMOOTH_ITERATIONS);

  const xs = smoothed.map((p) => p.x);
  if (Math.max(...xs) - Math.min(...xs) < MIN_DOMAIN_WIDTH) {
    return EMPTY_RESULT;
  }

  const projected = toFunctionOfX(smoothed, GRID_SIZE);

  const warning = projected.isFunctionOfX
    ? null
    : "This drawing isn't a function of x (it doubles back) — showing a best-effort projection.";

  return { ...projected, warning };
}

// Below this bounding-box size, a stroke is treated as an unintentional tap
// or hand tremor rather than a real drawing — purely a UX filter, since the
// parametric fit below (evenly spaced t in [0,1]) has no division-by-near-zero
// instability the way the x-domain-width fit above does.
const MIN_BOUNDING_BOX_SIZE = 0.15;

export interface ParametricStroke {
  ts: number[];
  xs: number[];
  ys: number[];
  isClosed: boolean;
}

/**
 * Resamples and smooths a raw stroke into an evenly-t-parameterized point
 * sequence, with NO projection onto an x-grid — unlike `preprocessStroke`,
 * this preserves multi-valued shapes (circles, loops, self-intersections)
 * exactly, since x(t) and y(t) are each single-valued functions of t even
 * when y isn't a single-valued function of x.
 */
export function prepareParametricStroke(rawPoints: Point[]): ParametricStroke | null {
  if (rawPoints.length < 2) return null;

  const resampled = resampleByArcLength(rawPoints, RESAMPLE_POINTS);
  const smoothed = movingAverage(resampled, SMOOTH_WINDOW, SMOOTH_ITERATIONS);

  const xs = smoothed.map((p) => p.x);
  const ys = smoothed.map((p) => p.y);
  const xRange = Math.max(...xs) - Math.min(...xs);
  const yRange = Math.max(...ys) - Math.min(...ys);
  if (Math.max(xRange, yRange) < MIN_BOUNDING_BOX_SIZE) return null;

  const ts = smoothed.map((_, i) => i / (smoothed.length - 1));

  const start = smoothed[0];
  const end = smoothed[smoothed.length - 1];
  const closingGap = Math.hypot(end.x - start.x, end.y - start.y);
  const diagonal = Math.hypot(xRange, yRange);
  const isClosed = diagonal > 1e-9 && closingGap / diagonal < 0.15;

  return { ts, xs, ys, isClosed };
}
