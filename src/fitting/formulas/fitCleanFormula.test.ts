import { describe, expect, it } from 'vitest';
import { fitCleanFormula } from './fitCleanFormula';
import { compositeScore, nrmse } from './scoring';

function linspace(start: number, end: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => start + (i / (n - 1)) * (end - start));
}

describe('fitCleanFormula', () => {
  it('recovers a linear function and does not over-fit it with a higher-degree polynomial', () => {
    const xs = linspace(-5, 5, 50);
    const ys = xs.map((x) => 2 * x + 3);
    const result = fitCleanFormula(xs, ys);

    expect(result).not.toBeNull();
    expect(result!.best.familyName).toBe('Linear');
    expect(result!.best.nrmse).toBeLessThan(0.01);
    expect(result!.isPoorFit).toBe(false);
  });

  it('recovers a quadratic function', () => {
    const xs = linspace(-5, 5, 50);
    const ys = xs.map((x) => 0.5 * x * x - 2 * x + 1);
    const result = fitCleanFormula(xs, ys);

    expect(result!.best.familyName).toBe('Quadratic');
    expect(result!.best.nrmse).toBeLessThan(0.01);
  });

  it('recovers parameters close to ground truth for a cubic', () => {
    const xs = linspace(-3, 3, 60);
    // y = x^3 - 2x
    const ys = xs.map((x) => x ** 3 - 2 * x);
    const result = fitCleanFormula(xs, ys);

    expect(result!.best.familyName).toBe('Cubic');
    for (const x of [-2, -1, 0, 1, 2]) {
      expect(result!.best.predict(x)).toBeCloseTo(x ** 3 - 2 * x, 2);
    }
  });

  it('flags a poor fit when the data matches no family well', () => {
    const xs = linspace(0, 10, 60);
    // Sawtooth: none of the curated families should fit this cleanly.
    const ys = xs.map((x) => x % 2);
    const result = fitCleanFormula(xs, ys);

    expect(result!.isPoorFit).toBe(true);
  });

  it('returns null for fewer than 2 points', () => {
    expect(fitCleanFormula([1], [1])).toBeNull();
    expect(fitCleanFormula([], [])).toBeNull();
  });

  it('recovers a sine wave', () => {
    const xs = linspace(-10, 10, 100);
    const ys = xs.map((x) => 2 * Math.sin(x + 0.3) + 1);
    const result = fitCleanFormula(xs, ys);

    expect(result!.best.familyName).toBe('Sine');
    expect(result!.best.nrmse).toBeLessThan(0.01);
  });

  it('recovers exponential growth', () => {
    const xs = linspace(0, 5, 50);
    const ys = xs.map((x) => 2 * Math.exp(0.5 * x) + 1);
    const result = fitCleanFormula(xs, ys);

    expect(result!.best.familyName).toBe('Exponential');
    expect(result!.best.nrmse).toBeLessThan(0.01);
  });

  it('recovers exponential decay', () => {
    const xs = linspace(0, 10, 50);
    const ys = xs.map((x) => 5 * Math.exp(-0.3 * x) + 2);
    const result = fitCleanFormula(xs, ys);

    expect(result!.best.familyName).toBe('Exponential');
    expect(result!.best.nrmse).toBeLessThan(0.01);
  });

  it('recovers a power law on a positive domain', () => {
    const xs = linspace(1, 10, 50);
    const ys = xs.map((x) => 3 * Math.pow(x, 1.5));
    const result = fitCleanFormula(xs, ys);

    expect(result!.best.familyName).toBe('Power');
    expect(result!.best.nrmse).toBeLessThan(0.01);
  });

  it('recovers a rational function away from x=0', () => {
    const xs = linspace(1, 10, 50);
    const ys = xs.map((x) => 4 / x + 2);
    const result = fitCleanFormula(xs, ys);

    expect(result!.best.familyName).toBe('Rational');
    expect(result!.best.nrmse).toBeLessThan(0.01);
  });

  it('recovers a gaussian bump', () => {
    const xs = linspace(-5, 5, 80);
    const ys = xs.map((x) => 3 * Math.exp(-((x - 0) ** 2) / 2) + 1);
    const result = fitCleanFormula(xs, ys);

    expect(result!.best.familyName).toBe('Gaussian');
    expect(result!.best.nrmse).toBeLessThan(0.02);
  });

  it('does not offer Power or Rational when the domain crosses x=0', () => {
    const xs = linspace(-5, 5, 50);
    const ys = xs.map((x) => 2 * x + 3);
    const result = fitCleanFormula(xs, ys);

    expect(result!.candidates.some((c) => c.familyName === 'Power')).toBe(false);
    expect(result!.candidates.some((c) => c.familyName === 'Rational')).toBe(false);
  });
});

describe('scoring', () => {
  it('nrmse is near zero for a perfect fit', () => {
    const actual = [1, 2, 3, 4, 5];
    expect(nrmse(actual, actual)).toBeCloseTo(0, 6);
  });

  it('nrmse increases with prediction error', () => {
    const actual = [1, 2, 3, 4, 5];
    const closePredicted = [1.1, 2, 3, 4, 4.9];
    const farPredicted = [3, 5, 1, 8, 0];
    expect(nrmse(actual, closePredicted)).toBeLessThan(nrmse(actual, farPredicted));
  });

  it('param-count penalty breaks ties toward the simpler candidate', () => {
    const simple = compositeScore(0.05, 2);
    const complex = compositeScore(0.05, 5);
    expect(simple).toBeLessThan(complex);
  });

  it('a substantially better fit still wins despite more params', () => {
    const worseButSimpler = compositeScore(0.2, 2);
    const betterButMoreParams = compositeScore(0.05, 5);
    expect(betterButMoreParams).toBeLessThan(worseButSimpler);
  });
});
