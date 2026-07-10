import { describe, expect, it } from 'vitest';
import { evaluateSpline, fitNaturalCubicSpline } from './naturalCubicSpline';

describe('fitNaturalCubicSpline', () => {
  it('closely reconstructs a known quadratic at held-out x values', () => {
    // Use a denser sample so the natural boundary condition (zero curvature
    // at the endpoints, which a true parabola doesn't have) only affects a
    // narrow region near the edges rather than the whole interval.
    const xs = Array.from({ length: 21 }, (_, i) => -2 + i * 0.2);
    const ys = xs.map((x) => x * x);
    const { segments } = fitNaturalCubicSpline(xs, ys);

    // Interior held-out points: should be very accurate.
    for (const x of [-1.5, -0.5, 0.5, 1.5]) {
      expect(evaluateSpline(segments, x)).toBeCloseTo(x * x, 2);
    }
    // Near-edge point: natural BC forces curvature toward 0 there, so allow more slack.
    expect(evaluateSpline(segments, -1.9)).toBeCloseTo(1.9 * 1.9, 1);
  });

  it('passes through all the original knots exactly', () => {
    const xs = [0, 1, 2, 3, 4];
    const ys = [0, 2, 1, 3, 0];
    const { segments } = fitNaturalCubicSpline(xs, ys);

    for (let i = 0; i < xs.length; i++) {
      expect(evaluateSpline(segments, xs[i])).toBeCloseTo(ys[i], 6);
    }
  });

  it('is continuous in value across segment boundaries', () => {
    const xs = [0, 1, 2, 3, 4, 5];
    const ys = [0, 3, -1, 2, 4, 1];
    const { segments } = fitNaturalCubicSpline(xs, ys);

    for (let i = 0; i < segments.length - 1; i++) {
      const boundaryX = segments[i].x1;
      const fromLeft =
        segments[i].a +
        segments[i].b * (boundaryX - segments[i].x0) +
        segments[i].c * (boundaryX - segments[i].x0) ** 2 +
        segments[i].d * (boundaryX - segments[i].x0) ** 3;
      const fromRight = segments[i + 1].a; // right segment evaluated at its own x0
      expect(fromLeft).toBeCloseTo(fromRight, 6);
    }
  });

  it('handles the degenerate 2-point (single segment, linear) case', () => {
    const { segments } = fitNaturalCubicSpline([0, 5], [1, 11]);
    expect(segments).toHaveLength(1);
    expect(evaluateSpline(segments, 2.5)).toBeCloseTo(6, 6); // linear midpoint
  });
});
