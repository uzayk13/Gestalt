import type { SplineFitResult, SplineSegment } from '../../types';

/**
 * Fits a natural cubic spline (second derivative = 0 at both endpoints)
 * through the given points, returning explicit per-segment coefficients
 * `a + b(x-x0) + c(x-x0)^2 + d(x-x0)^3` — needed both to render the curve
 * and to display the literal piecewise formula.
 */
export function fitNaturalCubicSpline(xs: number[], ys: number[]): SplineFitResult {
  const n = xs.length - 1; // number of segments
  if (n < 1) return { kind: 'spline', segments: [] };

  const h: number[] = [];
  for (let i = 0; i < n; i++) h.push(xs[i + 1] - xs[i]);

  // Second derivatives at each knot; M[0] = M[n] = 0 (natural boundary).
  const M = new Array(n + 1).fill(0);

  if (n >= 2) {
    // Thomas algorithm on the tridiagonal system for the interior M[1..n-1].
    const size = n - 1;
    const subDiag = new Array(size).fill(0);
    const diag = new Array(size).fill(0);
    const superDiag = new Array(size).fill(0);
    const rhs = new Array(size).fill(0);

    for (let i = 1; i < n; i++) {
      const idx = i - 1;
      diag[idx] = 2 * (h[i - 1] + h[i]);
      if (idx > 0) subDiag[idx] = h[i - 1];
      if (idx < size - 1) superDiag[idx] = h[i];
      rhs[idx] = 6 * ((ys[i + 1] - ys[i]) / h[i] - (ys[i] - ys[i - 1]) / h[i - 1]);
    }

    const cPrime = new Array(size).fill(0);
    const dPrime = new Array(size).fill(0);
    cPrime[0] = superDiag[0] / diag[0];
    dPrime[0] = rhs[0] / diag[0];
    for (let i = 1; i < size; i++) {
      const denom = diag[i] - subDiag[i] * cPrime[i - 1];
      cPrime[i] = superDiag[i] / denom;
      dPrime[i] = (rhs[i] - subDiag[i] * dPrime[i - 1]) / denom;
    }

    const solved = new Array(size).fill(0);
    solved[size - 1] = dPrime[size - 1];
    for (let i = size - 2; i >= 0; i--) {
      solved[i] = dPrime[i] - cPrime[i] * solved[i + 1];
    }
    for (let i = 1; i < n; i++) M[i] = solved[i - 1];
  }

  const segments: SplineSegment[] = [];
  for (let i = 0; i < n; i++) {
    const hi = h[i];
    const a = ys[i];
    const b = (ys[i + 1] - ys[i]) / hi - (hi * (2 * M[i] + M[i + 1])) / 6;
    const c = M[i] / 2;
    const d = (M[i + 1] - M[i]) / (6 * hi);
    segments.push({ x0: xs[i], x1: xs[i + 1], a, b, c, d });
  }

  return { kind: 'spline', segments };
}

function findSegment(segments: SplineSegment[], x: number): SplineSegment {
  if (x <= segments[0].x0) return segments[0];
  const last = segments[segments.length - 1];
  if (x >= last.x1) return last;
  // Segments are contiguous and sorted, so a linear scan is fine at this scale.
  for (const segment of segments) {
    if (x >= segment.x0 && x <= segment.x1) return segment;
  }
  return last;
}

export function evaluateSpline(segments: SplineSegment[], x: number): number {
  if (segments.length === 0) return NaN;
  const segment = findSegment(segments, x);
  const dx = x - segment.x0;
  return segment.a + segment.b * dx + segment.c * dx * dx + segment.d * dx * dx * dx;
}
