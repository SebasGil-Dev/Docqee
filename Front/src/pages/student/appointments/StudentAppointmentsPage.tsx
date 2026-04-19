import {
  Ban,
  CalendarCheck2,
  Check,
  CheckCircle2,
  Clock3,
  GraduationCap,
  MapPin,
  MessageSquare,
  PencilLine,
  Plus,
  Search,
  SlidersHorizontal,
  Stethoscope,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { AdminConfirmationDialog } from '@/components/admin/AdminConfirmationDialog';
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

const appointmentStatusOptions: Array<{ label: string; value: AppointmentStatusFilter }> = [
  { label: 'Todas', value: 'all' },
  { label: 'Propuesta', value: 'PROPUESTA' },
  { label: 'Aceptada', value: 'ACEPTADA' },
  { label: 'Reprogramacion', value: 'REPROGRAMACION_PENDIENTE' },
  { label: 'Cancelada', value: 'CANCELADA' },
  { label: 'Finalizada', value: 'FINALIZADA' },
];

const initialAppointmentFormValues: StudentAppointmentFormValues = {
  additionalInfo: '',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        aria-label="Cerrar ventana"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
        type="button"
        onClick={onClose}
      />
      <div
        aria-describedby={description ? 'student-appointments-dialog-description' : undefined}
        aria-labelledby="student-appointments-dialog-title"
        aria-modal="true"
        className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_34px_90px_-36px_rgba(15,23,42,0.55)]"
        role="dialog"
      >
        <div className="absolute right-4 top-4">
          <button
            aria-label="Cerrar ventana"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-ink-muted transition duration-200 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
            type="button"
            onClick={onClose}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 pb-5 pt-6 sm:px-6 sm:pb-6">
          <div className="space-y-1.5">
            <h2
              className="font-headline text-[1.4rem] font-extrabold tracking-tight text-ink"
              id="student-appointments-dialog-title"
            >
              {title}
            </h2>
            {description ? (
              <p
                className="pr-10 text-[0.86rem] leading-6 text-ink-muted"
                id="student-appointments-dialog-description"
              >
                {description}
              </p>
            ) : null}
          </div>
          <div className="mt-5">{children}</div>
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

  return `${formatter.format(startDate)} - ${timeFormatter.format(endDate)}`;
}

function getInitialAppointmentFormValues(
  appointment?: StudentAgendaAppointment | null,
): StudentAppointmentFormValues {
  if (!appointment) {
    return initialAppointmentFormValues;
  }

  return {
    additionalInfo: appointment.additionalInfo ?? '',
    endTime: appointment.endAt.slice(11, 16),
    requestId: appointment.requestId,
    siteId: appointment.siteId,
    startDate: appointment.startAt.slice(0, 10),
    startTime: appointment.startAt.slice(11, 16),
    supervisorId: appointment.supervisorId,
    treatmentIds: appointment.treatmentIds,
  };
}

function validateAppointmentForm(values: StudentAppointmentFormValues): StudentAppointmentFormErrors {
  const errors: StudentAppointmentFormErrors = {};

  if (!values.requestId) {
    errors.requestId = 'Selecciona una solicitud aceptada.';
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

  if (values.startTime && values.endTime && values.endTime <= values.startTime) {
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
  } = useStudentModuleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<AppointmentSortOrder>('arrival');
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [appointmentErrors, setAppointmentErrors] = useState<StudentAppointmentFormErrors>(
    {},
  );
  const [appointmentValues, setAppointmentValues] = useState<StudentAppointmentFormValues>(
    initialAppointmentFormValues,
  );
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [appointmentApiError, setAppointmentApiError] = useState<string | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] =
    useState<StudentAgendaAppointment | null>(null);
  const [commentsAppointment, setCommentsAppointment] =
    useState<StudentAgendaAppointment | null>(null);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const pendingCount = useMemo(
    () => appointments.filter((appointment) => appointment.status === 'PROPUESTA').length,
    [appointments],
  );
  const acceptedCount = useMemo(
    () => appointments.filter((appointment) => appointment.status === 'ACEPTADA').length,
    [appointments],
  );
  const completedCount = useMemo(
    () => appointments.filter((appointment) => appointment.status === 'FINALIZADA').length,
    [appointments],
  );
  const acceptedRequests = useMemo(
    () => requests.filter((request) => request.status === 'ACEPTADA'),
    [requests],
  );
  const activePracticeSites = useMemo(
    () => practiceSites.filter((practiceSite) => practiceSite.status === 'active'),
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
  const filteredAppointments = useMemo(() => {
    const filtered = appointments.filter((appointment) => {
      const matchesSearch = appointment.patientName.toLowerCase().includes(normalizedSearch);
      return matchesSearch && (statusFilter === 'all' || appointment.status === statusFilter);
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
      (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
    );
  }, [appointments, normalizedSearch, sortOrder, statusFilter]);
  const selectedRequest =
    acceptedRequests.find((request) => request.id === appointmentValues.requestId) ?? null;

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
          ? currentValues.treatmentIds.filter((currentId) => currentId !== treatmentId)
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
        <SurfaceCard className="min-w-0 overflow-hidden bg-brand-gradient text-white" paddingClassName="p-0">
          <div className="flex items-center gap-2.5 px-3.5 py-2">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.9rem] bg-white/12 text-white">
              <Clock3 aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="font-headline text-[1.28rem] font-extrabold tracking-tight text-white">
              {pendingCount}
            </span>
            <p className="min-w-0 text-[0.82rem] font-semibold text-white/90">Propuestas activas</p>
          </div>
        </SurfaceCard>
        <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-0">
          <div className="flex items-center gap-2.5 px-3.5 py-2">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.9rem] bg-emerald-50 text-emerald-700">
              <CalendarCheck2 aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="font-headline text-[1.28rem] font-extrabold tracking-tight text-ink">
              {acceptedCount}
            </span>
            <p className="min-w-0 text-[0.82rem] font-semibold text-ink-muted">Aceptadas</p>
          </div>
        </SurfaceCard>
        <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-0">
          <div className="flex items-center gap-2.5 px-3.5 py-2">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.9rem] bg-sky-50 text-sky-700">
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="font-headline text-[1.28rem] font-extrabold tracking-tight text-ink">
              {completedCount}
            </span>
            <p className="min-w-0 text-[0.82rem] font-semibold text-ink-muted">Finalizadas</p>
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
              <span className="sr-only">{studentContent.appointmentsPage.searchLabel}</span>
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
                <span>{studentContent.appointmentsPage.actionLabels.create}</span>
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
                          appointmentStatusOptions.find((option) => option.value === statusFilter)
                            ?.label
                        }`
                  }
                  className={classNames(
                    'relative inline-flex h-11 w-11 items-center justify-center rounded-full border bg-white/98 text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                    statusFilter !== 'all' || sortOrder !== 'arrival'
                      ? 'border-primary/25 bg-primary/[0.08] text-primary hover:bg-primary/[0.12]'
                      : 'border-slate-200/90 hover:border-primary/30 hover:bg-white',
                  )}
                  type="button"
                  onClick={() => setIsStatusMenuOpen((currentValue) => !currentValue)}
                >
                  <SlidersHorizontal aria-hidden="true" className="h-[1.05rem] w-[1.05rem]" />
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
                                isSelected ? 'bg-white/18 text-white' : 'bg-white text-slate-300',
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
                      {([
                        { label: 'Orden de llegada', value: 'arrival' as AppointmentSortOrder },
                        { label: 'Proximas primero', value: 'proximity' as AppointmentSortOrder },
                      ]).map((option) => {
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
                                isSelected ? 'bg-white/18 text-white' : 'bg-white text-slate-300',
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
        </div>
        {filteredAppointments.length > 0 ? (
          <div className="admin-scrollbar min-h-0 flex-1 overflow-x-auto overflow-y-auto">
            <table className="min-w-[86rem] xl:min-w-full">
              <thead className="sticky top-0 z-10 bg-slate-100 text-left">
                <tr className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-ink-muted">
                  <th className="px-4 py-3 sm:px-5">Paciente</th>
                  <th className="px-4 py-3">Programacion</th>
                  <th className="px-4 py-3">Atencion clinica</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right sm:px-5">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 bg-white">
                {filteredAppointments.map((appointment) => (
                  <tr
                    key={appointment.id}
                    className="align-top"
                    data-testid={`student-appointment-row-${appointment.id}`}
                  >
                    <td className="px-4 py-3.5 sm:px-5">
                      <div className="space-y-1.5">
                        <p className="text-sm font-semibold text-ink">{appointment.patientName}</p>
                        <p className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                          <UserRound aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
                          Solicitud vinculada
                        </p>
                        <p className="text-xs text-ink-muted">ID relacion: {appointment.requestId}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="max-w-[19rem] space-y-1.5 text-sm text-ink-muted">
                        <p className="font-semibold text-ink">{appointment.appointmentType}</p>
                        <p>{formatDateTimeRange(appointment.startAt, appointment.endAt)}</p>
                        <p className="inline-flex items-center gap-1.5">
                          <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
                          <span>
                            {appointment.siteName} - {appointment.city}
                          </span>
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="max-w-[24rem] space-y-2 text-sm text-ink-muted">
                        <p className="inline-flex items-center gap-1.5">
                          <GraduationCap aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
                          <span>Docente: {appointment.supervisorName}</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {appointment.treatmentNames.map((treatmentName) => (
                            <span
                              key={`${appointment.id}-${treatmentName}`}
                              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[0.72rem] font-semibold text-primary"
                            >
                              <Stethoscope aria-hidden="true" className="h-3.5 w-3.5" />
                              <span>{treatmentName}</span>
                            </span>
                          ))}
                        </div>
                        <p className="leading-6">
                          {appointment.additionalInfo ?? 'Sin notas adicionales.'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={classNames(
                          'inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
                          getStatusBadgeClasses(appointment.status),
                        )}
                      >
                        {getStatusLabel(appointment.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right sm:px-5">
                      {appointment.status === 'PROPUESTA' ||
                      appointment.status === 'REPROGRAMACION_PENDIENTE' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-primary ring-1 ring-slate-200 transition duration-200 hover:bg-slate-100"
                            type="button"
                            onClick={() => handleEditAppointment(appointment)}
                          >
                            <PencilLine aria-hidden="true" className="h-3.5 w-3.5" />
                            <span>{studentContent.appointmentsPage.actionLabels.edit}</span>
                          </button>
                          <button
                            className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition duration-200 hover:bg-rose-100"
                            type="button"
                            onClick={() => setAppointmentToCancel(appointment)}
                          >
                            <Ban aria-hidden="true" className="h-3.5 w-3.5" />
                            <span>{studentContent.appointmentsPage.actionLabels.cancel}</span>
                          </button>
                        </div>
                      ) : appointment.status === 'ACEPTADA' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition duration-200 hover:bg-sky-100"
                            type="button"
                            onClick={() => handleStatusChange(appointment.id, 'FINALIZADA')}
                          >
                            <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
                            <span>{studentContent.appointmentsPage.actionLabels.finalize}</span>
                          </button>
                          <button
                            className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition duration-200 hover:bg-rose-100"
                            type="button"
                            onClick={() => setAppointmentToCancel(appointment)}
                          >
                            <Ban aria-hidden="true" className="h-3.5 w-3.5" />
                            <span>{studentContent.appointmentsPage.actionLabels.cancel}</span>
                          </button>
                        </div>
                      ) : appointment.status === 'FINALIZADA' ? (
                        <div className="flex justify-end">
                          <button
                            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition duration-200 hover:bg-slate-200"
                            type="button"
                            onClick={() => setCommentsAppointment(appointment)}
                          >
                            <MessageSquare aria-hidden="true" className="h-3.5 w-3.5" />
                            <span>Ver comentarios</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-ink-muted">Sin acciones</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-8 text-center sm:px-5">
            <p className="text-sm font-medium text-ink-muted">
              {isLoading ? 'Cargando citas...' : studentContent.appointmentsPage.emptyState}
            </p>
          </div>
        )}
      </AdminPanelCard>
      {isAppointmentDialogOpen ? (
        <StudentAppointmentsDialogFrame
          description="Agenda una cita a partir de una solicitud aceptada, con sede, docente supervisor y tratamientos validos."
          onClose={closeAppointmentDialog}
          title={editingAppointmentId ? 'Editar cita' : 'Agendar cita'}
        >
          <div className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-2">
              <AdminDropdownField
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
                onChange={(value) => handleAppointmentFieldChange('requestId', value)}
              />
              <AdminDropdownField
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
                onChange={(value) => handleAppointmentFieldChange('siteId', value)}
              />
            </div>
            {selectedRequest ? (
              <SurfaceCard
                className="border border-slate-200/80 bg-slate-50 shadow-none"
                paddingClassName="p-3.5"
              >
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-ink">{selectedRequest.patientName}</p>
                  <p className="text-[0.82rem] text-ink-muted">
                    Motivo: {selectedRequest.reason ?? 'Sin motivo especificado.'}
                  </p>
                  <p className="text-[0.82rem] text-ink-muted">
                    Citas acumuladas en la relacion: {selectedRequest.appointmentsCount}
                  </p>
                </div>
              </SurfaceCard>
            ) : null}
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(10rem,0.8fr)_minmax(10rem,0.8fr)]">
              <AdminTextField
                error={appointmentErrors.startDate}
                icon={CalendarCheck2}
                id="student-appointment-date"
                label="Fecha de la cita"
                name="studentAppointmentDate"
                placeholder=""
                type="date"
                value={appointmentValues.startDate}
                onChange={(value) => handleAppointmentFieldChange('startDate', value)}
              />
              <AdminTimePickerField
                error={appointmentErrors.startTime}
                id="student-appointment-start-time"
                label="Hora de inicio"
                name="studentAppointmentStartTime"
                value={appointmentValues.startTime}
                onChange={(value) => handleAppointmentFieldChange('startTime', value)}
              />
              <AdminTimePickerField
                disabled={!appointmentValues.startTime}
                error={appointmentErrors.endTime}
                id="student-appointment-end-time"
                label="Hora de finalizacion"
                min={appointmentValues.startTime || undefined}
                name="studentAppointmentEndTime"
                value={appointmentValues.endTime}
                onChange={(value) => handleAppointmentFieldChange('endTime', value)}
              />
            </div>
            <AdminDropdownField
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
              onChange={(value) => handleAppointmentFieldChange('supervisorId', value)}
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-[0.88rem] font-semibold text-ink">Tratamientos asociados</h3>
                  <p className="text-[0.8rem] text-ink-muted">
                    Selecciona uno o varios tratamientos activos para la cita.
                  </p>
                </div>
                {appointmentErrors.treatmentIds ? (
                  <p className="text-[0.75rem] font-medium text-rose-700">
                    {appointmentErrors.treatmentIds}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {activeTreatments.map((treatment) => {
                  const isSelected = appointmentValues.treatmentIds.includes(treatment.treatmentTypeId);

                  return (
                    <button
                      key={treatment.id}
                      className={classNames(
                        'rounded-[1.15rem] border px-3 py-3 text-left transition duration-200',
                        isSelected
                          ? 'border-primary/35 bg-primary/[0.08] shadow-[0_18px_36px_-30px_rgba(22,78,99,0.8)]'
                          : 'border-slate-200/80 bg-white hover:border-primary/20 hover:bg-slate-50',
                      )}
                      type="button"
                      onClick={() => handleTreatmentToggle(treatment.treatmentTypeId)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-[0.86rem] font-semibold text-ink">{treatment.name}</p>
                          <p className="text-[0.78rem] leading-5 text-ink-muted">
                            {treatment.description}
                          </p>
                        </div>
                        <span
                          className={classNames(
                            'inline-flex h-5 w-5 items-center justify-center rounded-full text-[0.72rem] font-bold',
                            isSelected
                              ? 'bg-primary text-white'
                              : 'bg-slate-100 text-slate-400',
                          )}
                        >
                          <Check aria-hidden="true" className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[0.84rem] font-semibold text-ink" htmlFor="student-appointment-additional-info">
                Informacion adicional
              </label>
              <textarea
                className="min-h-[5rem] w-full rounded-[1.1rem] border border-slate-200 bg-surface px-3 py-2.25 text-[0.84rem] text-ink placeholder:text-ghost/80 transition duration-300 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                id="student-appointment-additional-info"
                placeholder="Registra observaciones operativas o notas de preparacion para la cita."
                value={appointmentValues.additionalInfo}
                onChange={(event) =>
                  handleAppointmentFieldChange('additionalInfo', event.target.value)
                }
              />
            </div>
            {appointmentApiError ? (
              <div className="rounded-[1.1rem] border border-rose-200 bg-rose-50/90 px-3.5 py-3 text-sm font-medium text-rose-800" role="alert">
                {appointmentApiError}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-end gap-2.5">
              <button
                className="inline-flex items-center justify-center rounded-full bg-slate-100 px-4 py-2.5 text-sm font-semibold text-ink-muted transition duration-200 hover:bg-slate-200"
                type="button"
                onClick={closeAppointmentDialog}
              >
                Cancelar
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110"
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
              <p className="text-sm font-medium text-amber-700">
                Necesitas una solicitud aceptada para poder programar nuevas citas.
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
          reviews={reviews.filter((r) => r.appointmentId === commentsAppointment.id)}
          onClose={() => setCommentsAppointment(null)}
        />
      ) : null}
    </div>
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
            <p className="mt-0.5 text-sm font-semibold text-ink">{appointment.patientName}</p>
            <p className="text-xs text-ink-muted">{appointment.appointmentType}</p>
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
                    <p className="text-xs font-semibold text-ink">{review.patientName}</p>
                    <p className="text-[0.68rem] text-ink-muted">
                      {new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(review.createdAt))}
                    </p>
                  </div>
                  {review.comment ? (
                    <p className="text-sm leading-6 text-ink-muted">{review.comment}</p>
                  ) : (
                    <p className="text-sm italic text-ink-muted/70">Sin comentario escrito.</p>
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
