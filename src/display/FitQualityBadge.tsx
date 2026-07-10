interface FitQualityBadgeProps {
  familyName: string;
  nrmse: number;
}

export function FitQualityBadge({ familyName, nrmse }: FitQualityBadgeProps) {
  const accuracyPct = Math.max(0, 1 - nrmse) * 100;
  return (
    <div className="fit-quality-badge">
      <span className="fit-family-name">{familyName}</span>
      <span className="fit-accuracy">{accuracyPct.toFixed(1)}% fit</span>
    </div>
  );
}
