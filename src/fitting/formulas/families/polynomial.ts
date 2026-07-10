import { PolynomialRegression } from 'ml-regression-polynomial';
import { formatNumber } from '../../../display/toLatex/formatNumber';
import type { FamilyFitResult, FamilyFitter } from '../types';

const DEGREE_NAMES: Record<number, string> = {
  0: 'Constant',
  1: 'Linear',
  2: 'Quadratic',
  3: 'Cubic',
  4: 'Quartic',
};

/** coefficients[0] = constant term, coefficients[1] = x^1, ... (ml-regression-polynomial's order). */
function polynomialToLatex(coefficients: number[]): string {
  const terms: string[] = [];
  for (let power = coefficients.length - 1; power >= 0; power--) {
    const value = coefficients[power];
    if (Math.abs(value) < 1e-9 && coefficients.length > 1) continue;
    const coeffStr = formatNumber(Math.abs(value));
    const sign = value < 0 ? '-' : terms.length === 0 ? '' : '+';
    let term: string;
    if (power === 0) term = coeffStr;
    else if (power === 1) term = coeffStr === '1' ? 'x' : `${coeffStr}x`;
    else term = coeffStr === '1' ? `x^${power}` : `${coeffStr}x^${power}`;
    terms.push(`${sign} ${term}`.trim());
  }
  return terms.length === 0 ? '0' : terms.join(' ');
}

function fitPolynomialDegree(degree: number): FamilyFitter {
  return (xs, ys) => {
    if (xs.length < degree + 1) return null;
    const reg = new PolynomialRegression(xs, ys, degree);
    const result: FamilyFitResult = {
      familyName: DEGREE_NAMES[degree] ?? `Degree ${degree}`,
      latex: `f(x) = ${polynomialToLatex(reg.coefficients)}`,
      paramCount: degree + 1,
      predict: (x) => reg.predict(x),
    };
    return result;
  };
}

export const polynomialFamilies: FamilyFitter[] = [0, 1, 2, 3, 4].map(fitPolynomialDegree);
