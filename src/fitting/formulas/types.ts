export interface FamilyFitResult {
  familyName: string;
  latex: string;
  paramCount: number;
  predict: (x: number) => number;
}

export type FamilyFitter = (xs: number[], ys: number[]) => FamilyFitResult | null;
