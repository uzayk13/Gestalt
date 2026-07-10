import type { Point } from '../types';

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Resamples a polyline to `n` points evenly spaced along its arc length. */
export function resampleByArcLength(points: Point[], n: number): Point[] {
  if (points.length < 2 || n < 2) return points.slice();

  const cumulative: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    cumulative.push(cumulative[i - 1] + distance(points[i - 1], points[i]));
  }
  const totalLength = cumulative[cumulative.length - 1];
  if (totalLength === 0) return points.slice(0, 1);

  const result: Point[] = [];
  let segmentIndex = 0;
  for (let i = 0; i < n; i++) {
    const targetLength = (i / (n - 1)) * totalLength;
    while (
      segmentIndex < cumulative.length - 2 &&
      cumulative[segmentIndex + 1] < targetLength
    ) {
      segmentIndex++;
    }
    const segStart = cumulative[segmentIndex];
    const segEnd = cumulative[segmentIndex + 1];
    const segLength = segEnd - segStart;
    const t = segLength === 0 ? 0 : (targetLength - segStart) / segLength;
    const p0 = points[segmentIndex];
    const p1 = points[segmentIndex + 1];
    result.push({
      x: p0.x + t * (p1.x - p0.x),
      y: p0.y + t * (p1.y - p0.y),
    });
  }
  return result;
}
