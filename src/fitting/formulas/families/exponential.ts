import { levenbergMarquardt } from 'ml-levenberg-marquardt';
import { formatNumber } from '../../../display/toLatex/formatNumber';
import { simpleLinearRegression } from '../linearRegression';
import type { FamilyFitter } from '../types';

const expModel = ([a, b, c]: number[]) => (x: number) => a * Math.exp(b * x) + c;

function tryExponentialFit(
  xs: number[],
  ys: number[],
  c0: number
): { params: number[]; sse: number } | null {
  const shifted = ys.map((y) => y - c0);
  if (shifted.some((v) => v <= 0)) return null;

  const { slope: b0, intercept: lnA0 } = simpleLinearRegression(
    xs,
    shifted.map((v) => Math.log(v))
  );
  const a0 = Math.exp(lnA0);

  try {
    const result = levenbergMarquardt(
      { x: xs, y: ys },
      expModel,
      { initialValues: [a0, b0, c0], maxIterations: 200, damping: 1.5 }
    );
    const [a, b, c] = result.parameterValues;
    if (![a, b, c].every(Number.isFinite)) return null;
    const predict = expModel([a, b, c]);
    const sse = xs.reduce((acc, x, i) => acc + (predict(x) - ys[i]) ** 2, 0);
    return Number.isFinite(sse) ? { params: [a, b, c], sse } : null;
  } catch {
    return null;
  }
}

/**
 * Tries an asymptote (c) below the data's min and above its max — covering
 * both growth and decay shapes — linearizes each via ln(y-c) for a cheap
 * initial guess, then refines with Levenberg-Marquardt on the real model.
 */
export const exponentialFamily: FamilyFitter = (xs, ys) => {
  if (xs.length < 4) return null;
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const range = yMax - yMin;
  if (range < 1e-9) return null;

  const candidates = [yMin - 0.1 * range - 1e-6, yMax + 0.1 * range + 1e-6]
    .map((c0) => tryExponentialFit(xs, ys, c0))
    .filter((r): r is { params: number[]; sse: number } => r !== null);

  if (candidates.length === 0) return null;
  const best = candidates.reduce((a, b) => (a.sse < b.sse ? a : b));
  const [a, b, c] = best.params;
  const cSign = c >= 0 ? '+' : '-';
  return {
    familyName: 'Exponential',
    latex: `f(x) = ${formatNumber(a)}e^{${formatNumber(b)}x} ${cSign} ${formatNumber(Math.abs(c))}`,
    paramCount: 3,
    predict: expModel([a, b, c]),
  };
};
