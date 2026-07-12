import { formatNumber } from '../../../display/toLatex/formatNumber';
import { simpleLinearRegression } from '../linearRegression';
import type { FamilyFitter } from '../types';

/** y = a*ln(x)+b, fit via closed-form linear regression on ln(x). Only offered when the domain is entirely x>0. */
export const logarithmFamily: FamilyFitter = (xs, ys) => {
  if (xs.length < 3) return null;
  if (!xs.every((x) => x > 1e-9)) return null;

  const { slope: a, intercept: b } = simpleLinearRegression(xs.map(Math.log), ys);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

  const bSign = b >= 0 ? '+' : '-';
  return {
    familyName: 'Logarithm',
    // Plain "ln(" rather than the LaTeX \ln command — this bundler/KaTeX
    // pairing fails to tokenize any multi-letter control word, so no
    // backslash commands are used here at all.
    latex: `f(x) = ${formatNumber(a)}ln(x) ${bSign} ${formatNumber(Math.abs(b))}`,
    paramCount: 2,
    predict: (x: number) => a * Math.log(x) + b,
  };
};
