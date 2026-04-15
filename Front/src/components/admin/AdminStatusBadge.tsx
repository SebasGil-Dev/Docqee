import type {
  CredentialDeliveryStatus,
  PersonOperationalStatus,
  UniversityStatus,
} from '@/content/types';
import { classNames } from '@/lib/classNames';

type AdminStatusBadgeSize = 'compact-mobile' | 'default' | 'micro-mobile';

type AdminStatusBadgeBaseProps = {
  size?: AdminStatusBadgeSize;
};

type AdminStatusBadgeProps = AdminStatusBadgeBaseProps &
  (
    | {
        entity: 'credential';
        status: CredentialDeliveryStatus;
      }
    | {
        entity: 'student';
        status: PersonOperationalStatus | 'pending';
      }
    | {
        entity: 'teacher';
        status: PersonOperationalStatus;
      }
    | {
        entity: 'university';
        status: UniversityStatus;
      }
  );

const badgeStyles = {
  credential: {
    generated: 'bg-sky-50 text-sky-700 ring-sky-200',
    sent: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  person: {
    active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    inactive: 'bg-slate-100 text-slate-700 ring-slate-200',
    pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  },
  university: {
    active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    inactive: 'bg-slate-100 text-slate-700 ring-slate-200',
    pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  },
} as const;

const badgeLabels = {
  credential: {
    generated: 'Generada',
    sent: 'Enviada',
  },
  person: {
    active: 'Activo',
    inactive: 'Inactivo',
    pending: 'Pendiente',
  },
  university: {
    active: 'Activa',
    inactive: 'Inactiva',
    pending: 'Pendiente',
  },
} as const;

export function AdminStatusBadge(props: AdminStatusBadgeProps) {
  const label =
    props.entity === 'credential'
      ? badgeLabels.credential[props.status]
      : props.entity === 'university'
        ? badgeLabels.university[props.status]
        : badgeLabels.person[props.status];

  const tone =
    props.entity === 'credential'
      ? badgeStyles.credential[props.status]
      : props.entity === 'university'
        ? badgeStyles.university[props.status]
        : badgeStyles.person[props.status];
  const isPendingMicroStatus =
    props.size === 'micro-mobile' && props.status === 'pending';
  const sizeClassName =
    props.size === 'micro-mobile'
      ? isPendingMicroStatus
        ? 'px-1 py-[0.12rem] text-[0.5rem] leading-none tracking-[-0.01em] sm:px-3 sm:py-1 sm:text-xs sm:leading-normal sm:tracking-normal'
        : 'px-1.5 py-[0.18rem] text-[0.58rem] leading-none sm:px-3 sm:py-1 sm:text-xs sm:leading-normal'
      : props.size === 'compact-mobile'
        ? 'px-2.5 py-0.5 text-[0.7rem] sm:px-3 sm:py-1 sm:text-xs'
        : 'px-3 py-1 text-xs';

  return (
    <span
      className={classNames(
        'admin-status-badge inline-flex items-center rounded-full font-semibold ring-1 ring-inset',
        sizeClassName,
        tone,
      )}
    >
      {label}
    </span>
  );
}
