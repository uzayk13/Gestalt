import type { Point, PreprocessedFunction } from '../types';

const MULTI_VALUE_SPREAD_RATIO = 0.15;
const BACKTRACK_THRESHOLD = 0.1;

/** Projects a stroke onto a uniform x-grid, averaging y where the stroke doubles back on x. */
export function toFunctionOfX(points: Point[], gridSize = 150): PreprocessedFunction {
  if (points.length === 0) {
    return { xs: [], ys: [], isFunctionOfX: true, backtrackFraction: 0 };
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const totalYRange = Math.max(...ys) - Math.min(...ys);

  if (xMax - xMin < 1e-9) {
    return { xs: [xMin], ys: [points[0].y], isFunctionOfX: false, backtrackFraction: 1 };
  }

  const step = (xMax - xMin) / (gridSize - 1);
  const sums = new Array(gridSize).fill(0);
  const counts = new Array(gridSize).fill(0);
  const minYs = new Array(gridSize).fill(Infinity);
  const maxYs = new Array(gridSize).fill(-Infinity);

  for (const p of points) {
    let bin = Math.round((p.x - xMin) / step);
    bin = Math.max(0, Math.min(gridSize - 1, bin));
    sums[bin] += p.y;
    counts[bin] += 1;
    minYs[bin] = Math.min(minYs[bin], p.y);
    maxYs[bin] = Math.max(maxYs[bin], p.y);
  }

  // A bin is "multi-valued" when the stroke revisits the same x at a
  // meaningfully different y — i.e. it genuinely fails the vertical line
  // test there, as opposed to just being noisy/dense sampling.
  let nonEmptyBins = 0;
  let multiValuedBins = 0;
  for (let i = 0; i < gridSize; i++) {
    if (counts[i] === 0) continue;
    nonEmptyBins++;
    const spread = maxYs[i] - minYs[i];
    if (totalYRange > 1e-9 && spread > MULTI_VALUE_SPREAD_RATIO * totalYRange) {
      multiValuedBins++;
    }
  }
  const fraction = nonEmptyBins > 0 ? multiValuedBins / nonEmptyBins : 0;

  const binYs: (number | null)[] = sums.map((sum, i) => (counts[i] > 0 ? sum / counts[i] : null));
  const knownIndices = binYs.reduce<number[]>((acc, y, i) => {
    if (y !== null) acc.push(i);
    return acc;
  }, []);

  // Fill empty bins by linear interpolation between nearest known neighbors;
  // clamp leading/trailing gaps to the nearest known value.
  const filledYs: number[] = new Array(gridSize);
  const firstKnown = knownIndices[0];
  const lastKnown = knownIndices[knownIndices.length - 1];
  for (let i = 0; i < firstKnown; i++) filledYs[i] = binYs[firstKnown] as number;
  for (let i = lastKnown; i < gridSize; i++) filledYs[i] = binYs[lastKnown] as number;

  let lastKnownIndex = firstKnown;
  for (const i of knownIndices) {
    if (lastKnownIndex !== i) {
      const y0 = binYs[lastKnownIndex] as number;
      const y1 = binYs[i] as number;
      for (let j = lastKnownIndex + 1; j < i; j++) {
        const t = (j - lastKnownIndex) / (i - lastKnownIndex);
        filledYs[j] = y0 + t * (y1 - y0);
      }
    }
    filledYs[i] = binYs[i] as number;
    lastKnownIndex = i;
  }

  const gridXs = Array.from({ length: gridSize }, (_, i) => xMin + i * step);

  return {
    xs: gridXs,
    ys: filledYs,
    isFunctionOfX: fraction < BACKTRACK_THRESHOLD,
    backtrackFraction: fraction,
  };
}
