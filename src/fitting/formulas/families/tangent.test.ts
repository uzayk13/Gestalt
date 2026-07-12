import { describe, expect, it } from 'vitest';
import { tangentFamily } from './tangent';
import { fitCleanFormula } from '../fitCleanFormula';

function linspace(start: number, end: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => start + (i / (n - 1)) * (end - start));
}

describe('tangentFamily', () => {
  it('recovers a*tan(bx+c)+d on a domain that avoids its own asymptotes', () => {
    // Asymptotes of 0.5x+0.2 = +-pi/2 fall at x ~= 2.74 and x ~= -3.54; this
    // range stays well clear of both.
    const xs = linspace(-2.5, 2, 60);
    const ys = xs.map((x) => 1.5 * Math.tan(0.5 * x + 0.2) + 0.3);
    const result = tangentFamily(xs, ys);

    expect(result).not.toBeNull();
    expect(result!.familyName).toBe('Tangent');
    for (const x of [-2, -1, 0, 1, 1.8]) {
      expect(result!.predict(x)).toBeCloseTo(1.5 * Math.tan(0.5 * x + 0.2) + 0.3, 1);
    }
  });

  it('returns null for too few points', () => {
    expect(tangentFamily([1, 2, 3], [1, 2, 3])).toBeNull();
  });

  it('rejects (or produces a stable, non-garbage fit for) data whose domain straddles a tangent asymptote', () => {
    // xs spans across x = +-pi/2, where tan(x) itself has vertical
    // asymptotes — any fit landing on b=1,c=0 would blow up inside the
    // observed range, which the fitter's post-fit magnitude/finite guard
    // must catch.
    const xs = linspace(-3, 3, 80);
    const ys = xs.map((x) => Math.tan(x));
    const result = tangentFamily(xs, ys);

    if (result !== null) {
      // If a fit was returned, it must be sane everywhere in the domain —
      // never NaN/Infinity, and not wildly exceeding the input's own scale.
      const yRange = Math.max(...ys) - Math.min(...ys);
      for (const x of linspace(-3, 3, 50)) {
        const y = result.predict(x);
        expect(Number.isFinite(y)).toBe(true);
        expect(Math.abs(y)).toBeLessThanOrEqual(100 * yRange);
      }
    }
  });

  it('does not crash fitCleanFormula when the domain straddles a tangent asymptote', () => {
    const xs = linspace(-3, 3, 80);
    const ys = xs.map((x) => Math.tan(x));
    expect(() => fitCleanFormula(xs, ys)).not.toThrow();
    const result = fitCleanFormula(xs, ys);
    expect(result).not.toBeNull();
    for (const x of xs) {
      expect(Number.isFinite(result!.best.predict(x))).toBe(true);
    }
  });
});
