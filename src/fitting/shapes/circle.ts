import { formatNumber } from '../../display/toLatex/formatNumber';

export interface CircleFitResult {
  centerX: number;
  centerY: number;
  radius: number;
  latex: string;
  nrmse: number;
}

/** Solves the 3x3 linear system Ax=b via Cramer's rule. Returns null if A is singular. */
function solve3x3(A: number[][], b: number[]): number[] | null {
  const det = (m: number[][]) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

  const detA = det(A);
  if (Math.abs(detA) < 1e-9) return null;

  const solved: number[] = [];
  for (let col = 0; col < 3; col++) {
    const Ai = A.map((row) => [...row]);
    for (let row = 0; row < 3; row++) Ai[row][col] = b[row];
    solved.push(det(Ai) / detA);
  }
  return solved;
}

/**
 * Algebraic least-squares circle fit (Kåsa method): the circle equation
 * x^2+y^2+Dx+Ey+F=0 is linear in D,E,F (rewrite as Dx+Ey+F=-(x^2+y^2)), so it
 * reduces to a 3x3 linear system rather than needing nonlinear optimization.
 * Center = (-D/2,-E/2), radius = sqrt((D^2+E^2)/4 - F).
 */
export function fitCircle(xs: number[], ys: number[]): CircleFitResult | null {
  const n = xs.length;
  if (n < 5) return null;

  let sumX = 0,
    sumY = 0,
    sumX2 = 0,
    sumY2 = 0,
    sumXY = 0,
    sumXZ = 0,
    sumYZ = 0,
    sumZ = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const y = ys[i];
    const z = -(x * x + y * y);
    sumX += x;
    sumY += y;
    sumX2 += x * x;
    sumY2 += y * y;
    sumXY += x * y;
    sumXZ += x * z;
    sumYZ += y * z;
    sumZ += z;
  }

  const A = [
    [sumX2, sumXY, sumX],
    [sumXY, sumY2, sumY],
    [sumX, sumY, n],
  ];
  const b = [sumXZ, sumYZ, sumZ];
  const solved = solve3x3(A, b);
  if (!solved) return null;

  const [D, E, F] = solved;
  const centerX = -D / 2;
  const centerY = -E / 2;
  const radiusSq = centerX * centerX + centerY * centerY - F;
  if (radiusSq <= 1e-9) return null;
  const radius = Math.sqrt(radiusSq);

  let sse = 0;
  for (let i = 0; i < n; i++) {
    const dist = Math.hypot(xs[i] - centerX, ys[i] - centerY);
    sse += (dist - radius) ** 2;
  }
  const nrmse = Math.sqrt(sse / n) / radius;

  const xSign = centerX >= 0 ? '-' : '+';
  const ySign = centerY >= 0 ? '-' : '+';
  const latex = `(x ${xSign} ${formatNumber(Math.abs(centerX))})^2 + (y ${ySign} ${formatNumber(Math.abs(centerY))})^2 = ${formatNumber(radius)}^2`;

  return { centerX, centerY, radius, latex, nrmse };
}
