import type { Point } from '../types';

/**
 * Centered moving-average smoothing; window shrinks near the endpoints rather than padding.
 *
 * `iterations` repeats the single-pass box filter, feeding each pass's output into the next
 * pass's input — the standard technique of iterating a box filter to approximate a Gaussian
 * kernel, which rejects high-frequency jitter (hand tremor) much better than one single wider
 * pass while staying just as cheap. Defaults to 1, which preserves the original single-pass
 * behavior exactly.
 */
export function movingAverage(points: Point[], windowSize: number, iterations = 1): Point[] {
  if (points.length === 0 || windowSize <= 1 || iterations < 1) return points.slice();

  let current = points;
  for (let iter = 0; iter < iterations; iter++) {
    const source = current;
    const halfWindow = Math.floor(windowSize / 2);
    current = source.map((_, i) => {
      const start = Math.max(0, i - halfWindow);
      const end = Math.min(source.length - 1, i + halfWindow);
      let sumX = 0;
      let sumY = 0;
      let count = 0;
      for (let j = start; j <= end; j++) {
        sumX += source[j].x;
        sumY += source[j].y;
        count++;
      }
      return { x: sumX / count, y: sumY / count };
    });
  }
  return current;
}
