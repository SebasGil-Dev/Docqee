import type { PropsWithChildren } from 'react';

import { classNames } from '@/lib/classNames';

type SurfaceCardProps = PropsWithChildren<{
  className?: string;
  interactive?: boolean;
  paddingClassName?: string;
}>;

export function SurfaceCard({
  children,
  className,
  interactive = false,
  paddingClassName = 'p-7',
}: SurfaceCardProps) {
  return (
    <div
      className={classNames(
        'surface-card rounded-[1.75rem] bg-surface-card shadow-ambient',
        paddingClassName,
        interactive && 'transition-transform duration-300 hover:-translate-y-1 hover:shadow-float',
        className,
      )}
    >
      {children}
    </div>
  );
}
