import type { MathRange, Point } from '../types';

export const DEFAULT_MATH_RANGE: MathRange = {
  xMin: -10,
  xMax: 10,
  yMin: -10,
  yMax: 10,
};

export function screenToMath(
  point: Point,
  canvasWidth: number,
  canvasHeight: number,
  range: MathRange = DEFAULT_MATH_RANGE
): Point {
  return {
    x: range.xMin + (point.x / canvasWidth) * (range.xMax - range.xMin),
    y: range.yMax - (point.y / canvasHeight) * (range.yMax - range.yMin),
  };
}

export function mathToScreen(
  point: Point,
  canvasWidth: number,
  canvasHeight: number,
  range: MathRange = DEFAULT_MATH_RANGE
): Point {
  return {
    x: ((point.x - range.xMin) / (range.xMax - range.xMin)) * canvasWidth,
    y: ((range.yMax - point.y) / (range.yMax - range.yMin)) * canvasHeight,
  };
}

export function drawAxes(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  range: MathRange = DEFAULT_MATH_RANGE
): void {
  ctx.save();

  ctx.strokeStyle = '#e2e2e2';
  ctx.lineWidth = 1;
  for (let gx = Math.ceil(range.xMin); gx <= Math.floor(range.xMax); gx++) {
    const { x } = mathToScreen({ x: gx, y: 0 }, canvasWidth, canvasHeight, range);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
    ctx.stroke();
  }
  for (let gy = Math.ceil(range.yMin); gy <= Math.floor(range.yMax); gy++) {
    const { y } = mathToScreen({ x: 0, y: gy }, canvasWidth, canvasHeight, range);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1.5;
  const origin = mathToScreen({ x: 0, y: 0 }, canvasWidth, canvasHeight, range);
  ctx.beginPath();
  ctx.moveTo(0, origin.y);
  ctx.lineTo(canvasWidth, origin.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(origin.x, 0);
  ctx.lineTo(origin.x, canvasHeight);
  ctx.stroke();

  ctx.restore();
}
