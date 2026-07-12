import { describe, expect, it } from 'vitest';
import type { Point } from '../types';
import { preprocessStroke } from './pipeline';
import { resampleByArcLength } from './resample';
import { movingAverage } from './smooth';
import { toFunctionOfX } from './toFunctionOfX';

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

describe('resampleByArcLength', () => {
  it('produces evenly spaced points along a smooth polyline', () => {
    // Dense polyline approximating a smooth curve: no sharp corners, so
    // straight-line distance between resampled points closely tracks arc length.
    const points: Point[] = Array.from({ length: 200 }, (_, i) => {
      const t = (i / 199) * 10;
      return { x: t, y: Math.sin(t) * 3 };
    });
    const resampled = resampleByArcLength(points, 50);
    const distances = resampled.slice(1).map((p, i) => distance(resampled[i], p));
    const mean = distances.reduce((a, b) => a + b, 0) / distances.length;
    for (const d of distances) {
      expect(Math.abs(d - mean)).toBeLessThan(mean * 0.1);
    }
  });

  it('lands closer together (in straight-line distance) around a sharp corner', () => {
    // Arc-length spacing is uniform, but a corner makes the chord distance
    // between points straddling it shorter than elsewhere — that's expected
    // geometry, not a bug, so we assert it explicitly here.
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 5 },
      { x: 10, y: 5 },
    ];
    const resampled = resampleByArcLength(points, 50);
    const distances = resampled.slice(1).map((p, i) => distance(resampled[i], p));
    const meanFarFromCorner = distances.slice(5, -5).reduce((a, b) => a + b, 0) / (distances.length - 10);
    const minDistance = Math.min(...distances);
    expect(minDistance).toBeLessThan(meanFarFromCorner);
  });

  it('preserves endpoints', () => {
    const points: Point[] = [
      { x: -3, y: 2 },
      { x: 4, y: -1 },
      { x: 8, y: 6 },
    ];
    const resampled = resampleByArcLength(points, 20);
    expect(resampled[0]).toEqual(points[0]);
    expect(resampled[resampled.length - 1]).toEqual(points[points.length - 1]);
  });
});

describe('movingAverage', () => {
  it('reduces high-frequency variance compared to the input', () => {
    const points: Point[] = Array.from({ length: 100 }, (_, i) => ({
      x: i,
      y: Math.sin(i) + (i % 2 === 0 ? 1 : -1), // sine signal + jitter noise
    }));
    const smoothed = movingAverage(points, 9);

    const variance = (pts: Point[]) => {
      const mean = pts.reduce((a, p) => a + p.y, 0) / pts.length;
      return pts.reduce((a, p) => a + (p.y - mean) ** 2, 0) / pts.length;
    };
    const jitterOnly = (pts: Point[]) =>
      pts.reduce((a, p, i) => a + Math.abs(p.y - Math.sin(i)), 0) / pts.length;

    expect(jitterOnly(smoothed)).toBeLessThan(jitterOnly(points));
    expect(variance(smoothed)).toBeGreaterThan(0); // didn't flatten the real sine signal to nothing
  });

  it('preserves array length', () => {
    const points: Point[] = Array.from({ length: 10 }, (_, i) => ({ x: i, y: i * i }));
    expect(movingAverage(points, 5)).toHaveLength(10);
  });

  it('default iterations=1 matches the original single-pass output exactly', () => {
    const points: Point[] = Array.from({ length: 40 }, (_, i) => ({
      x: i,
      y: Math.sin(i / 3) + (i % 2 === 0 ? 0.5 : -0.5),
    }));
    const withDefault = movingAverage(points, 7);
    const withExplicitOne = movingAverage(points, 7, 1);
    expect(withDefault).toEqual(withExplicitOne);
  });

  it('iterating the box filter cancels straight-line jitter far more than a single pass', () => {
    // Deterministic seeded PRNG (mulberry32) so the injected "hand tremor" noise is
    // reproducible and the test can never flake, unlike unseeded Math.random().
    function mulberry32(seed: number): () => number {
      let state = seed;
      return () => {
        state |= 0;
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    const rand = mulberry32(42);
    const jitterAmplitude = 0.15;
    // Perturb points perpendicular to the line y = 0.5x + 1 (direction (-0.5, 1)/sqrt(1.25))
    // by uniformly-distributed pseudo-random noise in [-jitterAmplitude, jitterAmplitude].
    const norm = Math.sqrt(1.25);
    const points: Point[] = Array.from({ length: 200 }, (_, i) => {
      const x = i * 0.1;
      const perpJitter = (rand() * 2 - 1) * jitterAmplitude;
      return {
        x: x + (-0.5 / norm) * perpJitter,
        y: 0.5 * x + 1 + (1 / norm) * perpJitter,
      };
    });

    function maxPerpDeviationFromFitLine(pts: Point[]): number {
      const n = pts.length;
      const sumX = pts.reduce((a, p) => a + p.x, 0);
      const sumY = pts.reduce((a, p) => a + p.y, 0);
      const sumXY = pts.reduce((a, p) => a + p.x * p.y, 0);
      const sumXX = pts.reduce((a, p) => a + p.x * p.x, 0);
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      const lineNorm = Math.sqrt(slope * slope + 1);
      return Math.max(...pts.map((p) => Math.abs(slope * p.x - p.y + intercept) / lineNorm));
    }

    const rawDeviation = maxPerpDeviationFromFitLine(points);
    const singlePass = movingAverage(points, 7, 1);
    const iterated = movingAverage(points, 7, 3);
    const singlePassDeviation = maxPerpDeviationFromFitLine(singlePass);
    const iteratedDeviation = maxPerpDeviationFromFitLine(iterated);

    // The iterated filter should leave noticeably less residual jitter than a single pass, and
    // both should be well below the raw injected jitter amplitude.
    expect(iteratedDeviation).toBeLessThan(singlePassDeviation * 0.85);
    expect(iteratedDeviation).toBeLessThan(rawDeviation * 0.4);
  });

  it('preserves most of the peak-to-peak amplitude of a genuine sine curve', () => {
    const points: Point[] = Array.from({ length: 150 }, (_, i) => {
      const x = (i / 149) * 2 * Math.PI;
      return { x, y: Math.sin(x) };
    });
    const rawAmplitude = Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y));
    const smoothed = movingAverage(points, 7, 3);
    const smoothedAmplitude =
      Math.max(...smoothed.map((p) => p.y)) - Math.min(...smoothed.map((p) => p.y));

    expect(smoothedAmplitude).toBeGreaterThan(rawAmplitude * 0.8);
  });
});

describe('toFunctionOfX', () => {
  it('averages y within a doubled-back x bin', () => {
    // A stroke that goes right then back left over the same x range at different y.
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 5, y: 10 },
      { x: 0, y: 20 },
    ];
    const result = toFunctionOfX(points, 10);
    // The bin at x=0 should average the y=0 and y=20 samples landing there.
    expect(result.ys[0]).toBeCloseTo(10, 0);
  });

  it('flags isFunctionOfX false for a circle-like stroke', () => {
    const points: Point[] = Array.from({ length: 100 }, (_, i) => {
      const angle = (i / 99) * 2 * Math.PI;
      return { x: Math.cos(angle) * 5, y: Math.sin(angle) * 5 };
    });
    const result = toFunctionOfX(points, 50);
    expect(result.isFunctionOfX).toBe(false);
    expect(result.backtrackFraction).toBeGreaterThan(0.1);
  });

  it('flags isFunctionOfX true for a monotonic left-to-right stroke', () => {
    const points: Point[] = Array.from({ length: 50 }, (_, i) => ({ x: i, y: Math.sin(i / 5) }));
    const result = toFunctionOfX(points, 50);
    expect(result.isFunctionOfX).toBe(true);
    expect(result.backtrackFraction).toBe(0);
  });

  it('produces no gaps (every grid point has a finite y)', () => {
    const points: Point[] = [
      { x: 0, y: 1 },
      { x: 100, y: 5 },
    ];
    const result = toFunctionOfX(points, 150);
    expect(result.ys.every((y) => Number.isFinite(y))).toBe(true);
    expect(result.ys).toHaveLength(150);
  });
});

describe('preprocessStroke', () => {
  it('returns empty for a near-degenerate stroke (tap/tiny jitter, near-zero x-width)', () => {
    // A tight cluster of points within a fraction of a math unit, as a tap or hand tremor would produce.
    const points: Point[] = Array.from({ length: 20 }, (_, i) => ({
      x: Math.cos(i) * 0.05,
      y: Math.sin(i) * 0.05,
    }));
    const result = preprocessStroke(points);
    expect(result.xs).toHaveLength(0);
    expect(result.ys).toHaveLength(0);
  });

  it('processes a normal-width stroke normally', () => {
    const points: Point[] = Array.from({ length: 50 }, (_, i) => ({ x: i * 0.2, y: Math.sin(i * 0.2) }));
    const result = preprocessStroke(points);
    expect(result.xs.length).toBeGreaterThan(1);
    expect(result.ys.every((y) => Number.isFinite(y))).toBe(true);
  });
});
