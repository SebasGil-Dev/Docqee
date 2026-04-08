import type { ReactNode } from 'react';

import { SectionHeading } from '@/components/ui/SectionHeading';
import { classNames } from '@/lib/classNames';

type AdminPageHeaderProps = {
  action?: ReactNode;
  actionClassName?: string;
  className?: string;
  description: string;
  descriptionClassName?: string;
  eyebrow?: string;
  headingAlign?: 'center' | 'left';
  titleClassName?: string;
  title: string;
};

export function AdminPageHeader({
  action,
  actionClassName,
  className,
  description,
  descriptionClassName,
  eyebrow,
  headingAlign = 'left',
  titleClassName,
  title,
}: AdminPageHeaderProps) {
  return (
    <div
      className={classNames(
        'admin-page-header flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between',
        className,
      )}
    >
      <SectionHeading
        align={headingAlign}
        {...(eyebrow ? { eyebrow } : {})}
        description={description}
        {...(descriptionClassName ? { descriptionClassName } : {})}
        title={title}
        {...(titleClassName ? { titleClassName } : {})}
      />
      {action ? <div className={classNames('shrink-0', actionClassName)}>{action}</div> : null}
    </div>
  );
}
