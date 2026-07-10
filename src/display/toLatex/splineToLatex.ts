import type { SplineSegment } from '../../types';
import { formatNumber } from './formatNumber';

function segmentExpressionToLatex(segment: SplineSegment, variableName: string): string {
  const { a, b, c, d, x0 } = segment;
  const shifted =
    x0 === 0 ? variableName : `(${variableName} ${x0 > 0 ? '-' : '+'} ${formatNumber(Math.abs(x0))})`;
  const coeffs: Array<{ power: number; value: number }> = [
    { power: 0, value: a },
    { power: 1, value: b },
    { power: 2, value: c },
    { power: 3, value: d },
  ];

  const terms: string[] = [];
  for (const { power, value } of coeffs) {
    if (Math.abs(value) < 1e-9) continue;
    const coeffStr = formatNumber(Math.abs(value));
    const sign = value < 0 ? '-' : terms.length === 0 ? '' : '+';
    let term: string;
    if (power === 0) term = coeffStr;
    else if (power === 1) term = coeffStr === '1' ? shifted : `${coeffStr}${shifted}`;
    else term = coeffStr === '1' ? `${shifted}^${power}` : `${coeffStr}${shifted}^${power}`;
    terms.push(`${sign} ${term}`.trim());
  }

  return terms.length === 0 ? '0' : terms.join(' ');
}

export interface PiecewiseRow {
  expressionLatex: string;
  conditionText: string;
}

/**
 * One row per spline segment, rendered independently rather than as a single
 * LaTeX `cases` array — react-katex's bundled KaTeX copy fails to parse both
 * the `&`-column-separated `cases` environment and `\text{}`/`\le` in this
 * project's build (isolated Node tests against the same katex versions
 * succeed on identical input, so it's a bundler/runtime interaction, not a
 * content bug). The condition ("for a ≤ x < b") is plain descriptive text
 * rather than a real math expression, so it's rendered as plain Unicode text
 * instead of going through KaTeX at all — sidesteps the issue and is simpler.
 *
 * `variableName` lets the same spline-to-pieces logic serve both y=f(x)
 * splines and parametric x(t)/y(t) splines.
 */
export function splineToPieces(segments: SplineSegment[], variableName = 'x'): PiecewiseRow[] {
  return segments.map((segment, i) => {
    const isLast = i === segments.length - 1;
    const upperOp = isLast ? '≤' : '<';
    return {
      expressionLatex: segmentExpressionToLatex(segment, variableName),
      conditionText: `for ${formatNumber(segment.x0)} ≤ ${variableName} ${upperOp} ${formatNumber(segment.x1)}`,
    };
  });
}
