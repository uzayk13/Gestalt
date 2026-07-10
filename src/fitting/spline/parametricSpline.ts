import type { SplineFitResult } from '../../types';
import { evaluateSpline, fitNaturalCubicSpline } from './naturalCubicSpline';

export interface ParametricSplineFit {
  xOfT: SplineFitResult;
  yOfT: SplineFitResult;
}

/**
 * Traces any stroke exactly — open, closed, or self-intersecting — by
 * fitting x and y each as their own natural cubic spline over a shared
 * arc-length parameter t, rather than fitting y as a function of x. A circle
 * or figure-8 has no single-valued y=f(x) representation, but x(t) and y(t)
 * are each perfectly single-valued.
 */
export function fitParametricSpline(ts: number[], xs: number[], ys: number[]): ParametricSplineFit {
  return {
    xOfT: fitNaturalCubicSpline(ts, xs),
    yOfT: fitNaturalCubicSpline(ts, ys),
  };
}

export function evaluateParametricSpline(fit: ParametricSplineFit, t: number): { x: number; y: number } {
  return {
    x: evaluateSpline(fit.xOfT.segments, t),
    y: evaluateSpline(fit.yOfT.segments, t),
  };
}
