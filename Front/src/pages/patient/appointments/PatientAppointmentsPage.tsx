import {
  Ban,
  BriefcaseMedical,
  CalendarCheck2,
  Check,
  CheckCircle2,
  Clock3,
  GraduationCap,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  Stethoscope,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

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

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedSearch, sortOrder, statusFilter]);

  useEffect(() => {
    setCurrentPage((currentValue) => Math.min(currentValue, totalPages));
  }, [totalPages]);

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
                          <span className="inline-flex w-full justify-center text-[0.62rem] font-medium text-ink-muted sm:text-xs">
                            -
                          </span>
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
    </div>
  );
}
