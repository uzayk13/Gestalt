# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Gestalt is the reverse of Desmos: the user draws a curve freehand on a canvas, and the app returns the mathematical function for it. Stack: React + TypeScript + Vite.

Two output modes, both always available regardless of what shape was drawn (open curve, closed loop, self-intersecting scribble):
- **Spline mode** — always traces the stroke exactly via a parametric fit (see below). No restrictions on shape.
- **Clean Formula mode** — tries to recognize the drawing as one elegant equation from a curated library (polynomials, sine, exponential, power, rational, gaussian, circle). Falls back to a best-effort answer with a warning when nothing fits well or the shape isn't one of the recognized families.

## Commands

```bash
npm run dev       # start dev server (vite)
npm run build     # typecheck (tsc -b) then production build
npm run lint      # oxlint
npm test          # vitest run (all tests, once)
npx vitest run path/to/file.test.ts   # run a single test file
npx vitest        # watch mode
```

There is no `test:ui` or coverage script configured. Tests live next to the code they cover (`*.test.ts`).

## Architecture

Wired together in `src/App.tsx`. There are **two parallel preprocessing paths** off the same raw stroke, because Spline mode and Clean Formula mode need fundamentally different representations:

```
raw pointer stroke (canvas/DrawingCanvas.tsx)
  |
  +-- preprocessing/pipeline.ts: prepareParametricStroke()
  |     (resample -> smooth; NO x-grid projection, so multi-valued
  |      shapes like circles/loops/figure-8s survive intact)
  |     -> fitting/spline/parametricSpline.ts   [Spline mode: always]
  |     -> fitting/shapes/circle.ts             [Clean Formula: tried first, closed strokes only]
  |
  +-- preprocessing/pipeline.ts: preprocessStroke()
        (resample -> smooth -> project onto x-grid, y=f(x) only)
        -> fitting/formulas/fitCleanFormula.ts  [Clean Formula: fallback when not a circle]
```

Both paths render via `canvas/CurveRenderer.ts` and display via `display/EquationDisplay.tsx` (KaTeX).

**`preprocessing/pipeline.ts`** exports two independent entry points:
- `prepareParametricStroke()` — resample by arc length + moving-average smooth, **no projection**. Returns `{ ts, xs, ys, isClosed }` where `ts` is an evenly-spaced arc-length parameter in `[0,1]`. `isClosed` is true when the stroke's start and end points are within 15% of the bounding-box diagonal of each other — gates whether Clean Formula mode attempts a circle fit. Guards against near-degenerate strokes (a tap, hand tremor) via `MIN_BOUNDING_BOX_SIZE`; since `ts` is always evenly spaced regardless of physical stroke size, this guard is a UX nicety, not a numerical-stability requirement (unlike the guard below).
- `preprocessStroke()` — the older y=f(x) pipeline: resample -> smooth -> `toFunctionOfX()` (bins onto a uniform x-grid, averaging y within each bin; flags `isFunctionOfX: false` when a bin's y-values spread too far apart — a direct measure of failing the vertical line test, not a heuristic based on stroke direction reversals, which under-detects shapes like circles that only reverse x-direction twice). Guards against near-zero x-domain width via `MIN_DOMAIN_WIDTH`: dividing by a near-zero segment width blows up spline/regression coefficients into meaningless huge numbers — this one *is* a numerical-stability requirement, unlike the parametric path's guard.

**Spline mode (`src/fitting/spline/`)** always succeeds and always traces the drawing exactly, any shape:
- `naturalCubicSpline.ts` hand-rolls a natural cubic spline (Thomas algorithm), producing explicit per-segment coefficients `a + b(x-x0) + c(x-x0)^2 + d(x-x0)^3` — needed for both rendering and displaying the literal piecewise formula. Fits directly on the full ~150-point preprocessing grid (no downsampling), so the rendered curve tracks the drawn stroke as closely as possible; this can produce 100+ piecewise segments, which is why `.piecewise-rows` scrolls (`App.css`) rather than being capped. Accuracy was chosen over a shorter equation — don't reintroduce knot-count downsampling without discussing the tradeoff.
- `parametricSpline.ts` fits x and y **independently** as two separate `naturalCubicSpline` fits over the shared arc-length parameter t, instead of fitting y as a function of x. This is what makes circles, closed loops, and self-intersecting shapes (figure-8s) traceable at all: x(t) and y(t) are each single-valued even when y isn't a single-valued function of x. `App.tsx` displays both as separate piecewise equations (`splineToPieces(segments, 't')`, labeled `x(t) =` / `y(t) =`).
- `canvas/CurveRenderer.ts`'s `drawParametricCurve()` samples t in `[0,1]` and draws the resulting path — naturally closes loops and crosses itself where the drawing does, unlike `drawFunctionCurve()` which graphs a function of x and cannot represent that.

**Clean Formula mode (`src/fitting/formulas/` + `src/fitting/shapes/`)** tries to find one elegant equation, in priority order:
1. **Circle** (`fitting/shapes/circle.ts`) — tried first, only when `prepareParametricStroke().isClosed` is true. Algebraic least-squares fit: `x^2+y^2+Dx+Ey+F=0` is *linear* in D,E,F (rewrite as `Dx+Ey+F=-(x^2+y^2)`), so it's a 3x3 linear solve (Cramer's rule), not nonlinear optimization. Center `(-D/2,-E/2)`, radius `sqrt((D^2+E^2)/4-F)`. Accepted only if NRMSE (fit error normalized by radius) is below `CIRCLE_FIT_THRESHOLD` (0.1, in `App.tsx`) — an ellipse or square will not pass and correctly falls through to step 2 rather than being forced into a bad circle.
2. **y=f(x) function families** (`fitting/formulas/families/*.ts`) — one fitter per family (constant/linear/quadratic/cubic/quartic via `ml-regression-polynomial`; sine/gaussian via `ml-levenberg-marquardt` with multiple initial-guess candidates since nonlinear least squares is sensitive to seeding; exponential via log-linearization + LM refinement; power/rational via closed-form log-log or 1/x linear regression, domain-gated to x>0 or x-away-from-0 respectively). Each fitter returns `null` when its preconditions aren't met rather than fitting garbage. `scoring.ts`: `score = NRMSE + 0.015 * paramCount` — the small param-count penalty only breaks near-ties toward the simpler family, never overrides a genuinely better fit. `fitCleanFormula.ts` runs every family, scores them, returns the best plus `isPoorFit` (NRMSE > 0.1). A poor fit is still shown with a warning, never blocked — this was an explicit product decision, and it's why a non-circular closed shape (square, spiral, scribble) still gets *some* answer (usually "Constant") rather than nothing.

There is currently no general ellipse/conic family — only true circles are recognized as a named shape; everything else closed-but-not-circular falls through to the y=f(x) families (and gets a "not a function of x" warning), even though Spline mode traces it fine.

**Adding a new y=f(x) function family**: implement a `FamilyFitter` (`src/fitting/formulas/types.ts`) in `families/`, register it in `ALL_FAMILIES` in `fitCleanFormula.ts`. See the KaTeX gotcha below before writing its `latex` output.

## Known gotcha: KaTeX cannot render multi-letter LaTeX commands in this build

`react-katex` bundles its own nested copy of `katex` (`node_modules/react-katex/node_modules/katex`), separate from this project's direct `katex` dependency. In the browser (via Vite), that pairing fails to tokenize **any** multi-letter LaTeX control word — `\text{}`, `\le`, `\sin`, `\begin{cases}`/`&` arrays all break, rendering as garbled red error-colored fragments (e.g. `\text` splits into `\t` + `ext`). This reproduces only in the browser; identical input to `katex.renderToString()` in Node (either the top-level or the nested katex version) works fine — it's a bundler/runtime interaction, not a content bug, and wasn't fixed at the root cause.

**Consequence: do not use backslash LaTeX commands anywhere in this codebase.** Existing workarounds to follow as precedent:
- Piecewise spline rows are rendered one-by-one via `InlineMath` per segment instead of a single `\begin{cases}...\end{cases}` block (`display/toLatex/splineToLatex.ts`, `display/EquationDisplay.tsx`).
- Condition text ("for a ≤ x < b") is plain Unicode text (`≤`), not LaTeX at all.
- The sine family writes literal `sin(...)` (plain letters, no backslash) instead of `\sin(...)`.
- Division and other structure use plain characters (`a/x + b`) rather than `\frac{}{}`.

If you need a new mathematical notation, verify it renders correctly with a real browser test (Playwright) before assuming it works — Node-only or unit-test verification will not catch this class of bug.

## Other non-obvious constraints

- `DrawingCanvas.tsx` gates its pointer-move/up handlers on a **ref** (`isDrawingRef`), not React state. It used to be state; a fast pointerdown→pointerup with no intermediate move (a tap, or a fast programmatic click) could fire pointerup against a stale closure where the state update from pointerdown hadn't committed yet, silently dropping the stroke. Don't change this back to `useState` without re-testing that exact case.
- The "Clear" button is absolutely positioned over the top-right corner of the canvas. A stroke that ends there will have its pointerup/click land on the button instead of the canvas.
- Default math viewport is a fixed `[-10, 10]` x/y range (`canvas/viewport.ts`, `DEFAULT_MATH_RANGE`) — there is no pan/zoom.
- `drawFunctionCurve()` (used by Clean Formula mode's y=f(x) fallback) takes an `xDomain` option and **must** be called with it clipped to the stroke's own x-range. Without it, a fitted function gets evaluated across the entire `[-10,10]` viewport regardless of how little of that range was actually drawn in — a cubic shoots off-screen, a periodic sine repeats into phantom extra oscillations. `drawParametricCurve()` (Spline mode, circle fit) doesn't have this problem since it's bounded to `t∈[0,1]` by construction.
- Single curve only: `App.tsx` holds one `stroke: Point[]` state, and `DrawingCanvas.tsx` resets its point buffer on every new pointerdown. Starting a new stroke replaces the previous one — there's no list of saved strokes/curves, no Desmos-style expression list. Multi-curve support would need an array of strokes/fits plus rendering all of them, not just the latest.
