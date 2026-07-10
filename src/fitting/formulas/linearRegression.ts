/** Closed-form ordinary least squares for a single-variable linear fit; used to seed nonlinear families via linearizing transforms (log-log, log-y, 1/x). */
export function simpleLinearRegression(xs: number[], ys: number[]): { slope: number; intercept: number } {
  const n = xs.length;
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  const slope = den > 1e-12 ? num / den : 0;
  return { slope, intercept: yMean - slope * xMean };
}
