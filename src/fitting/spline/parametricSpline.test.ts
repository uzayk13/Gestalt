import { describe, expect, it } from 'vitest';
import { evaluateParametricSpline, fitParametricSpline } from './parametricSpline';

describe('fitParametricSpline', () => {
  it('traces a circle closely, unlike a y=f(x) fit which cannot represent one at all', () => {
    const n = 60;
    const ts = Array.from({ length: n }, (_, i) => i / (n - 1));
    const xs = ts.map((t) => Math.cos(t * 2 * Math.PI) * 5);
    const ys = ts.map((t) => Math.sin(t * 2 * Math.PI) * 5);

    const fit = fitParametricSpline(ts, xs, ys);

    for (const t of [0.1, 0.25, 0.4, 0.6, 0.75, 0.9]) {
      const { x, y } = evaluateParametricSpline(fit, t);
      const expectedX = Math.cos(t * 2 * Math.PI) * 5;
      const expectedY = Math.sin(t * 2 * Math.PI) * 5;
      expect(x).toBeCloseTo(expectedX, 1);
      expect(y).toBeCloseTo(expectedY, 1);
      // Sanity check this is genuinely on the circle (radius ~5 from origin).
      expect(Math.hypot(x, y)).toBeCloseTo(5, 1);
    }
  });

  it('traces a figure-8 (self-intersecting, not a function of x or a simple loop)', () => {
    const n = 80;
    const ts = Array.from({ length: n }, (_, i) => i / (n - 1));
    const xs = ts.map((t) => Math.sin(t * 2 * Math.PI) * 4);
    const ys = ts.map((t) => Math.sin(t * 2 * Math.PI) * Math.cos(t * 2 * Math.PI) * 4);

    const fit = fitParametricSpline(ts, xs, ys);

    for (const t of [0.2, 0.5, 0.8]) {
      const { x, y } = evaluateParametricSpline(fit, t);
      expect(x).toBeCloseTo(Math.sin(t * 2 * Math.PI) * 4, 1);
      expect(y).toBeCloseTo(Math.sin(t * 2 * Math.PI) * Math.cos(t * 2 * Math.PI) * 4, 1);
    }
  });

  it('passes through the original points at their own t exactly', () => {
    const ts = [0, 0.25, 0.5, 0.75, 1];
    const xs = [0, 1, 0, -1, 0];
    const ys = [1, 0, -1, 0, 1];
    const fit = fitParametricSpline(ts, xs, ys);

    for (let i = 0; i < ts.length; i++) {
      const { x, y } = evaluateParametricSpline(fit, ts[i]);
      expect(x).toBeCloseTo(xs[i], 6);
      expect(y).toBeCloseTo(ys[i], 6);
    }
  });
});
