import { levenbergMarquardt } from 'ml-levenberg-marquardt';
import { formatNumber } from '../../../display/toLatex/formatNumber';
import type { FamilyFitter } from '../types';

const gaussianModel = ([a, b, c, d]: number[]) => (x: number) => a * Math.exp(-((x - b) ** 2) / c) + d;

/** y = a*e^(-(x-b)^2/c)+d — a bump or dip. Initial guess: peak/trough location for b, baseline for d, half-width-at-half-max for c. */
export const gaussianFamily: FamilyFitter = (xs, ys) => {
  if (xs.length < 6) return null;

  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const range = yMax - yMin;
  if (range < 1e-9) return null;

  const maxIdx = ys.indexOf(yMax);
  const minIdx = ys.indexOf(yMin);
  const isPeak = maxIdx > 0 && maxIdx < ys.length - 1;
  const isDip = minIdx > 0 && minIdx < ys.length - 1;
  if (!isPeak && !isDip) return null; // extreme sits at an edge — not a genuine interior bump

  const mid = (ys.length - 1) / 2;
  const usePeak = isPeak && (!isDip || Math.abs(maxIdx - mid) <= Math.abs(minIdx - mid));
  const peakIdx = usePeak ? maxIdx : minIdx;
  const d0 = usePeak ? yMin : yMax;
  const a0 = usePeak ? range : -range;
  const b0 = xs[peakIdx];

  const halfLevel = d0 + a0 / 2;
  let leftX = xs[0];
  let rightX = xs[xs.length - 1];
  for (let i = peakIdx; i >= 0; i--) {
    if (usePeak ? ys[i] <= halfLevel : ys[i] >= halfLevel) {
      leftX = xs[i];
      break;
    }
  }
  for (let i = peakIdx; i < xs.length; i++) {
    if (usePeak ? ys[i] <= halfLevel : ys[i] >= halfLevel) {
      rightX = xs[i];
      break;
    }
  }
  const hwhm = Math.max(1e-6, (rightX - leftX) / 2);
  const c0 = (hwhm * hwhm) / Math.LN2;

  try {
    const result = levenbergMarquardt(
      { x: xs, y: ys },
      gaussianModel,
      { initialValues: [a0, b0, c0, d0], maxIterations: 200, damping: 1.5 }
    );
    const [a, b, c, d] = result.parameterValues;
    if (![a, b, c, d].every(Number.isFinite) || Math.abs(c) < 1e-9) return null;
    const dSign = d >= 0 ? '+' : '-';
    return {
      familyName: 'Gaussian',
      latex: `f(x) = ${formatNumber(a)}e^{-(x - ${formatNumber(b)})^2 / ${formatNumber(c)}} ${dSign} ${formatNumber(Math.abs(d))}`,
      paramCount: 4,
      predict: gaussianModel([a, b, c, d]),
    };
  } catch {
    return null;
  }
};
