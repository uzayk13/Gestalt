# Gestalt

The reverse of Desmos: draw a curve freehand, and Gestalt gives you its function back.

## What it does

Draw on the canvas with your mouse or finger. Gestalt fits a curve to your stroke and shows the math behind it, in one of two modes:

- **Spline mode** — always traces your drawing exactly, no matter the shape. Circles, closed loops, spirals, self-intersecting figure-8s all work, since the curve is fit as `x(t)` and `y(t)` — two independent functions of an arc-length parameter — rather than forced into `y = f(x)`.
- **Clean Formula mode** — tries to recognize your drawing as one elegant equation from a curated library: lines, polynomials up to quartic, sine waves, exponentials, power/rational curves, gaussians, and circles. Shows a fit-quality percentage, and honestly flags when nothing fits well rather than forcing a bad match.

## Running it

```bash
npm install
npm run dev
```

Then open the printed `localhost` URL and start drawing.

## Other commands

```bash
npm run build   # typecheck + production build
npm run lint    # oxlint
npm test        # run the test suite once
```

## Stack

React + TypeScript + Vite, [KaTeX](https://katex.org/) for equation rendering, [ml-regression-polynomial](https://github.com/mljs/regression-polynomial) and [ml-levenberg-marquardt](https://github.com/mljs/levenberg-marquardt) for curve fitting. No backend — everything runs client-side.

See `CLAUDE.md` for architecture details and known gotchas if you're working on the code.
