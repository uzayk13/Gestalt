import type { Point } from '../types';

/** Centered moving-average smoothing; window shrinks near the endpoints rather than padding. */
export function movingAverage(points: Point[], windowSize: number): Point[] {
  if (points.length === 0 || windowSize <= 1) return points.slice();

  const halfWindow = Math.floor(windowSize / 2);
  return points.map((_, i) => {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(points.length - 1, i + halfWindow);
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (let j = start; j <= end; j++) {
      sumX += points[j].x;
      sumY += points[j].y;
      count++;
    }
    return { x: sumX / count, y: sumY / count };
  });
}
