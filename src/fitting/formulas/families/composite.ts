import { polynomialFamilies } from './polynomial';
import { sineFamily } from './sine';
import type { FamilyFitter } from '../types';

const TREND_DEGREES = [0, 1, 2];

/** Strips a sub-fit's own "f(x) = " prefix so two plain-text latex strings can be joined into one combined equation. */
function stripPrefix(latex: string): string {
  return latex.replace(/^f\(x\)\s*=\s*/, '');
}

/**
 * f(x) = trend(x) + oscillation(x): a low-degree (0-2) polynomial trend
 * plus a sine fit to that trend's residuals. Reuses the existing polynomial
 * and sine family fitters rather than duplicating their regression logic —
 * this is deliberately a fallback for data that looks like "a slow drift
 * plus a wobble," which no single curated family captures on its own.
 *
 * Tries each trend degree, fits a sine to the corresponding residuals, and
 * keeps whichever degree produces the lowest combined SSE. Returns null if
 * every trend/residual-sine combination fails (e.g. too few points for the
 * sine fitter's own preconditions).
 */
export const compositeFamily: FamilyFitter = (xs, ys) => {
  let best: {
    trendLatex: string;
    oscLatex: string;
    paramCount: number;
    predict: (x: number) => number;
    sse: number;
  } | null = null;

  for (const degree of TREND_DEGREES) {
    const trend = polynomialFamilies[degree](xs, ys);
    if (!trend) continue;

    const residuals = ys.map((y, i) => y - trend.predict(xs[i]));
    const oscillation = sineFamily(xs, residuals);
    if (!oscillation) continue;

    const predict = (x: number) => trend.predict(x) + oscillation.predict(x);
    const sse = xs.reduce((acc, x, i) => acc + (predict(x) - ys[i]) ** 2, 0);
    if (!Number.isFinite(sse)) continue;

    if (!best || sse < best.sse) {
      best = {
        trendLatex: trend.latex,
        oscLatex: oscillation.latex,
        paramCount: trend.paramCount + oscillation.paramCount,
        predict,
        sse,
      };
    }
  }

  if (!best) return null;

  return {
    familyName: 'Composite (trend + oscillation)',
    latex: `f(x) = ${stripPrefix(best.trendLatex)} + ${stripPrefix(best.oscLatex)}`,
    paramCount: best.paramCount,
    predict: best.predict,
  };
};
