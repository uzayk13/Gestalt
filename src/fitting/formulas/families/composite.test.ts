import { describe, expect, it } from 'vitest';
import { compositeFamily } from './composite';

function linspace(start: number, end: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => start + (i / (n - 1)) * (end - start));
}

describe('compositeFamily', () => {
  it('recovers a quadratic trend plus a sine oscillation', () => {
    const xs = linspace(-5, 5, 100);
    const trend = (x: number) => 0.3 * x * x + 0.5 * x + 1;
    const oscillation = (x: number) => 1.2 * Math.sin(2 * x + 0.1);
    const ys = xs.map((x) => trend(x) + oscillation(x));

    const result = compositeFamily(xs, ys);

    expect(result).not.toBeNull();
    expect(result!.familyName).toContain('Composite');
    for (const x of [-4, -2, 0, 2, 4]) {
      expect(result!.predict(x)).toBeCloseTo(trend(x) + oscillation(x), 0);
    }
  });

  it('returns null when the residual has no fittable oscillation (pure trend, too few points for the sine sub-fit)', () => {
    const xs = [0, 1, 2, 3];
    const ys = xs.map((x) => 2 * x + 1);
    expect(compositeFamily(xs, ys)).toBeNull();
  });
});
