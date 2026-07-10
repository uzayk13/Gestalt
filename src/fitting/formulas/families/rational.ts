import { formatNumber } from '../../../display/toLatex/formatNumber';
import { simpleLinearRegression } from '../linearRegression';
import type { FamilyFitter } from '../types';

/** y = a/x + b, fit via closed-form linear regression on 1/x. Only offered when the x-range excludes a margin around 0. */
export const rationalFamily: FamilyFitter = (xs, ys) => {
  if (xs.length < 3) return null;
  if (xs.some((x) => Math.abs(x) < 0.5)) return null;

  const { slope: a, intercept: b } = simpleLinearRegression(xs.map((x) => 1 / x), ys);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

  const bSign = b >= 0 ? '+' : '-';
  return {
    familyName: 'Rational',
    latex: `f(x) = ${formatNumber(a)}/x ${bSign} ${formatNumber(Math.abs(b))}`,
    paramCount: 2,
    predict: (x: number) => a / x + b,
  };
};
