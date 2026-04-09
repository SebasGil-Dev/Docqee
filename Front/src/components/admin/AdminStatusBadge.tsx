import type {
  CredentialDeliveryStatus,
  PersonOperationalStatus,
  UniversityStatus,
} from '@/content/types';
import { classNames } from '@/lib/classNames';

type AdminStatusBadgeProps =
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
    };

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

  return (
    <span
      className={classNames(
        'admin-status-badge inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
        tone,
      )}
    >
      {label}
    </span>
  );
}
