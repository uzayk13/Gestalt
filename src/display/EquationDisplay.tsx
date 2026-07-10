import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import type { PiecewiseRow } from './toLatex/splineToLatex';

interface EquationDisplayProps {
  latex: string;
}

export function EquationDisplay({ latex }: EquationDisplayProps) {
  if (!latex) return null;
  return (
    <div className="equation-display">
      <BlockMath math={latex} errorColor="#e0446b" />
    </div>
  );
}

interface PiecewiseEquationDisplayProps {
  pieces: PiecewiseRow[];
  label?: string;
}

export function PiecewiseEquationDisplay({ pieces, label = 'f(x) =' }: PiecewiseEquationDisplayProps) {
  if (pieces.length === 0) return null;
  return (
    <div className="piecewise-display">
      <div className="piecewise-label">
        <InlineMath math={label} errorColor="#e0446b" />
      </div>
      <div className="piecewise-rows">
        {pieces.map((piece, i) => (
          <div className="piecewise-row" key={i}>
            <InlineMath math={piece.expressionLatex} errorColor="#e0446b" />
            <span className="piecewise-condition">{piece.conditionText}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
