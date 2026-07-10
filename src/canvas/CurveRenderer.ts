import type { MathRange, Point } from '../types';
import { DEFAULT_MATH_RANGE, mathToScreen } from './viewport';

/**
 * Draws `evaluate(x)` as a smooth curve. By default samples the full visible
 * math range, but a fitted function is typically only meaningful within the
 * x-domain the user actually drew — outside it, polynomial/periodic fits can
 * extrapolate wildly (a cubic shooting off-screen, a sine repeating across
 * the whole canvas). Pass `xDomain` to restrict drawing to that range.
 */
export function drawFunctionCurve(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  evaluate: (x: number) => number,
  options: { range?: MathRange; xDomain?: [number, number]; color?: string; lineWidth?: number } = {}
): void {
  const range = options.range ?? DEFAULT_MATH_RANGE;
  const color = options.color ?? '#e0446b';
  const lineWidth = options.lineWidth ?? 2.5;
  const xStart = options.xDomain ? Math.max(range.xMin, options.xDomain[0]) : range.xMin;
  const xEnd = options.xDomain ? Math.min(range.xMax, options.xDomain[1]) : range.xMax;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();

  const samples = Math.max(200, Math.floor(width));
  let started = false;
  for (let i = 0; i <= samples; i++) {
    const x = xStart + (i / samples) * (xEnd - xStart);
    const y = evaluate(x);
    if (!Number.isFinite(y)) {
      started = false;
      continue;
    }
    const screen = mathToScreen({ x, y }, width, height, range);
    if (!started) {
      ctx.moveTo(screen.x, screen.y);
      started = true;
    } else {
      ctx.lineTo(screen.x, screen.y);
    }
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws a parametric curve `evaluate(t)` for t in [0,1] as a path — unlike
 * `drawFunctionCurve`, this naturally handles closed loops and
 * self-intersecting shapes (circles, figure-8s) since it's tracing a path,
 * not graphing a function of x.
 */
export function drawParametricCurve(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  evaluate: (t: number) => Point,
  options: { range?: MathRange; color?: string; lineWidth?: number; samples?: number } = {}
): void {
  const range = options.range ?? DEFAULT_MATH_RANGE;
  const color = options.color ?? '#e0446b';
  const lineWidth = options.lineWidth ?? 2.5;
  const samples = options.samples ?? Math.max(400, Math.floor(width) * 2);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();

  let started = false;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const { x, y } = evaluate(t);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      started = false;
      continue;
    }
    const screen = mathToScreen({ x, y }, width, height, range);
    if (!started) {
      ctx.moveTo(screen.x, screen.y);
      started = true;
    } else {
      ctx.lineTo(screen.x, screen.y);
    }
  }
  ctx.stroke();
  ctx.restore();
}
