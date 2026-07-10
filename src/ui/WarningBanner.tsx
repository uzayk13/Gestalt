import type { ReactNode } from 'react';

interface WarningBannerProps {
  children: ReactNode;
}

export function WarningBanner({ children }: WarningBannerProps) {
  return <p className="warning-banner">{children}</p>;
}
