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
  MessageSquare,
  PencilLine,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  Stethoscope,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { AdminConfirmationDialog } from '@/components/admin/AdminConfirmationDialog';
import { StudentRatingModal } from '@/components/student/StudentRatingModal';
import { AdminDropdownField } from '@/components/admin/AdminDropdownField';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminTextField } from '@/components/admin/AdminTextField';
import { AdminTimePickerField } from '@/components/admin/AdminTimePickerField';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { studentContent } from '@/content/studentContent';
import type {
  StudentAgendaAppointment,
  StudentAgendaAppointmentStatus,
  StudentAppointmentFormErrors,
  StudentAppointmentFormValues,
  StudentAppointmentReview,
} from '@/content/types';
import { classNames } from '@/lib/classNames';
import { useStudentModuleStore } from '@/lib/studentModuleStore';

type AppointmentStatusFilter = StudentAgendaAppointmentStatus | 'all';
type AppointmentSortOrder = 'arrival' | 'proximity';

const appointmentStatusOptions: Array<{
  label: string;
  value: AppointmentStatusFilter;
}> = [
  { label: 'Todas', value: 'all' },
  { label: 'Propuesta', value: 'PROPUESTA' },
  { label: 'Aceptada', value: 'ACEPTADA' },
  { label: 'Reprogramacion', value: 'REPROGRAMACION_PENDIENTE' },
  { label: 'Cancelada', value: 'CANCELADA' },
  { label: 'Finalizada', value: 'FINALIZADA' },
];

const initialAppointmentFormValues: StudentAppointmentFormValues = {
  additionalInfo: '',
  appointmentTypeId: '',
  endTime: '',
  requestId: '',
  siteId: '',
  startDate: '',
  startTime: '',
  supervisorId: '',
  treatmentIds: [],
};

function StudentAppointmentsDialogFrame({
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
          description ? 'student-appointments-dialog-description' : undefined
        }
        aria-labelledby="student-appointments-dialog-title"
        aria-modal="true"
        className="student-appointment-dialog relative mx-auto w-full max-w-3xl overflow-visible rounded-[1.35rem] border border-slate-200/80 bg-white shadow-[0_34px_90px_-36px_rgba(15,23,42,0.55)]"
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
              id="student-appointments-dialog-title"
            >
              {title}
            </h2>
            {description ? (
              <p
                className="pr-8 text-[0.72rem] leading-5 text-ink-muted sm:text-[0.76rem]"
                id="student-appointments-dialog-description"
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

function getStatusLabel(status: StudentAgendaAppointmentStatus) {
  switch (status) {
    case 'ACEPTADA':
      return 'Aceptada';
    case 'CANCELADA':
      return 'Cancelada';
    case 'FINALIZADA':
      return 'Finalizada';
    case 'REPROGRAMACION_PENDIENTE':
      return 'Reprogramacion';
    default:
      return 'Propuesta';
  }
}

function getStatusBadgeClasses(status: StudentAgendaAppointmentStatus) {
  switch (status) {
    case 'ACEPTADA':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'CANCELADA':
      return 'bg-rose-50 text-rose-700 ring-rose-200';
    case 'FINALIZADA':
      return 'bg-sky-50 text-sky-700 ring-sky-200';
    case 'REPROGRAMACION_PENDIENTE':
      return 'bg-violet-50 text-violet-700 ring-violet-200';
    default:
      return 'bg-amber-50 text-amber-700 ring-amber-200';
  }
}

function formatDateTimeRange(startAt: string, endAt: string) {
  const dateFormatter = new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
  });
  const startDate = new Date(startAt);
  const endDate = new Date(endAt);
  const timeFormatter = new Intl.DateTimeFormat('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const dateParts = dateFormatter.formatToParts(startDate);
  const day = dateParts.find((part) => part.type === 'day')?.value ?? '';
  const month = dateParts.find((part) => part.type === 'month')?.value ?? '';

  return `${day} de ${month}, ${timeFormatter.format(startDate)} a ${timeFormatter.format(endDate)}`;
}

function formatTreatmentSummary(treatmentNames: string[]) {
  const firstTreatment = treatmentNames[0];

  if (!firstTreatment) {
    return 'Sin tratamiento asociado';
  }

  const additionalTreatments = treatmentNames.length - 1;

  return additionalTreatments > 0
    ? `${firstTreatment} +${additionalTreatments}`
    : firstTreatment;
}

function canEditAppointment(appointment: StudentAgendaAppointment) {
  return (
    appointment.status === 'PROPUESTA' ||
    appointment.status === 'REPROGRAMACION_PENDIENTE'
  );
}

function getInitialAppointmentFormValues(
  appointment?: StudentAgendaAppointment | null,
): StudentAppointmentFormValues {
  if (!appointment) {
    return initialAppointmentFormValues;
  }

  return {
    additionalInfo: appointment.additionalInfo ?? '',
    appointmentTypeId: appointment.appointmentTypeId,
    endTime: appointment.endAt.slice(11, 16),
    requestId: appointment.requestId,
    siteId: appointment.siteId,
    startDate: appointment.startAt.slice(0, 10),
    startTime: appointment.startAt.slice(11, 16),
    supervisorId: appointment.supervisorId,
    treatmentIds: appointment.treatmentIds,
  };
}

function validateAppointmentForm(
  values: StudentAppointmentFormValues,
): StudentAppointmentFormErrors {
  const errors: StudentAppointmentFormErrors = {};

  if (!values.requestId) {
    errors.requestId = 'Selecciona una solicitud aceptada.';
  }

  if (!values.appointmentTypeId) {
    errors.appointmentTypeId = 'Selecciona el tipo de cita.';
  }

  if (!values.startDate) {
    errors.startDate = 'Selecciona la fecha de la cita.';
  }

  if (!values.startTime) {
    errors.startTime = 'Selecciona la hora de inicio.';
  }

  if (!values.endTime) {
    errors.endTime = 'Selecciona la hora de finalizacion.';
  }

  if (
    values.startTime &&
    values.endTime &&
    values.endTime <= values.startTime
  ) {
    errors.endTime = 'La hora final debe ser posterior a la inicial.';
  }

  if (!values.siteId) {
    errors.siteId = 'Selecciona la sede.';
  }

  if (!values.supervisorId) {
    errors.supervisorId = 'Selecciona el docente supervisor.';
  }

  if (values.treatmentIds.length === 0) {
    errors.treatmentIds = 'Selecciona al menos un tratamiento.';
  }

  return errors;
}

export function StudentAppointmentsPage() {
  const {
    appointments,
    appointmentTypes,
    checkAppointmentConflict,
    errorMessage,
    isLoading,
    practiceSites,
    requests,
    reviews,
    supervisors,
    treatments,
    updateAppointmentStatus,
    upsertAppointment,
    submitAppointmentReview,
  } = useStudentModuleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<AppointmentStatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<AppointmentSortOrder>('arrival');
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [appointmentErrors, setAppointmentErrors] =
    useState<StudentAppointmentFormErrors>({});
  const [appointmentValues, setAppointmentValues] =
    useState<StudentAppointmentFormValues>(initialAppointmentFormValues);
  const [editingAppointmentId, setEditingAppointmentId] = useState<
    string | null
  >(null);
  const [appointmentApiError, setAppointmentApiError] = useState<string | null>(
    null,
  );
  const [viewingAppointment, setViewingAppointment] =
    useState<StudentAgendaAppointment | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] =
    useState<StudentAgendaAppointment | null>(null);
  const [commentsAppointment, setCommentsAppointment] =
    useState<StudentAgendaAppointment | null>(null);
  const [ratingTarget, setRatingTarget] = useState<{
    appointmentId: string;
    patientName: string;
  } | null>(null);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const pendingCount = useMemo(
    () =>
      appointments.filter((appointment) => appointment.status === 'PROPUESTA')
        .length,
    [appointments],
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
  const acceptedRequests = useMemo(
    () => requests.filter((request) => request.status === 'ACEPTADA'),
    [requests],
  );
  const activePracticeSites = useMemo(
    () =>
      practiceSites.filter((practiceSite) => practiceSite.status === 'active'),
    [practiceSites],
  );
  const activeSupervisors = useMemo(
    () => supervisors.filter((supervisor) => supervisor.status === 'active'),
    [supervisors],
  );
  const activeTreatments = useMemo(
    () => treatments.filter((treatment) => treatment.status === 'active'),
    [treatments],
  );
  const availableAppointmentTypes = useMemo(
    () => appointmentTypes,
    [appointmentTypes],
  );
  const practiceSitesBySiteId = useMemo(
    () =>
      new Map(
        practiceSites.map((practiceSite) => [practiceSite.siteId, practiceSite]),
      ),
    [practiceSites],
  );
  const filteredAppointments = useMemo(() => {
    const filtered = appointments.filter((appointment) => {
      const matchesSearch = appointment.patientName
        .toLowerCase()
        .includes(normalizedSearch);
      return (
        matchesSearch &&
        (statusFilter === 'all' || appointment.status === statusFilter)
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
  }, [appointments, normalizedSearch, sortOrder, statusFilter]);
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

  const resetAppointmentForm = () => {
    setEditingAppointmentId(null);
    setAppointmentErrors({});
    setAppointmentValues(initialAppointmentFormValues);
    setAppointmentApiError(null);
  };

  const openCreateDialog = () => {
    resetAppointmentForm();
    setIsAppointmentDialogOpen(true);
  };

  const closeAppointmentDialog = () => {
    resetAppointmentForm();
    setIsAppointmentDialogOpen(false);
  };

  const closeAppointmentDetails = () => {
    setViewingAppointment(null);
  };

  const handleAppointmentFieldChange = (
    field: keyof StudentAppointmentFormValues,
    nextValue: string | string[],
  ) => {
    setAppointmentValues((currentValues) => ({
      ...currentValues,
      [field]: nextValue,
    }));
    setAppointmentErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
    setAppointmentApiError(null);
  };

  const handleTreatmentToggle = (treatmentId: string) => {
    setAppointmentValues((currentValues) => {
      const isSelected = currentValues.treatmentIds.includes(treatmentId);

      return {
        ...currentValues,
        treatmentIds: isSelected
          ? currentValues.treatmentIds.filter(
              (currentId) => currentId !== treatmentId,
            )
          : [...currentValues.treatmentIds, treatmentId],
      };
    });
    setAppointmentErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors.treatmentIds;
      return nextErrors;
    });
    setAppointmentApiError(null);
  };

  const handleEditAppointment = (appointment: StudentAgendaAppointment) => {
    setEditingAppointmentId(appointment.id);
    setAppointmentValues(getInitialAppointmentFormValues(appointment));
    setAppointmentErrors({});
    setIsAppointmentDialogOpen(true);
  };

  const handleViewAppointment = (appointment: StudentAgendaAppointment) => {
    setViewingAppointment(appointment);
  };

  const handleEditFromDetails = (appointment: StudentAgendaAppointment) => {
    setViewingAppointment(null);
    handleEditAppointment(appointment);
  };

  const handleAppointmentSubmit = () => {
    const nextErrors = validateAppointmentForm(appointmentValues);
    setAppointmentErrors(nextErrors);
    setAppointmentApiError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const conflictError = checkAppointmentConflict(
      appointmentValues,
      editingAppointmentId ?? undefined,
    );

    if (conflictError) {
      setAppointmentApiError(conflictError);
      return;
    }

    void (async () => {
      const appointment = await upsertAppointment(
        appointmentValues,
        editingAppointmentId ?? undefined,
      );

      if (!appointment) {
        setAppointmentApiError(errorMessage);
        return;
      }

      closeAppointmentDialog();
    })();
  };

  const handleStatusChange = (
    appointmentId: string,
    status: StudentAgendaAppointmentStatus,
  ) => {
    void (async () => {
      const wasUpdated = await updateAppointmentStatus(appointmentId, status);

      if (!wasUpdated) {
        return;
      }

      setAppointmentToCancel(null);
    })();
  };

  return (
    <div className="student-page-compact flex h-full w-full min-h-0 flex-col gap-3 overflow-hidden">
      <Seo
        description={studentContent.appointmentsPage.meta.description}
        noIndex
        title={studentContent.appointmentsPage.meta.title}
      />
      <AdminPageHeader
        className="gap-2.5"
        description={studentContent.appointmentsPage.description}
        descriptionClassName="text-sm leading-5 sm:text-[0.95rem]"
        headingAlign="center"
        title={studentContent.appointmentsPage.title}
        titleClassName="text-[1.85rem] sm:text-[2.15rem]"
      />
      {errorMessage && !isAppointmentDialogOpen ? (
        <SurfaceCard
          className="border border-rose-200 bg-rose-50/90 text-sm font-medium text-rose-800"
          paddingClassName="p-3.5"
        >
          <p role="alert">{errorMessage}</p>
        </SurfaceCard>
      ) : null}
      <div className="grid gap-2.5 md:grid-cols-3">
        <SurfaceCard
          className="min-w-0 overflow-hidden bg-brand-gradient text-white"
          paddingClassName="p-0"
        >
          <div className="flex items-center gap-2.5 px-3.5 py-2">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.9rem] bg-white/12 text-white">
              <Clock3 aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="font-headline text-[1.28rem] font-extrabold tracking-tight text-white">
              {pendingCount}
            </span>
            <p className="min-w-0 text-[0.82rem] font-semibold text-white/90">
              Propuestas activas
            </p>
          </div>
        </SurfaceCard>
        <SurfaceCard
          className="border border-slate-200/80 bg-white shadow-none"
          paddingClassName="p-0"
        >
          <div className="flex items-center gap-2.5 px-3.5 py-2">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.9rem] bg-emerald-50 text-emerald-700">
              <CalendarCheck2 aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="font-headline text-[1.28rem] font-extrabold tracking-tight text-ink">
              {acceptedCount}
            </span>
            <p className="min-w-0 text-[0.82rem] font-semibold text-ink-muted">
              Aceptadas
            </p>
          </div>
        </SurfaceCard>
        <SurfaceCard
          className="border border-slate-200/80 bg-white shadow-none"
          paddingClassName="p-0"
        >
          <div className="flex items-center gap-2.5 px-3.5 py-2">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.9rem] bg-sky-50 text-sky-700">
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="font-headline text-[1.28rem] font-extrabold tracking-tight text-ink">
              {completedCount}
            </span>
            <p className="min-w-0 text-[0.82rem] font-semibold text-ink-muted">
              Finalizadas
            </p>
          </div>
        </SurfaceCard>
      </div>
      <AdminPanelCard className="flex-1" panelClassName="bg-[#f4f8ff]">
        <div className="border-b border-slate-200/80 px-4 py-3.5 sm:px-5 sm:py-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label
              className="relative min-w-0 flex-1 sm:max-w-[32rem] xl:max-w-[36rem]"
              htmlFor="student-appointment-search"
            >
              <span className="sr-only">
                {studentContent.appointmentsPage.searchLabel}
              </span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost"
              />
              <input
                className="h-11 w-full rounded-full border border-slate-200/90 bg-white/98 py-0 pl-11 pr-4 text-sm text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 placeholder:text-ghost/80 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                id="student-appointment-search"
                placeholder={studentContent.appointmentsPage.searchPlaceholder}
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
            <div className="flex items-center justify-end gap-2.5">
              <button
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-brand-gradient px-4 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                type="button"
                onClick={openCreateDialog}
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                <span>
                  {studentContent.appointmentsPage.actionLabels.create}
                </span>
              </button>
              <div className="relative shrink-0" ref={statusMenuRef}>
                <button
                  aria-controls="student-appointment-status-menu"
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
                    'relative inline-flex h-11 w-11 items-center justify-center rounded-full border bg-white/98 text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                    statusFilter !== 'all' || sortOrder !== 'arrival'
                      ? 'border-primary/25 bg-primary/[0.08] text-primary hover:bg-primary/[0.12]'
                      : 'border-slate-200/90 hover:border-primary/30 hover:bg-white',
                  )}
                  type="button"
                  onClick={() =>
                    setIsStatusMenuOpen((currentValue) => !currentValue)
                  }
                >
                  <SlidersHorizontal
                    aria-hidden="true"
                    className="h-[1.05rem] w-[1.05rem]"
                  />
                  {statusFilter !== 'all' || sortOrder !== 'arrival' ? (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
                  ) : null}
                </button>
                {isStatusMenuOpen ? (
                  <div
                    className="absolute right-0 top-[calc(100%+0.6rem)] z-20 w-[14rem] overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-white/95 p-2 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] backdrop-blur"
                    id="student-appointment-status-menu"
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
                              <Check
                                aria-hidden="true"
                                className="h-3.5 w-3.5"
                              />
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
                              <Check
                                aria-hidden="true"
                                className="h-3.5 w-3.5"
                              />
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
        </div>
        {filteredAppointments.length > 0 ? (
          <div className="admin-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[22%]" />
                <col className="w-[24%]" />
                <col className="w-[12%]" />
                <col className="w-[20%]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-slate-100 text-left">
                <tr className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-ink-muted">
                  <th className="px-4 py-3 sm:px-5">Paciente</th>
                  <th className="py-3 pl-0 pr-4">Atención clínica</th>
                  <th className="px-4 py-3">Programación</th>
                  <th className="w-[9.5rem] px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-center sm:px-5">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 bg-white">
                {filteredAppointments.map((appointment) => {
                  const appointmentLocality =
                    practiceSitesBySiteId.get(appointment.siteId)?.locality ??
                    appointment.city;

                  return (
                    <tr
                      key={appointment.id}
                      className="align-top"
                      data-testid={`student-appointment-row-${appointment.id}`}
                    >
                      <td className="px-4 py-3 sm:px-5">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold leading-5 text-ink">
                            {appointment.patientName}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 pl-0 pr-4">
                        <div className="min-w-0 space-y-0.5 text-[0.82rem] leading-5 text-ink-muted">
                          <p className="flex items-start gap-1.5 font-semibold text-ink">
                            <Stethoscope
                              aria-hidden="true"
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                            />
                            <span className="min-w-0 break-words">
                              {appointment.appointmentType}
                            </span>
                          </p>
                          <p className="flex items-start gap-1.5">
                            <GraduationCap
                              aria-hidden="true"
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                            />
                            <span className="min-w-0 break-words">
                              <span className="font-semibold text-ink">
                                Docente =
                              </span>{' '}
                              {appointment.supervisorName}
                            </span>
                          </p>
                          <p className="flex items-start gap-1.5">
                            <BriefcaseMedical
                              aria-hidden="true"
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                            />
                            <span className="min-w-0 break-words">
                              {formatTreatmentSummary(appointment.treatmentNames)}
                            </span>
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="min-w-0 space-y-0.5 text-[0.82rem] leading-5 text-ink-muted">
                          <p className="flex items-start gap-1.5 font-semibold text-ink">
                            <Clock3
                              aria-hidden="true"
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
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
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                            />
                            <span className="min-w-0 break-words">
                              {appointment.siteName} - {appointmentLocality}
                            </span>
                          </p>
                        </div>
                      </td>
                    <td className="w-[9.5rem] px-4 py-3">
                      <span
                        className={classNames(
                          'inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
                          getStatusBadgeClasses(appointment.status),
                        )}
                      >
                        {getStatusLabel(appointment.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center sm:px-5">
                      {appointment.status === 'PROPUESTA' ||
                      appointment.status === 'REPROGRAMACION_PENDIENTE' ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <button
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-primary ring-1 ring-slate-200 transition duration-200 hover:bg-slate-100"
                            type="button"
                            onClick={() => handleViewAppointment(appointment)}
                          >
                            <Eye
                              aria-hidden="true"
                              className="h-3.5 w-3.5"
                            />
                            <span>Ver cita</span>
                          </button>
                          <button
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition duration-200 hover:bg-rose-100"
                            type="button"
                            onClick={() => setAppointmentToCancel(appointment)}
                          >
                            <Ban aria-hidden="true" className="h-3.5 w-3.5" />
                            <span>
                              {
                                studentContent.appointmentsPage.actionLabels
                                  .cancel
                              }
                            </span>
                          </button>
                        </div>
                      ) : appointment.status === 'ACEPTADA' ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <button
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition duration-200 hover:bg-sky-100"
                            type="button"
                            onClick={() =>
                              handleStatusChange(appointment.id, 'FINALIZADA')
                            }
                          >
                            <CheckCircle2
                              aria-hidden="true"
                              className="h-3.5 w-3.5"
                            />
                            <span>
                              {
                                studentContent.appointmentsPage.actionLabels
                                  .finalize
                              }
                            </span>
                          </button>
                          <button
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition duration-200 hover:bg-rose-100"
                            type="button"
                            onClick={() => setAppointmentToCancel(appointment)}
                          >
                            <Ban aria-hidden="true" className="h-3.5 w-3.5" />
                            <span>
                              {
                                studentContent.appointmentsPage.actionLabels
                                  .cancel
                              }
                            </span>
                          </button>
                        </div>
                      ) : appointment.status === 'FINALIZADA' ? (
                        <div className="flex flex-col items-center gap-1.5">
                          {!appointment.myRating ? (
                            <button
                              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition duration-200 hover:bg-amber-100"
                              type="button"
                              onClick={() =>
                                setRatingTarget({
                                  appointmentId: appointment.id,
                                  patientName: appointment.patientName,
                                })
                              }
                            >
                              <Star
                                aria-hidden="true"
                                className="h-3.5 w-3.5"
                              />
                              <span>Calificar paciente</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-600">
                              <Star
                                aria-hidden="true"
                                className="h-3 w-3 fill-amber-400 text-amber-400"
                              />
                              {appointment.myRating}/5
                            </span>
                          )}
                          <button
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition duration-200 hover:bg-slate-200"
                            type="button"
                            onClick={() => setCommentsAppointment(appointment)}
                          >
                            <MessageSquare
                              aria-hidden="true"
                              className="h-3.5 w-3.5"
                            />
                            <span>Ver comentarios</span>
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex justify-center text-xs font-medium text-ink-muted">
                          Sin acciones
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
          <div className="px-4 py-8 text-center sm:px-5">
            <p className="text-sm font-medium text-ink-muted">
              {isLoading
                ? 'Cargando citas...'
                : studentContent.appointmentsPage.emptyState}
            </p>
          </div>
        )}
      </AdminPanelCard>
      {viewingAppointment ? (
        <AppointmentDetailsModal
          appointment={viewingAppointment}
          canEdit={canEditAppointment(viewingAppointment)}
          locality={
            practiceSitesBySiteId.get(viewingAppointment.siteId)?.locality ??
            viewingAppointment.city
          }
          onClose={closeAppointmentDetails}
          onEdit={() => handleEditFromDetails(viewingAppointment)}
        />
      ) : null}
      {isAppointmentDialogOpen ? (
        <StudentAppointmentsDialogFrame
          description="Agenda una cita a partir de una solicitud aceptada, con sede, docente supervisor y tratamientos validos."
          onClose={closeAppointmentDialog}
          title={editingAppointmentId ? 'Editar cita' : 'Agendar cita'}
        >
          <div className="space-y-2.5">
            <div className="grid gap-2 sm:grid-cols-2">
              <AdminDropdownField
                containerClassName="student-appointment-dialog-field"
                error={appointmentErrors.requestId}
                icon={UserRound}
                id="student-appointment-request"
                label="Solicitud aceptada"
                name="studentAppointmentRequest"
                options={acceptedRequests.map((request) => ({
                  id: request.id,
                  label: `${request.patientName} · ${request.patientCity}`,
                }))}
                placeholder="Selecciona una solicitud"
                value={appointmentValues.requestId}
                onChange={(value) =>
                  handleAppointmentFieldChange('requestId', value)
                }
              />
              <AdminDropdownField
                containerClassName="student-appointment-dialog-field"
                error={appointmentErrors.siteId}
                icon={MapPin}
                id="student-appointment-site"
                label="Sede"
                name="studentAppointmentSite"
                options={activePracticeSites.map((practiceSite) => ({
                  id: practiceSite.siteId,
                  label: `${practiceSite.name} · ${practiceSite.city}`,
                }))}
                placeholder="Selecciona una sede"
                value={appointmentValues.siteId}
                onChange={(value) =>
                  handleAppointmentFieldChange('siteId', value)
                }
              />
            </div>
            <AdminDropdownField
              containerClassName="student-appointment-dialog-field"
              error={appointmentErrors.appointmentTypeId}
              icon={Stethoscope}
              id="student-appointment-type"
              label="Tipo de cita"
              name="studentAppointmentType"
              options={availableAppointmentTypes.map((appointmentType) => ({
                id: appointmentType.id,
                label: appointmentType.name,
              }))}
              placeholder="Selecciona el tipo de cita"
              value={appointmentValues.appointmentTypeId}
              onChange={(value) =>
                handleAppointmentFieldChange('appointmentTypeId', value)
              }
            />
            <div className="grid gap-2 sm:grid-cols-3">
              <AdminTextField
                containerClassName="student-appointment-dialog-field"
                error={appointmentErrors.startDate}
                icon={CalendarCheck2}
                id="student-appointment-date"
                label="Fecha de la cita"
                name="studentAppointmentDate"
                placeholder=""
                type="date"
                value={appointmentValues.startDate}
                onChange={(value) =>
                  handleAppointmentFieldChange('startDate', value)
                }
              />
              <AdminTimePickerField
                containerClassName="student-appointment-dialog-field"
                error={appointmentErrors.startTime}
                id="student-appointment-start-time"
                label="Hora de inicio"
                name="studentAppointmentStartTime"
                value={appointmentValues.startTime}
                onChange={(value) =>
                  handleAppointmentFieldChange('startTime', value)
                }
              />
              <AdminTimePickerField
                containerClassName="student-appointment-dialog-field"
                disabled={!appointmentValues.startTime}
                error={appointmentErrors.endTime}
                id="student-appointment-end-time"
                label="Hora de finalizacion"
                min={appointmentValues.startTime || undefined}
                name="studentAppointmentEndTime"
                value={appointmentValues.endTime}
                onChange={(value) =>
                  handleAppointmentFieldChange('endTime', value)
                }
              />
            </div>
            <AdminDropdownField
              containerClassName="student-appointment-dialog-field"
              error={appointmentErrors.supervisorId}
              icon={GraduationCap}
              id="student-appointment-supervisor"
              label="Docente supervisor"
              name="studentAppointmentSupervisor"
              options={activeSupervisors.map((supervisor) => ({
                id: supervisor.id,
                label: supervisor.name,
              }))}
              placeholder="Selecciona un docente supervisor"
              value={appointmentValues.supervisorId}
              onChange={(value) =>
                handleAppointmentFieldChange('supervisorId', value)
              }
            />
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-[0.74rem] font-semibold text-ink">
                    Tratamientos asociados
                  </h3>
                  <p className="text-[0.66rem] text-ink-muted">
                    Selecciona uno o varios tratamientos activos para la cita.
                  </p>
                </div>
                {appointmentErrors.treatmentIds ? (
                  <p className="text-[0.66rem] font-medium text-rose-700">
                    {appointmentErrors.treatmentIds}
                  </p>
                ) : null}
              </div>
              <div className="admin-scrollbar grid max-h-[9.5rem] gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2 md:grid-cols-3">
                {activeTreatments.map((treatment) => {
                  const isSelected = appointmentValues.treatmentIds.includes(
                    treatment.treatmentTypeId,
                  );

                  return (
                    <button
                      key={treatment.id}
                      className={classNames(
                        'rounded-[0.85rem] border px-2 py-1.5 text-left transition duration-200',
                        isSelected
                          ? 'border-primary/35 bg-primary/[0.08] shadow-[0_18px_36px_-30px_rgba(22,78,99,0.8)]'
                          : 'border-slate-200/80 bg-white hover:border-primary/20 hover:bg-slate-50',
                      )}
                      type="button"
                      onClick={() =>
                        handleTreatmentToggle(treatment.treatmentTypeId)
                      }
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <p className="text-[0.72rem] font-semibold leading-tight text-ink">
                            {treatment.name}
                          </p>
                          <p className="line-clamp-2 text-[0.62rem] leading-4 text-ink-muted">
                            {treatment.description}
                          </p>
                        </div>
                        <span
                          className={classNames(
                            'inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[0.68rem] font-bold',
                            isSelected
                              ? 'bg-primary text-white'
                              : 'bg-slate-100 text-slate-400',
                          )}
                        >
                          <Check aria-hidden="true" className="h-3 w-3" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1">
              <label
                className="block text-[0.72rem] font-semibold text-ink"
                htmlFor="student-appointment-additional-info"
              >
                Informacion adicional
              </label>
              <textarea
                className="student-appointment-dialog-notes min-h-[3rem] w-full rounded-[0.85rem] border border-slate-200 bg-surface px-2.5 py-1.5 text-[0.72rem] text-ink placeholder:text-ghost/80 transition duration-300 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                id="student-appointment-additional-info"
                placeholder="Registra observaciones operativas o notas de preparacion para la cita."
                value={appointmentValues.additionalInfo}
                onChange={(event) =>
                  handleAppointmentFieldChange(
                    'additionalInfo',
                    event.target.value,
                  )
                }
              />
            </div>
            {appointmentApiError ? (
              <div
                className="rounded-[0.9rem] border border-rose-200 bg-rose-50/90 px-2.5 py-2 text-[0.72rem] font-medium text-rose-800"
                role="alert"
              >
                {appointmentApiError}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                className="inline-flex items-center justify-center rounded-full bg-slate-100 px-3 py-1.5 text-[0.76rem] font-semibold text-ink-muted transition duration-200 hover:bg-slate-200"
                type="button"
                onClick={closeAppointmentDialog}
              >
                Cancelar
              </button>
              <button
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-gradient px-3 py-1.5 text-[0.76rem] font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110"
                disabled={isLoading || acceptedRequests.length === 0}
                type="button"
                onClick={handleAppointmentSubmit}
              >
                <CalendarCheck2 aria-hidden="true" className="h-4 w-4" />
                <span>
                  {editingAppointmentId
                    ? studentContent.appointmentsPage.actionLabels.update
                    : studentContent.appointmentsPage.actionLabels.save}
                </span>
              </button>
            </div>
            {acceptedRequests.length === 0 ? (
              <p className="text-[0.72rem] font-medium text-amber-700">
                Necesitas una solicitud aceptada para poder programar nuevas
                citas.
              </p>
            ) : null}
          </div>
        </StudentAppointmentsDialogFrame>
      ) : null}
      <AdminConfirmationDialog
        confirmLabel="Si, cancelar cita"
        description="La cita dejara de estar disponible para seguimiento operativo y quedara marcada como cancelada."
        isOpen={!!appointmentToCancel}
        isSubmitting={isLoading}
        title="Cancelar cita"
        tone="danger"
        onCancel={() => setAppointmentToCancel(null)}
        onConfirm={() => {
          if (!appointmentToCancel) {
            return;
          }

          handleStatusChange(appointmentToCancel.id, 'CANCELADA');
        }}
      />
      {commentsAppointment ? (
        <AppointmentCommentsModal
          appointment={commentsAppointment}
          reviews={reviews.filter(
            (r) => r.appointmentId === commentsAppointment.id,
          )}
          onClose={() => setCommentsAppointment(null)}
        />
      ) : null}
      {ratingTarget ? (
        <StudentRatingModal
          appointmentId={ratingTarget.appointmentId}
          isSubmitting={isSubmittingRating}
          patientName={ratingTarget.patientName}
          onClose={() => setRatingTarget(null)}
          onSubmit={(appointmentId, rating, comment) => {
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
          }}
        />
      ) : null}
    </div>
  );
}

function AppointmentDetailsModal({
  appointment,
  canEdit,
  locality,
  onClose,
  onEdit,
}: {
  appointment: StudentAgendaAppointment;
  canEdit: boolean;
  locality: string;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <StudentAppointmentsDialogFrame
      description="Consulta el resumen operativo de la cita y abre la edición cuando necesites hacer un ajuste."
      onClose={onClose}
      title="Ver cita"
    >
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-primary/70">
              Paciente
            </p>
            <p className="mt-1 text-[0.88rem] font-semibold text-ink">
              {appointment.patientName}
            </p>
          </div>
          <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-primary/70">
              Estado
            </p>
            <p className="mt-1 text-[0.88rem] font-semibold text-ink">
              {getStatusLabel(appointment.status)}
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-[1rem] border border-slate-200 bg-white px-3 py-3">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-primary/70">
              Atención clínica
            </p>
            <div className="mt-2 space-y-1.5 text-[0.8rem] text-ink-muted">
              <p className="inline-flex items-center gap-1.5 font-semibold text-ink">
                <Stethoscope
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-primary"
                />
                <span>{appointment.appointmentType}</span>
              </p>
              <p className="inline-flex items-center gap-1.5">
                <GraduationCap
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-primary"
                />
                <span>
                  <span className="font-semibold text-ink">Docente =</span>{' '}
                  {appointment.supervisorName}
                </span>
              </p>
              <p className="inline-flex items-center gap-1.5">
                <BriefcaseMedical
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-primary"
                />
                <span>{formatTreatmentSummary(appointment.treatmentNames)}</span>
              </p>
            </div>
          </div>
          <div className="rounded-[1rem] border border-slate-200 bg-white px-3 py-3">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-primary/70">
              Programación
            </p>
            <div className="mt-2 space-y-1.5 text-[0.8rem] text-ink-muted">
              <p className="inline-flex items-center gap-1.5 font-semibold text-ink">
                <Clock3
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-primary"
                />
                <span>
                  {formatDateTimeRange(appointment.startAt, appointment.endAt)}
                </span>
              </p>
              <p className="inline-flex items-center gap-1.5">
                <MapPin
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-primary"
                />
                <span>
                  {appointment.siteName} - {locality}
                </span>
              </p>
            </div>
          </div>
        </div>

        {appointment.additionalInfo ? (
          <div className="rounded-[1rem] border border-slate-200 bg-white px-3 py-3">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-primary/70">
              Información adicional
            </p>
            <p className="mt-2 text-[0.8rem] leading-6 text-ink-muted">
              {appointment.additionalInfo}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            className="inline-flex items-center justify-center rounded-full bg-slate-100 px-3 py-1.5 text-[0.76rem] font-semibold text-ink-muted transition duration-200 hover:bg-slate-200"
            type="button"
            onClick={onClose}
          >
            Cerrar
          </button>
          {canEdit ? (
            <button
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-gradient px-3 py-1.5 text-[0.76rem] font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110"
              type="button"
              onClick={onEdit}
            >
              <PencilLine aria-hidden="true" className="h-4 w-4" />
              <span>Editar cita</span>
            </button>
          ) : null}
        </div>
      </div>
    </StudentAppointmentsDialogFrame>
  );
}

function AppointmentCommentsModal({
  appointment,
  reviews,
  onClose,
}: {
  appointment: StudentAgendaAppointment;
  reviews: StudentAppointmentReview[];
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm"
      role="dialog"
      onClick={(event) => {
        if (event.target === overlayRef.current) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-white shadow-[0_32px_80px_-24px_rgba(15,23,42,0.38)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-primary/70">
              Comentarios de la sesion
            </p>
            <p className="mt-0.5 text-sm font-semibold text-ink">
              {appointment.patientName}
            </p>
            <p className="text-xs text-ink-muted">
              {appointment.appointmentType}
            </p>
          </div>
          <button
            aria-label="Cerrar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ghost transition duration-150 hover:bg-slate-100 hover:text-ink"
            type="button"
            onClick={onClose}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <div className="admin-scrollbar max-h-[28rem] overflow-y-auto px-5 py-4">
          {reviews.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-muted">
              El paciente aun no ha dejado comentarios para esta cita.
            </p>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-[1rem] border border-slate-200/80 bg-slate-50 px-4 py-3.5"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-ink">
                      {review.patientName}
                    </p>
                    <p className="text-[0.68rem] text-ink-muted">
                      {new Intl.DateTimeFormat('es-CO', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      }).format(new Date(review.createdAt))}
                    </p>
                  </div>
                  {review.comment ? (
                    <p className="text-sm leading-6 text-ink-muted">
                      {review.comment}
                    </p>
                  ) : (
                    <p className="text-sm italic text-ink-muted/70">
                      Sin comentario escrito.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
