import type { CleanFormulaCandidate, CleanFormulaFitResult } from '../../types';
import { compositeFamily } from './families/composite';
import { exponentialFamily } from './families/exponential';
import { gaussianFamily } from './families/gaussian';
import { logarithmFamily } from './families/logarithm';
import { polynomialFamilies } from './families/polynomial';
import { powerFamily } from './families/power';
import { rationalFamily } from './families/rational';
import { sineFamily } from './families/sine';
import { tangentFamily } from './families/tangent';
import { compositeScore, nrmse } from './scoring';
import type { FamilyFitter } from './types';

const POOR_FIT_THRESHOLD = 0.1;

const ALL_FAMILIES: FamilyFitter[] = [
  ...polynomialFamilies,
  sineFamily,
  exponentialFamily,
  powerFamily,
  rationalFamily,
  gaussianFamily,
  logarithmFamily,
  tangentFamily,
  compositeFamily,
];

export function fitCleanFormula(xs: number[], ys: number[]): CleanFormulaFitResult | null {
  if (xs.length < 2) return null;

  const candidates: CleanFormulaCandidate[] = [];
  for (const fitter of ALL_FAMILIES) {
    const result = fitter(xs, ys);
    if (!result) continue;
    const predicted = xs.map(result.predict);
    const nrmseValue = nrmse(ys, predicted);
    if (!Number.isFinite(nrmseValue)) continue;
    candidates.push({
      familyName: result.familyName,
      latex: result.latex,
      paramCount: result.paramCount,
      nrmse: nrmseValue,
      score: compositeScore(nrmseValue, result.paramCount),
      predict: result.predict,
    });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.score - b.score);
  const best = candidates[0];

  return {
    kind: 'cleanFormula',
    best,
    candidates,
    isPoorFit: best.nrmse > POOR_FIT_THRESHOLD,
  };
}
