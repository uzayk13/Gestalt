import { describe, expect, it } from 'vitest';
import { fitCircle } from './circle';

describe('fitCircle', () => {
  it('recovers center and radius from a perfect circle', () => {
    const n = 60;
    const cx = 2;
    const cy = -3;
    const r = 5;
    const xs = Array.from({ length: n }, (_, i) => cx + Math.cos((i / n) * 2 * Math.PI) * r);
    const ys = Array.from({ length: n }, (_, i) => cy + Math.sin((i / n) * 2 * Math.PI) * r);

    const result = fitCircle(xs, ys);
    expect(result).not.toBeNull();
    expect(result!.centerX).toBeCloseTo(cx, 6);
    expect(result!.centerY).toBeCloseTo(cy, 6);
    expect(result!.radius).toBeCloseTo(r, 6);
    expect(result!.nrmse).toBeCloseTo(0, 6);
  });

  it('handles a circle centered at the origin', () => {
    const n = 40;
    const xs = Array.from({ length: n }, (_, i) => Math.cos((i / n) * 2 * Math.PI) * 3);
    const ys = Array.from({ length: n }, (_, i) => Math.sin((i / n) * 2 * Math.PI) * 3);
    const result = fitCircle(xs, ys);
    expect(result!.centerX).toBeCloseTo(0, 4);
    expect(result!.centerY).toBeCloseTo(0, 4);
    expect(result!.radius).toBeCloseTo(3, 4);
  });

  it('gives a high nrmse for points that are not close to any circle', () => {
    // A straight line is about as far from a circle as it gets.
    const xs = Array.from({ length: 30 }, (_, i) => i * 0.5);
    const ys = Array.from({ length: 30 }, (_, i) => i * 0.5);
    const result = fitCircle(xs, ys);
    if (result) {
      expect(result.nrmse).toBeGreaterThan(0.1);
    }
  });

  it('returns null for too few points', () => {
    expect(fitCircle([0, 1], [0, 1])).toBeNull();
  });
});
