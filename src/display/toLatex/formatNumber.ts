/** Rounds to `precision` decimals and strips trailing zeros/dot for display. */
export function formatNumber(n: number, precision = 3): string {
  if (!Number.isFinite(n)) return '0';
  const rounded = Number(n.toFixed(precision));
  if (Object.is(rounded, -0)) return '0';
  return rounded.toString();
}
