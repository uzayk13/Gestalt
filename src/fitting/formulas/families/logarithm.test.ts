import { describe, expect, it } from 'vitest';
import { logarithmFamily } from './logarithm';

function linspace(start: number, end: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => start + (i / (n - 1)) * (end - start));
}

describe('logarithmFamily', () => {
  it('recovers a*ln(x)+b on a positive domain', () => {
    const xs = linspace(1, 10, 50);
    const ys = xs.map((x) => 2 * Math.log(x) + 1);
    const result = logarithmFamily(xs, ys);

    expect(result).not.toBeNull();
    expect(result!.familyName).toBe('Logarithm');
    for (const x of [1, 2, 5, 10]) {
      expect(result!.predict(x)).toBeCloseTo(2 * Math.log(x) + 1, 2);
    }
  });

  it('returns null when the domain includes x<=0', () => {
    const xs = linspace(-5, 5, 50);
    const ys = xs.map((x) => x);
    expect(logarithmFamily(xs, ys)).toBeNull();
  });

  it('returns null for too few points', () => {
    expect(logarithmFamily([1, 2], [0, 1])).toBeNull();
  });
});
