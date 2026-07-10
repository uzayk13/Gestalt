import { useEffect, useRef, useState } from 'react';
import type { Point } from '../types';
import { DEFAULT_MATH_RANGE, drawAxes, mathToScreen, screenToMath } from './viewport';

interface DrawingCanvasProps {
  onStrokeChange: (mathPoints: Point[]) => void;
  overlayDraw?: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

export function DrawingCanvas({ onStrokeChange, overlayDraw }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // A ref, not state: only read inside event handlers (never rendered), and
  // state's async/batched updates left a stale-closure gap on fast
  // down->up sequences with no intermediate move (e.g. a quick tap).
  const isDrawingRef = useRef(false);
  const rawPointsRef = useRef<Point[]>([]);
  const [size, setSize] = useState({ width: 600, height: 600 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const side = Math.floor(Math.min(entry.contentRect.width, entry.contentRect.height));
      setSize({ width: side, height: side });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size.width, size.height);
    drawAxes(ctx, size.width, size.height, DEFAULT_MATH_RANGE);

    if (rawPointsRef.current.length > 1) {
      ctx.strokeStyle = '#3a7bd5';
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      rawPointsRef.current.forEach((p, i) => {
        const screen = mathToScreen(p, size.width, size.height, DEFAULT_MATH_RANGE);
        if (i === 0) ctx.moveTo(screen.x, screen.y);
        else ctx.lineTo(screen.x, screen.y);
      });
      ctx.stroke();
    }

    if (overlayDraw) overlayDraw(ctx, size.width, size.height);
  };

  useEffect(() => {
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, overlayDraw]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    rawPointsRef.current = [];
    isDrawingRef.current = true;
    const screenPt = getCanvasPoint(e);
    const mathPt = screenToMath(screenPt, size.width, size.height, DEFAULT_MATH_RANGE);
    rawPointsRef.current.push(mathPt);
    render();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const screenPt = getCanvasPoint(e);
    const mathPt = screenToMath(screenPt, size.width, size.height, DEFAULT_MATH_RANGE);
    rawPointsRef.current.push(mathPt);
    render();
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    onStrokeChange([...rawPointsRef.current]);
  };

  const handleClear = () => {
    rawPointsRef.current = [];
    onStrokeChange([]);
    render();
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
        style={{ touchAction: 'none', border: '1px solid #ccc', borderRadius: 8, background: '#fff' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <button
        onClick={handleClear}
        style={{ position: 'absolute', top: 12, right: 12 }}
      >
        Clear
      </button>
    </div>
  );
}
