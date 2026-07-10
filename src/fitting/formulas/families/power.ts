import { formatNumber } from '../../../display/toLatex/formatNumber';
import { simpleLinearRegression } from '../linearRegression';
import type { FamilyFitter } from '../types';

/** y = a*x^b, fit via closed-form log-log linear regression. Only offered when the domain is entirely x>0, y>0. */
export const powerFamily: FamilyFitter = (xs, ys) => {
  if (xs.length < 3) return null;
  if (!xs.every((x) => x > 1e-9) || !ys.every((y) => y > 1e-9)) return null;

  const { slope: b, intercept: lnA } = simpleLinearRegression(xs.map(Math.log), ys.map(Math.log));
  const a = Math.exp(lnA);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

  return {
    familyName: 'Power',
    latex: `f(x) = ${formatNumber(a)}x^{${formatNumber(b)}}`,
    paramCount: 2,
    predict: (x: number) => a * Math.pow(x, b),
  };
};
