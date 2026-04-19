import {
  Ban,
  CalendarCheck2,
  Check,
  CheckCircle2,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { PatientRatingModal } from '@/components/patient/PatientRatingModal';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { patientContent } from '@/content/patientContent';
import type { PatientAppointmentStatus } from '@/content/types';
import { classNames } from '@/lib/classNames';
import { usePatientModuleStore } from '@/lib/patientModuleStore';

type AppointmentStatusFilter = PatientAppointmentStatus | 'all';
type AppointmentSortOrder = 'arrival' | 'proximity';

const appointmentStatusOptions: Array<{ label: string; value: AppointmentStatusFilter }> = [
  { label: 'Todas', value: 'all' },
  { label: 'Propuesta', value: 'PROPUESTA' },
  { label: 'Aceptada', value: 'ACEPTADA' },
  { label: 'Rechazada', value: 'RECHAZADA' },
  { label: 'Cancelada', value: 'CANCELADA' },
  { label: 'Finalizada', value: 'FINALIZADA' },
];

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
      return 'bg-primary/10 text-primary ring-primary/15';
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

type RatingTarget = { appointmentId: string; studentName: string };

export function PatientAppointmentsPage() {
  const { appointments, errorMessage, isLoading, submitAppointmentReview, updateAppointmentStatus } =
    usePatientModuleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<AppointmentSortOrder>('arrival');
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<RatingTarget | null>(null);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const proposalCount = useMemo(
    () => appointments.filter((appointment) => appointment.status === 'PROPUESTA').length,
    [appointments],
  );
  const confirmedCount = useMemo(
    () => appointments.filter((appointment) => appointment.status === 'ACEPTADA').length,
    [appointments],
  );
  const filteredAppointments = useMemo(() => {
    const filtered = appointments.filter((appointment) => {
      const matchesSearch =
        appointment.studentName.toLowerCase().includes(normalizedSearch) ||
        appointment.universityName.toLowerCase().includes(normalizedSearch) ||
        appointment.siteName.toLowerCase().includes(normalizedSearch) ||
        appointment.appointmentType.toLowerCase().includes(normalizedSearch);

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
    appointmentId: string,
    status: PatientAppointmentStatus,
  ) => {
    void (async () => {
      await updateAppointmentStatus(appointmentId, status);
    })();
  };

  const handleSubmitRating = (appointmentId: string, rating: number, comment?: string) => {
    void (async () => {
      setIsSubmittingRating(true);
      const success = await submitAppointmentReview(appointmentId, rating, comment);
      setIsSubmittingRating(false);
      if (success) setRatingTarget(null);
    })();
  };

  return (
    <div className="flex h-full w-full min-h-0 flex-col gap-4 overflow-hidden">
      <Seo
        description={patientContent.appointmentsPage.meta.description}
        noIndex
        title={patientContent.appointmentsPage.meta.title}
      />
      <AdminPageHeader
        description={patientContent.appointmentsPage.description}
        title={patientContent.appointmentsPage.title}
      />
      {errorMessage ? (
        <SurfaceCard
          className="border border-rose-200 bg-rose-50/90 text-sm font-medium text-rose-800"
          paddingClassName="p-3.5"
        >
          <p role="alert">{errorMessage}</p>
        </SurfaceCard>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <SurfaceCard
          className="min-w-0 overflow-hidden bg-brand-gradient text-white"
          paddingClassName="p-0"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-white/12 text-white ring-1 ring-white/18">
              <CalendarCheck2 aria-hidden="true" className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="font-headline text-[1.55rem] font-extrabold tracking-tight text-white">
                {proposalCount}
              </p>
              <p className="text-sm font-semibold text-white/90">Propuestas pendientes</p>
            </div>
          </div>
        </SurfaceCard>
        <SurfaceCard
          className="border border-slate-200/80 bg-white shadow-none"
          paddingClassName="p-0"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-primary/10 text-primary ring-1 ring-primary/10">
              <CheckCircle2 aria-hidden="true" className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="font-headline text-[1.55rem] font-extrabold tracking-tight text-ink">
                {confirmedCount}
              </p>
              <p className="text-sm font-semibold text-ink-muted">Citas confirmadas</p>
            </div>
          </div>
        </SurfaceCard>
      </div>
      <AdminPanelCard className="flex-1" panelClassName="bg-[#f4f8ff]">
        <div className="border-b border-slate-200/80 px-4 py-4 sm:px-5 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label
              className="relative min-w-0 flex-1 sm:max-w-[32rem] xl:max-w-[36rem]"
              htmlFor="patient-appointment-search"
            >
              <span className="sr-only">{patientContent.appointmentsPage.searchLabel}</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost"
              />
              <input
                className="h-11 w-full rounded-full border border-slate-200/90 bg-white/98 py-0 pl-11 pr-4 text-sm text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 placeholder:text-ghost/80 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
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
        {filteredAppointments.length > 0 ? (
          <div className="admin-scrollbar min-h-0 flex-1 overflow-x-auto overflow-y-auto">
            <table className="min-w-[68rem] lg:min-w-full">
              <thead className="sticky top-0 z-10 bg-slate-100 text-left">
                <tr className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-ink-muted">
                  <th className="px-4 py-3 sm:px-5">Estudiante</th>
                  <th className="px-4 py-3">Detalle de la cita</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right sm:px-5">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 bg-white">
                {filteredAppointments.map((appointment) => (
                  <tr
                    key={appointment.id}
                    className="align-top"
                    data-testid={`patient-appointment-row-${appointment.id}`}
                  >
                    <td className="px-4 py-3.5 sm:px-5">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-ink">{appointment.studentName}</p>
                        <p className="text-xs text-ink-muted">{appointment.universityName}</p>
                        <p className="text-xs text-ink-muted">Docente: {appointment.teacherName}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="max-w-[28rem] space-y-1.5 text-sm text-ink-muted 2xl:max-w-[34rem]">
                        <p className="font-semibold text-ink">{appointment.appointmentType}</p>
                        <p>{formatDateTimeRange(appointment.startAt, appointment.endAt)}</p>
                        <p className="inline-flex items-center gap-1.5">
                          <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
                          <span>
                            {appointment.siteName} - {appointment.city}
                          </span>
                        </p>
                        {appointment.additionalInfo ? (
                          <p className="leading-6">{appointment.additionalInfo}</p>
                        ) : null}
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
                      {appointment.status === 'PROPUESTA' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition duration-200 hover:bg-emerald-100"
                            type="button"
                            onClick={() =>
                              handleAppointmentStatusChange(appointment.id, 'ACEPTADA')
                            }
                          >
                            <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
                            <span>{patientContent.appointmentsPage.actionLabels.accept}</span>
                          </button>
                          <button
                            className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition duration-200 hover:bg-rose-100"
                            type="button"
                            onClick={() =>
                              handleAppointmentStatusChange(appointment.id, 'RECHAZADA')
                            }
                          >
                            <XCircle aria-hidden="true" className="h-3.5 w-3.5" />
                            <span>{patientContent.appointmentsPage.actionLabels.reject}</span>
                          </button>
                        </div>
                      ) : appointment.status === 'ACEPTADA' ? (
                        <div className="flex justify-end">
                          <button
                            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition duration-200 hover:bg-slate-200"
                            type="button"
                            onClick={() =>
                              handleAppointmentStatusChange(appointment.id, 'CANCELADA')
                            }
                          >
                            <Ban aria-hidden="true" className="h-3.5 w-3.5" />
                            <span>{patientContent.appointmentsPage.actionLabels.cancel}</span>
                          </button>
                        </div>
                      ) : appointment.status === 'FINALIZADA' ? (
                        <div className="flex justify-end">
                          {appointment.myRating !== null ? (
                            <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 ring-1 ring-amber-200">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  aria-hidden="true"
                                  className={classNames(
                                    'h-3 w-3',
                                    star <= appointment.myRating!
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'fill-amber-100 text-amber-200',
                                  )}
                                />
                              ))}
                            </div>
                          ) : (
                            <button
                              className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 transition duration-200 hover:bg-amber-100"
                              type="button"
                              onClick={() =>
                                setRatingTarget({
                                  appointmentId: appointment.id,
                                  studentName: appointment.studentName,
                                })
                              }
                            >
                              <Star aria-hidden="true" className="h-3.5 w-3.5" />
                              <span>Valorar</span>
                            </button>
                          )}
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
              {isLoading ? 'Cargando citas...' : patientContent.appointmentsPage.emptyState}
            </p>
          </div>
        )}
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
