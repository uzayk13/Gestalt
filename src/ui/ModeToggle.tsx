import type { Mode } from '../types';

interface ModeToggleProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="mode-toggle" role="radiogroup" aria-label="Fit mode">
      <button
        type="button"
        className={mode === 'spline' ? 'active' : ''}
        aria-pressed={mode === 'spline'}
        onClick={() => onChange('spline')}
      >
        Spline
      </button>
      <button
        type="button"
        className={mode === 'cleanFormula' ? 'active' : ''}
        aria-pressed={mode === 'cleanFormula'}
        onClick={() => onChange('cleanFormula')}
      >
        Clean Formula
      </button>
    </div>
  );
}
