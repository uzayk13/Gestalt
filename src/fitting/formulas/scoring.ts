/** RMSE normalized by the y-range, so fit quality is comparable across differently-scaled strokes. */
export function nrmse(actual: number[], predicted: number[]): number {
  const n = actual.length;
  const sumSq = actual.reduce((acc, y, i) => acc + (y - predicted[i]) ** 2, 0);
  const rmse = Math.sqrt(sumSq / n);
  const range = Math.max(...actual) - Math.min(...actual);
  return range > 1e-9 ? rmse / range : rmse;
}

const PARAM_PENALTY = 0.015;

/** Small linear penalty on parameter count — a tiebreaker toward simpler
 * families between near-equally-good fits, not strong enough to override a
 * genuinely better fit. */
export function compositeScore(nrmseValue: number, paramCount: number): number {
  return nrmseValue + PARAM_PENALTY * paramCount;
}
