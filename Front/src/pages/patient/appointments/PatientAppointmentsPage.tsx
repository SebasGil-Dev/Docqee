import {
  Ban,
  BriefcaseMedical,
  CalendarCheck2,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  GraduationCap,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  Stethoscope,
  UserRound,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminTablePagination } from '@/components/admin/AdminTablePagination';
import { PatientRatingModal } from '@/components/patient/PatientRatingModal';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { patientContent } from '@/content/patientContent';
import type {
  PatientAppointment,
  PatientAppointmentStatus,
} from '@/content/types';
import { useAutoDismissSystemMessage } from '@/hooks/useAutoDismissSystemMessage';
import { useStableRowsPerPage } from '@/hooks/useStableRowsPerPage';
import { classNames } from '@/lib/classNames';
import { usePatientModuleStore } from '@/lib/patientModuleStore';

type AppointmentStatusFilter = PatientAppointmentStatus | 'all';
type AppointmentSortOrder = 'arrival' | 'proximity';

const appointmentStatusOptions: {
  label: string;
  value: AppointmentStatusFilter;
}[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Propuesta', value: 'PROPUESTA' },
  { label: 'Aceptada', value: 'ACEPTADA' },
  { label: 'Rechazada', value: 'RECHAZADA' },
  { label: 'Cancelada', value: 'CANCELADA' },
  { label: 'Finalizada', value: 'FINALIZADA' },
];

const DEFAULT_ROWS_PER_PAGE = 6;
const MIN_ROWS_PER_PAGE = 1;
const TABLE_HEADER_HEIGHT_PX = 38;
const TABLE_ROW_HEIGHT_FALLBACK_PX = 84;
const TABLE_HEIGHT_PADDING_PX = 0;

function getStatusLabel(status: PatientAppointmentStatus) {
  switch (status) {
    case 'ACEPTADA':
      return 'Aceptada';
    case 'RECHAZADA':
      return 'Rechazada';
    case 'CANCELADA':
      return 'Cancelada';
    case 'FINALIZADA':
      return 'Finalizada';
    default:
      return 'Propuesta';
  }
}

function getStatusBadgeClasses(status: PatientAppointmentStatus) {
  switch (status) {
    case 'ACEPTADA':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'RECHAZADA':
      return 'bg-rose-50 text-rose-700 ring-rose-200';
    case 'CANCELADA':
      return 'bg-slate-100 text-slate-700 ring-slate-200';
    case 'FINALIZADA':
      return 'bg-sky-50 text-sky-700 ring-sky-200';
    default:
      return 'bg-amber-50 text-amber-700 ring-amber-200';
  }
}

function formatDateTimeRange(startAt: string, endAt: string) {
  const formatter = new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
  const startDate = new Date(startAt);
  const endDate = new Date(endAt);
  const timeFormatter = new Intl.DateTimeFormat('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${formatter.format(startDate)} a ${timeFormatter.format(endDate)}`;
}

function formatFullDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatFullDateTime(value: string | null) {
  if (!value) return 'Sin registrar';

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function hasAppointmentEnded(
  appointment: PatientAppointment,
  currentTimestamp: number,
) {
  return new Date(appointment.endAt).getTime() <= currentTimestamp;
}

function shouldAutoRejectOverdueAppointment(
  appointment: PatientAppointment,
  currentTimestamp: number,
) {
  return (
    appointment.status === 'PROPUESTA' &&
    appointment.isRescheduleProposal !== true &&
    hasAppointmentEnded(appointment, currentTimestamp)
  );
}

function getAppointmentDisplayStatus(
  appointment: PatientAppointment,
  currentTimestamp: number,
): PatientAppointmentStatus {
  if (shouldAutoRejectOverdueAppointment(appointment, currentTimestamp)) {
    return 'RECHAZADA';
  }

  if (
    appointment.status === 'ACEPTADA' &&
    hasAppointmentEnded(appointment, currentTimestamp)
  ) {
    return 'FINALIZADA';
  }

  return appointment.status;
}

function getAppointmentUpdateMessage(
  appointment: PatientAppointment,
  status: PatientAppointmentStatus,
) {
  if (appointment.isRescheduleProposal && status === 'ACEPTADA') {
    return 'La reprogramacion fue aceptada y la cita quedo actualizada.';
  }

  if (appointment.isRescheduleProposal && status === 'RECHAZADA') {
    return 'La reprogramacion fue rechazada y la cita conserva su horario anterior.';
  }

  switch (status) {
    case 'ACEPTADA':
      return 'La cita fue aceptada correctamente.';
    case 'RECHAZADA':
      return 'La cita fue rechazada correctamente.';
    case 'CANCELADA':
      return 'La cita fue cancelada correctamente.';
    default:
      return 'La cita fue actualizada correctamente.';
  }
}

type RatingTarget = { appointmentId: string; studentName: string };

function PatientAppointmentsDialogFrame({
  children,
  description,
  onClose,
  title,
}: {
  children: ReactNode;
  description?: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto px-2 py-2 sm:px-4 sm:py-4">
      <button
        aria-label="Cerrar ventana"
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px]"
        type="button"
        onClick={onClose}
      />
      <div
        aria-describedby={
          description ? 'patient-appointments-dialog-description' : undefined
        }
        aria-labelledby="patient-appointments-dialog-title"
        aria-modal="true"
        className="student-appointment-dialog relative mx-auto w-full max-w-3xl overflow-visible rounded-[1.35rem] border border-slate-200/80 bg-white shadow-[0_34px_90px_-36px_rgba(15,23,42,0.55)] lg:max-w-5xl xl:max-w-6xl"
        role="dialog"
      >
        <div className="absolute right-2.5 top-2.5 z-30">
          <button
            aria-label="Cerrar ventana"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-ink-muted transition duration-200 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
            type="button"
            onClick={onClose}
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4">
          <div className="space-y-1">
            <h2
              className="font-headline text-[1.05rem] font-extrabold tracking-tight text-ink sm:text-[1.18rem]"
              id="patient-appointments-dialog-title"
            >
              {title}
            </h2>
            {description ? (
              <p
                className="pr-8 text-[0.72rem] leading-5 text-ink-muted sm:text-[0.76rem]"
                id="patient-appointments-dialog-description"
              >
                {description}
              </p>
            ) : null}
          </div>
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

function ReadOnlyAppointmentField({
  icon: Icon,
  id,
  label,
  value,
}: {
  icon: LucideIcon;
  id: string;
  label: string;
  value: string;
}) {
  return (
    <div className="admin-text-field student-appointment-dialog-field space-y-1.5">
      <label
        className="admin-text-field__label block text-sm font-semibold text-ink"
        htmlFor={id}
      >
        {label}
      </label>
      <div className="relative">
        <Icon
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ghost"
        />
        <input
          readOnly
          className="admin-text-field__input w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-ink transition duration-300 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
          id={id}
          name={id}
          type="text"
          value={value}
        />
      </div>
    </div>
  );
}

type AppointmentDetailModalProps = {
  appointment: PatientAppointment;
  displayStatus: PatientAppointmentStatus;
  onClose: () => void;
};

function AppointmentDetailModal({
  appointment,
  displayStatus,
  onClose,
}: AppointmentDetailModalProps) {
  const statusLabel =
    appointment.isRescheduleProposal && displayStatus === 'PROPUESTA'
      ? 'Reprogramacion propuesta'
      : getStatusLabel(displayStatus);
  const ratingValue =
    appointment.myRating !== null ? `${appointment.myRating}/5` : 'Sin valorar';

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <PatientAppointmentsDialogFrame
      description="Consulta los detalles completos de la cita."
      title="Ver cita"
      onClose={onClose}
    >
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={classNames(
              'inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ring-1 ring-inset',
              getStatusBadgeClasses(displayStatus),
            )}
          >
            {statusLabel}
          </span>
          {appointment.isRescheduleProposal ? (
            <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[0.68rem] font-semibold text-primary">
              Reprogramacion
            </span>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <ReadOnlyAppointmentField
            icon={UserRound}
            id={`patient-appointment-student-${appointment.id}`}
            label="Estudiante"
            value={appointment.studentName}
          />
          <ReadOnlyAppointmentField
            icon={GraduationCap}
            id={`patient-appointment-university-${appointment.id}`}
            label="Universidad"
            value={appointment.universityName}
          />
        </div>

        <div className="grid gap-2 lg:grid-cols-2">
          <ReadOnlyAppointmentField
            icon={Stethoscope}
            id={`patient-appointment-type-${appointment.id}`}
            label="Tipo de cita"
            value={appointment.appointmentType}
          />
          <ReadOnlyAppointmentField
            icon={GraduationCap}
            id={`patient-appointment-teacher-${appointment.id}`}
            label="Docente supervisor"
            value={appointment.teacherName}
          />
        </div>

        <div className="student-appointment-datetime-row grid w-full grid-cols-[minmax(0,1.18fr)_minmax(0,0.91fr)_minmax(0,0.91fr)] items-start gap-1 sm:grid-cols-3 sm:gap-2">
          <ReadOnlyAppointmentField
            icon={CalendarCheck2}
            id={`patient-appointment-date-${appointment.id}`}
            label="Fecha de la cita"
            value={formatFullDate(appointment.startAt)}
          />
          <ReadOnlyAppointmentField
            icon={Clock3}
            id={`patient-appointment-start-time-${appointment.id}`}
            label="Hora de inicio"
            value={formatTime(appointment.startAt)}
          />
          <ReadOnlyAppointmentField
            icon={Clock3}
            id={`patient-appointment-end-time-${appointment.id}`}
            label="Hora de finalizacion"
            value={formatTime(appointment.endAt)}
          />
        </div>

        <div className="grid gap-2 lg:grid-cols-2">
          <ReadOnlyAppointmentField
            icon={MapPin}
            id={`patient-appointment-site-${appointment.id}`}
            label="Sede"
            value={`${appointment.siteName} - ${appointment.city}`}
          />
          <ReadOnlyAppointmentField
            icon={MapPin}
            id={`patient-appointment-address-${appointment.id}`}
            label="Direccion de sede"
            value={appointment.siteAddress || 'Sin direccion registrada'}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <ReadOnlyAppointmentField
            icon={BriefcaseMedical}
            id={`patient-appointment-code-${appointment.id}`}
            label="Codigo de cita"
            value={appointment.id}
          />
          <ReadOnlyAppointmentField
            icon={CalendarCheck2}
            id={`patient-appointment-created-${appointment.id}`}
            label="Fecha de solicitud"
            value={formatFullDateTime(appointment.createdAt)}
          />
          <ReadOnlyAppointmentField
            icon={Star}
            id={`patient-appointment-rating-${appointment.id}`}
            label="Mi valoracion"
            value={ratingValue}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <ReadOnlyAppointmentField
            icon={CheckCircle2}
            id={`patient-appointment-status-${appointment.id}`}
            label="Estado"
            value={statusLabel}
          />
          <ReadOnlyAppointmentField
            icon={CalendarCheck2}
            id={`patient-appointment-responded-${appointment.id}`}
            label="Fecha de respuesta"
            value={formatFullDateTime(appointment.respondedAt)}
          />
        </div>

        <div className="space-y-1">
          <label
            className="block text-[0.72rem] font-semibold text-ink"
            htmlFor={`patient-appointment-additional-info-${appointment.id}`}
          >
            Informacion adicional
          </label>
          <textarea
            readOnly
            className="student-appointment-dialog-notes min-h-[3rem] w-full rounded-[0.85rem] border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[0.72rem] text-ink placeholder:text-ghost/80 transition duration-300 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
            id={`patient-appointment-additional-info-${appointment.id}`}
            value={appointment.additionalInfo || 'Sin informacion adicional'}
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            className="inline-flex items-center justify-center rounded-full bg-slate-100 px-3 py-1.5 text-[0.76rem] font-semibold text-ink-muted transition duration-200 hover:bg-slate-200"
            type="button"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </PatientAppointmentsDialogFrame>
  );
}

export function PatientAppointmentsPage() {
  const {
    appointments,
    errorMessage,
    isLoading,
    submitAppointmentReview,
    updateAppointmentStatus,
  } = usePatientModuleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<AppointmentStatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<AppointmentSortOrder>('arrival');
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<RatingTarget | null>(null);
  const [detailAppointmentId, setDetailAppointmentId] = useState<string | null>(
    null,
  );
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
  const [currentPage, setCurrentPage] = useState(1);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const tableViewportRef = useRef<HTMLDivElement | null>(null);
  const tableHeaderRef = useRef<HTMLTableSectionElement | null>(null);
  const tableBodyRef = useRef<HTMLTableSectionElement | null>(null);
  const rowsPerPage = useStableRowsPerPage({
    viewportRef: tableViewportRef,
    headerMeasurementRef: tableHeaderRef,
    rowMeasurementRef: tableBodyRef,
    defaultRowsPerPage: DEFAULT_ROWS_PER_PAGE,
    minRowsPerPage: MIN_ROWS_PER_PAGE,
    headerHeightPx: TABLE_HEADER_HEIGHT_PX,
    rowHeightPx: TABLE_ROW_HEIGHT_FALLBACK_PX,
    heightPaddingPx: TABLE_HEIGHT_PADDING_PX,
  });
  const autoRejectedAppointmentIdsRef = useRef<Set<string>>(new Set());
  const normalizedSearch = searchTerm.trim().toLowerCase();

  useAutoDismissSystemMessage(successMessage, () => {
    setSuccessMessage(null);
  });

  const proposalCount = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          getAppointmentDisplayStatus(appointment, currentTimestamp) ===
          'PROPUESTA',
      ).length,
    [appointments, currentTimestamp],
  );
  const acceptedCount = useMemo(
    () =>
      appointments.filter((appointment) => appointment.status === 'ACEPTADA')
        .length,
    [appointments],
  );
  const completedCount = useMemo(
    () =>
      appointments.filter((appointment) => appointment.status === 'FINALIZADA')
        .length,
    [appointments],
  );
  const filteredAppointments = useMemo(() => {
    const filtered = appointments.filter((appointment) => {
      const matchesSearch =
        appointment.studentName.toLowerCase().includes(normalizedSearch) ||
        appointment.universityName.toLowerCase().includes(normalizedSearch) ||
        appointment.siteName.toLowerCase().includes(normalizedSearch) ||
        (appointment.siteAddress?.toLowerCase().includes(normalizedSearch) ??
          false) ||
        appointment.appointmentType.toLowerCase().includes(normalizedSearch) ||
        appointment.teacherName.toLowerCase().includes(normalizedSearch);

      return (
        matchesSearch &&
        (statusFilter === 'all' ||
          getAppointmentDisplayStatus(appointment, currentTimestamp) ===
            statusFilter)
      );
    });

    if (sortOrder === 'proximity') {
      const now = Date.now();
      return [...filtered].sort((a, b) => {
        const aTime = new Date(a.startAt).getTime();
        const bTime = new Date(b.startAt).getTime();
        const aFuture = aTime >= now;
        const bFuture = bTime >= now;
        if (aFuture && bFuture) return aTime - bTime;
        if (!aFuture && !bFuture) return bTime - aTime;
        return aFuture ? -1 : 1;
      });
    }

    return [...filtered].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [
    appointments,
    currentTimestamp,
    normalizedSearch,
    sortOrder,
    statusFilter,
  ]);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredAppointments.length / rowsPerPage),
  );
  const clampedCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (clampedCurrentPage - 1) * rowsPerPage;
  const paginatedAppointments = useMemo(
    () =>
      filteredAppointments.slice(pageStartIndex, pageStartIndex + rowsPerPage),
    [filteredAppointments, pageStartIndex, rowsPerPage],
  );
  const pageStartLabel =
    filteredAppointments.length > 0 ? pageStartIndex + 1 : 0;
  const pageEndLabel = Math.min(
    pageStartIndex + paginatedAppointments.length,
    filteredAppointments.length,
  );
  const detailAppointment = useMemo(
    () =>
      detailAppointmentId
        ? appointments.find(
            (appointment) => appointment.id === detailAppointmentId,
          ) ?? null
        : null,
    [appointments, detailAppointmentId],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedSearch, sortOrder, statusFilter]);

  useEffect(() => {
    setCurrentPage((currentValue) => Math.min(currentValue, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (detailAppointmentId && !detailAppointment) {
      setDetailAppointmentId(null);
    }
  }, [detailAppointment, detailAppointmentId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    appointments
      .filter(
        (appointment) =>
          shouldAutoRejectOverdueAppointment(appointment, currentTimestamp) &&
          !autoRejectedAppointmentIdsRef.current.has(appointment.id),
      )
      .forEach((appointment) => {
        autoRejectedAppointmentIdsRef.current.add(appointment.id);
        void updateAppointmentStatus(appointment.id, 'RECHAZADA');
      });
  }, [appointments, currentTimestamp, updateAppointmentStatus]);

  useEffect(() => {
    if (!isStatusMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!statusMenuRef.current?.contains(event.target as Node)) {
        setIsStatusMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsStatusMenuOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isStatusMenuOpen]);

  const handleAppointmentStatusChange = (
    appointment: PatientAppointment,
    status: PatientAppointmentStatus,
  ) => {
    void (async () => {
      const optimisticMessage = getAppointmentUpdateMessage(
        appointment,
        status,
      );

      setSuccessMessage(optimisticMessage);

      const updated = await updateAppointmentStatus(appointment.id, status);

      if (!updated) {
        setSuccessMessage(null);
      }
    })();
  };

  const handleSubmitRating = (
    appointmentId: string,
    rating: number,
    comment?: string,
  ) => {
    void (async () => {
      setIsSubmittingRating(true);
      const success = await submitAppointmentReview(
        appointmentId,
        rating,
        comment,
      );
      setIsSubmittingRating(false);
      if (success) setRatingTarget(null);
    })();
  };

  return (
    <div className="student-page-compact flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden">
      <Seo
        description={patientContent.appointmentsPage.meta.description}
        noIndex
        title={patientContent.appointmentsPage.meta.title}
      />
      <AdminPageHeader
        className="gap-3"
        description={patientContent.appointmentsPage.description}
        descriptionClassName="text-sm leading-6 sm:text-base"
        headingAlign="center"
        title={patientContent.appointmentsPage.title}
        titleClassName="text-[2rem] sm:text-[2.35rem]"
      />

      {(successMessage || errorMessage) && (
        <div className="grid shrink-0 gap-2">
          {successMessage && (
            <div
              className="rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700"
              role="status"
            >
              <span className="font-semibold">
                {patientContent.appointmentsPage.successNoticePrefix}
              </span>{' '}
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div
              className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700"
              role="alert"
            >
              {errorMessage}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <SurfaceCard
          className="min-w-0 overflow-hidden bg-brand-gradient text-white"
          paddingClassName="p-0"
        >
          <div className="flex min-w-0 items-center gap-1.5 px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-1.5">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[0.7rem] bg-white/12 text-white sm:h-7 sm:w-7 sm:rounded-[0.8rem]">
              <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
            <span className="font-headline text-[0.98rem] font-extrabold tracking-tight text-white sm:text-[1.08rem]">
              {proposalCount}
            </span>
            <p className="min-w-0 text-[0.62rem] font-semibold leading-3 text-white/90 sm:text-[0.74rem] sm:leading-none">
              Propuestas
            </p>
          </div>
        </SurfaceCard>
        <SurfaceCard
          className="border border-slate-200/80 bg-white shadow-none"
          paddingClassName="p-0"
        >
          <div className="flex min-w-0 items-center gap-1.5 px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-1.5">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[0.7rem] bg-emerald-50 text-emerald-700 sm:h-7 sm:w-7 sm:rounded-[0.8rem]">
              <CalendarCheck2 aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
            <span className="font-headline text-[0.98rem] font-extrabold tracking-tight text-ink sm:text-[1.08rem]">
              {acceptedCount}
            </span>
            <p className="min-w-0 text-[0.62rem] font-semibold leading-3 text-ink-muted sm:text-[0.74rem] sm:leading-none">
              Aceptadas
            </p>
          </div>
        </SurfaceCard>
        <SurfaceCard
          className="border border-slate-200/80 bg-white shadow-none"
          paddingClassName="p-0"
        >
          <div className="flex min-w-0 items-center gap-1.5 px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-1.5">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[0.7rem] bg-sky-50 text-sky-700 sm:h-7 sm:w-7 sm:rounded-[0.8rem]">
              <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
            <span className="font-headline text-[0.98rem] font-extrabold tracking-tight text-ink sm:text-[1.08rem]">
              {completedCount}
            </span>
            <p className="min-w-0 text-[0.62rem] font-semibold leading-3 text-ink-muted sm:text-[0.74rem] sm:leading-none">
              Finalizadas
            </p>
          </div>
        </SurfaceCard>
      </div>

      <AdminPanelCard
        className="min-h-0 w-full flex-1"
        panelClassName="bg-[#f4f8ff]"
        shellPaddingClassName="p-0.5 sm:p-1"
      >
        <div className="shrink-0 border-b border-slate-200/80 px-3 py-2.5 sm:px-4 sm:py-2.5">
          <div className="flex items-center gap-2 sm:justify-between sm:gap-2.5">
            <label
              className="relative min-w-0 flex-1 sm:max-w-[32rem] xl:max-w-[36rem]"
              htmlFor="patient-appointment-search"
            >
              <span className="sr-only">
                {patientContent.appointmentsPage.searchLabel}
              </span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ghost sm:left-3.5"
              />
              <input
                className="h-9 w-full rounded-full border border-slate-200/90 bg-white/98 py-0 pl-9 pr-3 text-[0.78rem] text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 placeholder:text-ghost/80 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-10 sm:pl-10 sm:pr-3.5 sm:text-[0.82rem]"
                id="patient-appointment-search"
                placeholder={patientContent.appointmentsPage.searchPlaceholder}
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
            <div className="relative shrink-0" ref={statusMenuRef}>
              <button
                aria-controls="patient-appointment-status-menu"
                aria-expanded={isStatusMenuOpen}
                aria-haspopup="menu"
                aria-label={
                  statusFilter === 'all'
                    ? 'Filtrar citas por estado'
                    : `Filtrar citas por estado. Actual: ${
                        appointmentStatusOptions.find(
                          (option) => option.value === statusFilter,
                        )?.label
                      }`
                }
                className={classNames(
                  'relative inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white/98 text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-10 sm:w-10',
                  statusFilter !== 'all' || sortOrder !== 'arrival'
                    ? 'border-primary/25 bg-primary/[0.08] text-primary hover:bg-primary/[0.12]'
                    : 'border-slate-200/90 hover:border-primary/30 hover:bg-white',
                )}
                type="button"
                onClick={() =>
                  setIsStatusMenuOpen((currentValue) => !currentValue)
                }
              >
                <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
                {statusFilter !== 'all' || sortOrder !== 'arrival' ? (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
                ) : null}
              </button>
              {isStatusMenuOpen ? (
                <div
                  className="absolute right-0 top-[calc(100%+0.6rem)] z-20 w-[14rem] overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-white/95 p-2 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] backdrop-blur"
                  id="patient-appointment-status-menu"
                  role="menu"
                >
                  <div className="px-2.5 pb-2 pt-1">
                    <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-primary/75">
                      Filtrar por estado
                    </p>
                  </div>
                  <div className="space-y-1">
                    {appointmentStatusOptions.map((option) => {
                      const isSelected = statusFilter === option.value;

                      return (
                        <button
                          key={option.value}
                          aria-checked={isSelected}
                          className={classNames(
                            'flex w-full items-center justify-between rounded-[1rem] px-3 py-2.5 text-left text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                            isSelected
                              ? 'bg-primary text-white shadow-[0_14px_30px_-20px_rgba(22,78,99,0.9)]'
                              : 'bg-slate-50/70 text-ink hover:bg-slate-100',
                          )}
                          role="menuitemradio"
                          type="button"
                          onClick={() => {
                            setStatusFilter(option.value);
                            setIsStatusMenuOpen(false);
                          }}
                        >
                          <span>{option.label}</span>
                          <span
                            className={classNames(
                              'inline-flex h-5 w-5 items-center justify-center rounded-full',
                              isSelected
                                ? 'bg-white/18 text-white'
                                : 'bg-white text-slate-300',
                            )}
                          >
                            <Check aria-hidden="true" className="h-3.5 w-3.5" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 border-t border-slate-100 px-2.5 pb-1 pt-2.5">
                    <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-primary/75">
                      Ordenar por
                    </p>
                  </div>
                  <div className="space-y-1">
                    {[
                      {
                        label: 'Orden de llegada',
                        value: 'arrival' as AppointmentSortOrder,
                      },
                      {
                        label: 'Proximas primero',
                        value: 'proximity' as AppointmentSortOrder,
                      },
                    ].map((option) => {
                      const isSelected = sortOrder === option.value;

                      return (
                        <button
                          key={option.value}
                          aria-checked={isSelected}
                          className={classNames(
                            'flex w-full items-center justify-between rounded-[1rem] px-3 py-2.5 text-left text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                            isSelected
                              ? 'bg-primary text-white shadow-[0_14px_30px_-20px_rgba(22,78,99,0.9)]'
                              : 'bg-slate-50/70 text-ink hover:bg-slate-100',
                          )}
                          role="menuitemradio"
                          type="button"
                          onClick={() => {
                            setSortOrder(option.value);
                            setIsStatusMenuOpen(false);
                          }}
                        >
                          <span>{option.label}</span>
                          <span
                            className={classNames(
                              'inline-flex h-5 w-5 items-center justify-center rounded-full',
                              isSelected
                                ? 'bg-white/18 text-white'
                                : 'bg-white text-slate-300',
                            )}
                          >
                            <Check aria-hidden="true" className="h-3.5 w-3.5" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {filteredAppointments.length > 0 ? (
          <div
            ref={tableViewportRef}
            className="min-h-0 flex-1 overflow-auto bg-white"
          >
            <table className="min-w-full table-fixed">
              <thead
                ref={tableHeaderRef}
                className="sticky top-0 z-10 bg-slate-100 text-left"
              >
                <tr className="text-[0.56rem] font-bold uppercase leading-3 tracking-[0.12em] text-ink-muted sm:text-[0.62rem] sm:leading-none sm:tracking-[0.16em]">
                  <th className="w-[39%] px-2 py-1.5 sm:w-[20%] sm:px-4 sm:py-2 md:w-[14%]">
                    Estudiante
                  </th>
                  <th className="hidden py-1.5 pl-0 pr-2 sm:py-2 sm:pr-3 md:table-cell md:w-[20%]">
                    Atencion clinica
                  </th>
                  <th className="hidden w-[27%] py-1.5 pl-0 pr-2 sm:table-cell sm:py-2 sm:pr-3 md:w-[20%]">
                    Programacion
                  </th>
                  <th className="w-[21%] py-1.5 pl-0 pr-2 text-center sm:w-[15%] sm:py-2 sm:pr-3 md:w-[12%]">
                    Estado
                  </th>
                  <th className="w-[17%] py-1.5 pl-0 pr-2 text-center sm:w-[13%] sm:py-2 sm:pr-3 md:w-[12%]">
                    Valoracion
                  </th>
                  <th className="w-[23%] px-1.5 py-1.5 text-center sm:w-[25%] sm:px-4 sm:py-2 md:w-[22%]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody
                ref={tableBodyRef}
                className="divide-y divide-slate-200/80 bg-white"
              >
                {paginatedAppointments.map((appointment) => {
                  const displayStatus = getAppointmentDisplayStatus(
                    appointment,
                    currentTimestamp,
                  );
                  const detailsButton = (
                    <button
                      aria-label={`Ver detalle de cita con ${appointment.studentName}`}
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-slate-50 px-1.5 py-1 text-[0.62rem] font-semibold text-ink-muted transition duration-200 hover:bg-slate-100 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:px-2 sm:py-1 sm:text-[0.72rem]"
                      type="button"
                      onClick={() => setDetailAppointmentId(appointment.id)}
                    >
                      <Eye
                        aria-hidden="true"
                        className="h-3 w-3 sm:h-3 sm:w-3"
                      />
                      <span className="sr-only sm:not-sr-only">Ver</span>
                    </button>
                  );

                  return (
                    <tr
                      key={appointment.id}
                      className="align-top"
                      data-testid={`patient-appointment-row-${appointment.id}`}
                    >
                      <td className="px-2 py-2 sm:px-4 sm:py-2">
                        <div className="min-w-0">
                          <p className="break-words text-[0.76rem] font-semibold leading-4 text-ink sm:text-[0.82rem] sm:leading-4">
                            {appointment.studentName}
                          </p>
                          <p className="mt-0.5 hidden break-words text-[0.66rem] leading-[0.92rem] text-ink-muted sm:block sm:text-xs sm:leading-4">
                            {appointment.universityName}
                          </p>
                          <div className="mt-1.5 space-y-0.5 text-[0.62rem] leading-[0.85rem] text-ink-muted sm:hidden">
                            <p className="flex items-start gap-1">
                              <Clock3
                                aria-hidden="true"
                                className="mt-0.5 h-2.5 w-2.5 shrink-0 text-primary"
                              />
                              <span className="min-w-0 break-words">
                                {formatDateTimeRange(
                                  appointment.startAt,
                                  appointment.endAt,
                                )}
                              </span>
                            </p>
                            <p className="flex items-start gap-1">
                              <MapPin
                                aria-hidden="true"
                                className="mt-0.5 h-2.5 w-2.5 shrink-0 text-primary"
                              />
                              <span className="min-w-0 break-words">
                                <span>
                                  {appointment.siteName} - {appointment.city}
                                </span>
                                {appointment.siteAddress ? (
                                  <span className="block text-[0.6rem] leading-[0.82rem] text-ink-muted">
                                    {appointment.siteAddress}
                                  </span>
                                ) : null}
                              </span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden py-2 pl-0 pr-2 sm:py-2 sm:pr-3 md:table-cell">
                        <div className="min-w-0 space-y-0.5 text-[0.76rem] leading-4 text-ink-muted sm:text-[0.76rem] sm:leading-4">
                          <p className="flex items-start gap-1.5 font-semibold text-ink">
                            <Stethoscope
                              aria-hidden="true"
                              className="mt-0.5 h-3 w-3 shrink-0 text-primary sm:h-3 sm:w-3"
                            />
                            <span className="min-w-0 break-words">
                              {appointment.appointmentType}
                            </span>
                          </p>
                          <p className="flex items-start gap-1.5">
                            <GraduationCap
                              aria-hidden="true"
                              className="mt-0.5 h-3 w-3 shrink-0 text-primary sm:h-3 sm:w-3"
                            />
                            <span className="min-w-0 break-words">
                              <span className="font-semibold text-ink">
                                Docente =
                              </span>{' '}
                              {appointment.teacherName}
                            </span>
                          </p>
                          {appointment.additionalInfo ? (
                            <p className="flex items-start gap-1.5">
                              <BriefcaseMedical
                                aria-hidden="true"
                                className="mt-0.5 h-3 w-3 shrink-0 text-primary sm:h-3 sm:w-3"
                              />
                              <span className="line-clamp-2 min-w-0 break-words">
                                {appointment.additionalInfo}
                              </span>
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="hidden py-2 pl-0 pr-2 sm:table-cell sm:py-2 sm:pr-3">
                        <div className="min-w-0 space-y-0.5 text-[0.68rem] leading-4 text-ink-muted sm:text-[0.76rem] sm:leading-4">
                          <p className="flex items-start gap-1.5 font-semibold text-ink">
                            <Clock3
                              aria-hidden="true"
                              className="mt-0.5 h-3 w-3 shrink-0 text-primary sm:h-3 sm:w-3"
                            />
                            <span className="min-w-0 break-words">
                              {formatDateTimeRange(
                                appointment.startAt,
                                appointment.endAt,
                              )}
                            </span>
                          </p>
                          <p className="flex items-start gap-1.5">
                            <MapPin
                              aria-hidden="true"
                              className="mt-0.5 h-3 w-3 shrink-0 text-primary sm:h-3 sm:w-3"
                            />
                            <span className="min-w-0 break-words">
                              <span>
                                {appointment.siteName} - {appointment.city}
                              </span>
                              {appointment.siteAddress ? (
                                <span className="block text-[0.68rem] leading-4 text-ink-muted">
                                  {appointment.siteAddress}
                                </span>
                              ) : null}
                            </span>
                          </p>
                        </div>
                      </td>
                      <td className="py-2 pl-0 pr-2 text-center sm:py-2 sm:pr-3">
                        <span
                          className={classNames(
                            'inline-flex rounded-full px-1.5 py-0.5 text-[0.6rem] font-semibold leading-4 ring-1 ring-inset sm:px-2.5 sm:py-0.5 sm:text-[0.68rem]',
                            getStatusBadgeClasses(displayStatus),
                          )}
                        >
                          {appointment.isRescheduleProposal &&
                          displayStatus === 'PROPUESTA'
                            ? 'Reprogramacion propuesta'
                            : getStatusLabel(displayStatus)}
                        </span>
                      </td>
                      <td className="py-2 pl-0 pr-2 text-center sm:py-2 sm:pr-3">
                        {displayStatus === 'FINALIZADA' ? (
                          appointment.myRating !== null ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[0.62rem] font-semibold leading-4 text-amber-600 sm:gap-1 sm:px-2 sm:py-0.5 sm:text-[0.68rem]">
                              <Star
                                aria-hidden="true"
                                className="h-2.5 w-2.5 fill-amber-400 text-amber-400 sm:h-2.5 sm:w-2.5"
                              />
                              {appointment.myRating}/5
                            </span>
                          ) : (
                            <button
                              aria-label={`Valorar cita con ${appointment.studentName}`}
                              className="inline-flex max-w-full items-center justify-center gap-0.5 whitespace-nowrap rounded-full bg-amber-50 px-1.5 py-1 text-[0.58rem] font-semibold leading-none text-amber-700 transition duration-200 hover:bg-amber-100 sm:gap-1 sm:px-2 sm:py-1 sm:text-[0.68rem]"
                              type="button"
                              onClick={() =>
                                setRatingTarget({
                                  appointmentId: appointment.id,
                                  studentName: appointment.studentName,
                                })
                              }
                            >
                              <Star
                                aria-hidden="true"
                                className="h-2.5 w-2.5 sm:h-3 sm:w-3"
                              />
                              <span className="sr-only sm:not-sr-only">
                                Valorar
                              </span>
                            </button>
                          )
                        ) : (
                          <span className="inline-flex w-full justify-center text-[0.62rem] font-medium leading-4 text-ink-muted sm:text-[0.72rem]">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-1.5 py-2 text-center sm:px-4 sm:py-2">
                        {displayStatus === 'PROPUESTA' ? (
                          <div className="flex max-w-full flex-wrap items-center justify-center gap-1 sm:gap-1">
                            {detailsButton}
                            <button
                              className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-50 px-1.5 py-1 text-[0.62rem] font-semibold text-emerald-700 transition duration-200 hover:bg-emerald-100 sm:px-2 sm:py-1 sm:text-[0.72rem]"
                              type="button"
                              onClick={() =>
                                handleAppointmentStatusChange(
                                  appointment,
                                  'ACEPTADA',
                                )
                              }
                            >
                              <CheckCircle2
                                aria-hidden="true"
                                className="h-3 w-3 sm:h-3 sm:w-3"
                              />
                              <span className="sr-only sm:not-sr-only">
                                {
                                  patientContent.appointmentsPage.actionLabels
                                    .accept
                                }
                              </span>
                            </button>
                            <button
                              className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-rose-50 px-1.5 py-1 text-[0.62rem] font-semibold text-rose-700 transition duration-200 hover:bg-rose-100 sm:px-2 sm:py-1 sm:text-[0.72rem]"
                              type="button"
                              onClick={() =>
                                handleAppointmentStatusChange(
                                  appointment,
                                  'RECHAZADA',
                                )
                              }
                            >
                              <XCircle
                                aria-hidden="true"
                                className="h-3 w-3 sm:h-3 sm:w-3"
                              />
                              <span className="sr-only sm:not-sr-only">
                                {
                                  patientContent.appointmentsPage.actionLabels
                                    .reject
                                }
                              </span>
                            </button>
                          </div>
                        ) : displayStatus === 'ACEPTADA' ? (
                          <div className="flex max-w-full flex-wrap items-center justify-center gap-1 sm:gap-1">
                            {detailsButton}
                            <button
                              className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-rose-50 px-1.5 py-1 text-[0.62rem] font-semibold text-rose-700 transition duration-200 hover:bg-rose-100 sm:px-2 sm:py-1 sm:text-[0.72rem]"
                              type="button"
                              onClick={() =>
                                handleAppointmentStatusChange(
                                  appointment,
                                  'CANCELADA',
                                )
                              }
                            >
                              <Ban
                                aria-hidden="true"
                                className="h-3 w-3 sm:h-3 sm:w-3"
                              />
                              <span className="sr-only sm:not-sr-only">
                                {
                                  patientContent.appointmentsPage.actionLabels
                                    .cancel
                                }
                              </span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex max-w-full flex-wrap items-center justify-center gap-1 sm:gap-1">
                            {detailsButton}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 place-items-center px-4 py-8 text-center sm:px-5">
            <p className="text-sm font-medium text-ink-muted">
              {isLoading
                ? 'Cargando citas...'
                : patientContent.appointmentsPage.emptyState}
            </p>
          </div>
        )}
        <AdminTablePagination
          currentPage={clampedCurrentPage}
          pageEndLabel={pageEndLabel}
          pageStartLabel={pageStartLabel}
          totalItems={filteredAppointments.length}
          totalPages={totalPages}
          onNext={() =>
            setCurrentPage((currentValue) =>
              Math.min(totalPages, currentValue + 1),
            )
          }
          onPrevious={() =>
            setCurrentPage((currentValue) => Math.max(1, currentValue - 1))
          }
        />
      </AdminPanelCard>

      {ratingTarget ? (
        <PatientRatingModal
          appointmentId={ratingTarget.appointmentId}
          isSubmitting={isSubmittingRating}
          studentName={ratingTarget.studentName}
          onClose={() => setRatingTarget(null)}
          onSubmit={handleSubmitRating}
        />
      ) : null}

      {detailAppointment ? (
        <AppointmentDetailModal
          appointment={detailAppointment}
          displayStatus={getAppointmentDisplayStatus(
            detailAppointment,
            currentTimestamp,
          )}
          onClose={() => setDetailAppointmentId(null)}
        />
      ) : null}
    </div>
  );
}
