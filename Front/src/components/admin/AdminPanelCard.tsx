import type { PropsWithChildren } from 'react';

import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { classNames } from '@/lib/classNames';

type AdminPanelCardProps = PropsWithChildren<{
  className?: string;
  panelClassName?: string;
  shellPaddingClassName?: string;
}>;

export function AdminPanelCard({
  children,
  className,
  panelClassName,
  shellPaddingClassName = 'p-1 sm:p-1.5',
}: AdminPanelCardProps) {
  return (
    <SurfaceCard
      className={classNames('admin-panel-card-shell min-h-0 overflow-hidden bg-[#f4f8ff] shadow-none', className)}
      paddingClassName={shellPaddingClassName}
    >
      <div
        className={classNames(
          'admin-panel-card-body flex h-full min-h-0 flex-col overflow-hidden rounded-[1.45rem] bg-white',
          panelClassName,
        )}
      >
        {children}
      </div>
    </SurfaceCard>
  );
}
