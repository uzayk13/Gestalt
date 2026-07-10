import { useMemo, useState } from 'react';
import type { Mode, Point } from './types';
import { DrawingCanvas } from './canvas/DrawingCanvas';
import { drawFunctionCurve, drawParametricCurve } from './canvas/CurveRenderer';
import { prepareParametricStroke, preprocessStroke } from './preprocessing/pipeline';
import { evaluateParametricSpline, fitParametricSpline } from './fitting/spline/parametricSpline';
import { fitCleanFormula } from './fitting/formulas/fitCleanFormula';
import { fitCircle } from './fitting/shapes/circle';
import { splineToPieces } from './display/toLatex/splineToLatex';
import { PiecewiseEquationDisplay, EquationDisplay } from './display/EquationDisplay';
import { FitQualityBadge } from './display/FitQualityBadge';
import { ModeToggle } from './ui/ModeToggle';
import { WarningBanner } from './ui/WarningBanner';
import './App.css';

const CIRCLE_FIT_THRESHOLD = 0.1;

function App() {
  const [mode, setMode] = useState<Mode>('spline');
  const [stroke, setStroke] = useState<Point[]>([]);

  // Shared, projection-free preprocessing: preserves multi-valued shapes
  // (circles, loops, self-intersections) exactly, since x(t) and y(t) are
  // each single-valued functions of arc-length t even when y isn't a
  // single-valued function of x.
  const parametric = useMemo(() => prepareParametricStroke(stroke), [stroke]);

  // Spline mode: parametric tracing always works, for any shape.
  const parametricSplineFit = useMemo(() => {
    if (mode !== 'spline' || !parametric) return null;
    return fitParametricSpline(parametric.ts, parametric.xs, parametric.ys);
  }, [mode, parametric]);

  const xPieces = useMemo(
    () => (parametricSplineFit ? splineToPieces(parametricSplineFit.xOfT.segments, 't') : []),
    [parametricSplineFit]
  );
  const yPieces = useMemo(
    () => (parametricSplineFit ? splineToPieces(parametricSplineFit.yOfT.segments, 't') : []),
    [parametricSplineFit]
  );

  // Clean Formula mode: try a closed-shape circle fit first (a circle has no
  // y=f(x) representation at all); otherwise fall back to the y=f(x)
  // function-family search, which needs the x-grid-projected preprocessing.
  const circleFit = useMemo(() => {
    if (mode !== 'cleanFormula' || !parametric || !parametric.isClosed) return null;
    const fit = fitCircle(parametric.xs, parametric.ys);
    return fit && fit.nrmse < CIRCLE_FIT_THRESHOLD ? fit : null;
  }, [mode, parametric]);

  const preprocessedForFunctions = useMemo(() => {
    if (mode !== 'cleanFormula' || circleFit) return null;
    return preprocessStroke(stroke);
  }, [mode, circleFit, stroke]);

  const cleanFormulaFit = useMemo(() => {
    if (!preprocessedForFunctions || preprocessedForFunctions.xs.length < 2) return null;
    return fitCleanFormula(preprocessedForFunctions.xs, preprocessedForFunctions.ys);
  }, [preprocessedForFunctions]);

  const overlayDraw = useMemo(() => {
    if (circleFit) {
      return (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        drawParametricCurve(ctx, width, height, (t) => ({
          x: circleFit.centerX + Math.cos(t * 2 * Math.PI) * circleFit.radius,
          y: circleFit.centerY + Math.sin(t * 2 * Math.PI) * circleFit.radius,
        }));
      };
    }
    if (parametricSplineFit) {
      return (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        drawParametricCurve(ctx, width, height, (t) => evaluateParametricSpline(parametricSplineFit, t));
      };
    }
    if (preprocessedForFunctions && preprocessedForFunctions.xs.length >= 2 && cleanFormulaFit) {
      const xs = preprocessedForFunctions.xs;
      const xDomain: [number, number] = [xs[0], xs[xs.length - 1]];
      return (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        drawFunctionCurve(ctx, width, height, cleanFormulaFit.best.predict, { xDomain });
      };
    }
    return undefined;
  }, [circleFit, parametricSplineFit, preprocessedForFunctions, cleanFormulaFit]);

  const strokeTooShort =
    stroke.length > 0 &&
    ((mode === 'spline' && !parametric) ||
      (mode === 'cleanFormula' && !circleFit && (!preprocessedForFunctions || preprocessedForFunctions.xs.length < 2)));

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>Gestalt</h1>
        <p>Draw a curve. Get its function.</p>
        <ModeToggle mode={mode} onChange={setMode} />
      </header>
      <main className="app-main">
        <div className="canvas-panel">
          <DrawingCanvas onStrokeChange={setStroke} overlayDraw={overlayDraw} />
        </div>
        <aside className="equation-panel">
          {stroke.length === 0 && <p>Draw on the canvas to begin</p>}
          {strokeTooShort && <p>Draw a longer stroke</p>}

          {mode === 'spline' && (
            <>
              <PiecewiseEquationDisplay pieces={xPieces} label="x(t) =" />
              <PiecewiseEquationDisplay pieces={yPieces} label="y(t) =" />
            </>
          )}

          {mode === 'cleanFormula' && circleFit && (
            <>
              <FitQualityBadge familyName="Circle" nrmse={circleFit.nrmse} />
              <EquationDisplay latex={circleFit.latex} />
            </>
          )}

          {mode === 'cleanFormula' && !circleFit && preprocessedForFunctions?.warning && (
            <WarningBanner>{preprocessedForFunctions.warning}</WarningBanner>
          )}

          {mode === 'cleanFormula' && !circleFit && cleanFormulaFit && (
            <>
              <FitQualityBadge
                familyName={cleanFormulaFit.best.familyName}
                nrmse={cleanFormulaFit.best.nrmse}
              />
              {cleanFormulaFit.isPoorFit && (
                <WarningBanner>
                  This is our best-effort fit — it may not accurately represent your drawing.
                </WarningBanner>
              )}
              <EquationDisplay latex={cleanFormulaFit.best.latex} />
            </>
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;
