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

const tangentModel = ([a, b, c, d]: number[]) => (x: number) => a * Math.tan(b * x + c) + d;

/**
 * y = a*tan(bx+c)+d. Frequency guessing mirrors sineFamily (sign-change
 * count plus a few fixed candidates run through Levenberg-Marquardt), but
 * scaled by pi instead of 2*pi since tan's period is pi/b rather than
 * sine's 2*pi/b.
 *
 * Critical risk: tangent has vertical asymptotes wherever b*x+c crosses
 * pi/2 + k*pi. If a fitted asymptote falls inside the observed x-range, the
 * "fit" blows up into numerically meaningless huge numbers. Guard against
 * this by re-sampling predict() densely across the observed domain after
 * fitting and rejecting the candidate outright (returning null) if any
 * sample is non-finite or wildly large relative to the input data's own
 * y-range.
 */
export const tangentFamily: FamilyFitter = (xs, ys) => {
  if (xs.length < 6) return null;

  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const yRange = yMax - yMin;
  const d0 = (yMax + yMin) / 2;
  const xRange = xs[xs.length - 1] - xs[0];
  if (yRange < 1e-6 || xRange < 1e-6) return null;

  const centered = ys.map((y) => y - d0);
  const estimatedCycles = Math.max(0.5, countSignChanges(centered) / 2);
  const bCandidates = [estimatedCycles, 0.5, 1, 2, 3].map((cycles) => (Math.PI * cycles) / xRange);
  const a0 = Math.max(yRange / 4, 1e-3);

  const data = { x: xs, y: ys };
  let best: { params: number[]; sse: number } | null = null;

  for (const b0 of bCandidates) {
    try {
      const result = levenbergMarquardt(data, tangentModel, {
        initialValues: [a0, b0, 0, d0],
        maxIterations: 200,
        damping: 1.5,
      });
      const [a, b, c, d] = result.parameterValues;
      if (![a, b, c, d].every(Number.isFinite)) continue;
      const predict = tangentModel([a, b, c, d]);
      const sse = xs.reduce((acc, x, i) => acc + (predict(x) - ys[i]) ** 2, 0);
      if (!Number.isFinite(sse)) continue;
      if (!best || sse < best.sse) best = { params: [a, b, c, d], sse };
    } catch {
      continue;
    }
  }
  if (!best) return null;

  const [a, b, c, d] = best.params;
  const predict = tangentModel([a, b, c, d]);

  // Dense re-sampling across the observed domain: reject any candidate that
  // is secretly straddling an asymptote inside the drawn range.
  const magnitudeBound = 100 * yRange;
  const guardSamples = 200;
  for (let i = 0; i <= guardSamples; i++) {
    const x = xs[0] + (i / guardSamples) * xRange;
    const y = predict(x);
    if (!Number.isFinite(y) || Math.abs(y) > magnitudeBound) return null;
  }

  const cSign = c >= 0 ? '+' : '-';
  const dSign = d >= 0 ? '+' : '-';
  // Plain "tan(" rather than the LaTeX \tan command — see the KaTeX gotcha:
  // this bundler/KaTeX pairing fails to tokenize any multi-letter control
  // word, so no backslash commands are used here at all.
  return {
    familyName: 'Tangent',
    latex: `f(x) = ${formatNumber(a)}tan(${formatNumber(b)}x ${cSign} ${formatNumber(Math.abs(c))}) ${dSign} ${formatNumber(Math.abs(d))}`,
    paramCount: 4,
    predict,
  };
};
