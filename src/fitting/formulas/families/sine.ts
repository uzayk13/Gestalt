import { levenbergMarquardt } from 'ml-levenberg-marquardt';
import { formatNumber } from '../../../display/toLatex/formatNumber';
import type { FamilyFitter } from '../types';

function countSignChanges(values: number[]): number {
  let count = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] === 0) continue;
    if (Math.sign(values[i]) !== Math.sign(values[i - 1]) && Math.sign(values[i - 1]) !== 0) count++;
  }
  return count;
}

const sineModel = ([a, b, c, d]: number[]) => (x: number) => a * Math.sin(b * x + c) + d;

/**
 * Sine fitting is notoriously sensitive to the initial frequency guess, so
 * several candidate frequencies (estimated from sign changes, plus a few
 * fixed guesses) are each run through Levenberg-Marquardt, keeping whichever
 * converges to the lowest error.
 */
export const sineFamily: FamilyFitter = (xs, ys) => {
  if (xs.length < 6) return null;

  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const a0 = (yMax - yMin) / 2;
  const d0 = (yMax + yMin) / 2;
  const xRange = xs[xs.length - 1] - xs[0];
  if (a0 < 1e-6 || xRange < 1e-6) return null;

  const centered = ys.map((y) => y - d0);
  const estimatedCycles = Math.max(0.5, countSignChanges(centered) / 2);
  const bCandidates = [estimatedCycles, 0.5, 1, 2, 3].map((cycles) => (2 * Math.PI * cycles) / xRange);

  const data = { x: xs, y: ys };
  let best: { params: number[]; sse: number } | null = null;

  for (const b0 of bCandidates) {
    try {
      const result = levenbergMarquardt(data, sineModel, {
        initialValues: [a0, b0, 0, d0],
        maxIterations: 200,
        damping: 1.5,
      });
      const [a, b, c, d] = result.parameterValues;
      if (![a, b, c, d].every(Number.isFinite)) continue;
      const predict = sineModel([a, b, c, d]);
      const sse = xs.reduce((acc, x, i) => acc + (predict(x) - ys[i]) ** 2, 0);
      if (!Number.isFinite(sse)) continue;
      if (!best || sse < best.sse) best = { params: [a, b, c, d], sse };
    } catch {
      continue;
    }
  }
  if (!best) return null;

  const [a, b, c, d] = best.params;
  const cSign = c >= 0 ? '+' : '-';
  const dSign = d >= 0 ? '+' : '-';
  // Plain "sin(" rather than the LaTeX \sin command — this bundler/KaTeX
  // pairing fails to tokenize any multi-letter control word (see
  // splineToLatex.ts), so no backslash commands are used here at all.
  return {
    familyName: 'Sine',
    latex: `f(x) = ${formatNumber(a)}sin(${formatNumber(b)}x ${cSign} ${formatNumber(Math.abs(c))}) ${dSign} ${formatNumber(Math.abs(d))}`,
    paramCount: 4,
    predict: sineModel([a, b, c, d]),
  };
};
