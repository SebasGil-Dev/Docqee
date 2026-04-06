import {
  CalendarCheck2,
  Check,
  Clock3,
  MapPin,
  Search,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { studentContent } from '@/content/studentContent';
import type { StudentAgendaAppointmentStatus } from '@/content/types';
import { classNames } from '@/lib/classNames';
import { useStudentModuleStore } from '@/lib/studentModuleStore';

type AppointmentStatusFilter = StudentAgendaAppointmentStatus | 'all';

const appointmentStatusOptions: Array<{ label: string; value: AppointmentStatusFilter }> = [
  { label: 'Todas', value: 'all' },
  { label: 'Pendiente', value: 'PROPUESTA' },
  { label: 'Aceptada', value: 'ACEPTADA' },
  { label: 'Reprogramacion', value: 'REPROGRAMACION_PENDIENTE' },
  { label: 'Cancelada', value: 'CANCELADA' },
  { label: 'Finalizada', value: 'FINALIZADA' },
];

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
      return 'Pendiente';
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

export function StudentAppointmentsPage() {
  const { appointments, errorMessage, isLoading } = useStudentModuleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatusFilter>('all');
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
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
  const reprogrammingCount = useMemo(
    () =>
      appointments.filter((appointment) => appointment.status === 'REPROGRAMACION_PENDIENTE')
        .length,
    [appointments],
  );
  const filteredAppointments = useMemo(
    () =>
      appointments.filter((appointment) => {
        const matchesSearch =
          appointment.patientName.toLowerCase().includes(normalizedSearch) ||
          appointment.siteName.toLowerCase().includes(normalizedSearch) ||
          appointment.city.toLowerCase().includes(normalizedSearch) ||
          appointment.appointmentType.toLowerCase().includes(normalizedSearch) ||
          (appointment.additionalInfo ?? '').toLowerCase().includes(normalizedSearch);

        return matchesSearch && (statusFilter === 'all' || appointment.status === statusFilter);
      }),
    [appointments, normalizedSearch, statusFilter],
  );

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

  return (
    <div className="mx-auto flex h-full max-w-[88rem] min-h-0 flex-col gap-3 overflow-hidden 2xl:max-w-[96rem]">
      <Seo
        description={studentContent.appointmentsPage.meta.description}
        noIndex
        title={studentContent.appointmentsPage.meta.title}
      />
      <AdminPageHeader
        className="gap-2.5"
        description={studentContent.appointmentsPage.description}
        descriptionClassName="text-sm leading-5 sm:text-[0.95rem]"
        title={studentContent.appointmentsPage.title}
        titleClassName="text-[1.85rem] sm:text-[2.15rem]"
      />
      {errorMessage ? (
        <SurfaceCard
          className="border border-rose-200 bg-rose-50/90 text-sm font-medium text-rose-800"
          paddingClassName="p-3.5"
        >
          <p role="alert">{errorMessage}</p>
        </SurfaceCard>
      ) : null}
      <div className="grid gap-3 md:grid-cols-3">
        <SurfaceCard className="min-w-0 overflow-hidden bg-brand-gradient text-white" paddingClassName="p-0">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-white/12 text-white">
              <Clock3 aria-hidden="true" className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="font-headline text-[1.45rem] font-extrabold tracking-tight text-white">
                {pendingCount}
              </p>
              <p className="text-sm font-semibold text-white/90">Por confirmar</p>
            </div>
          </div>
        </SurfaceCard>
        <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-0">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-emerald-50 text-emerald-700">
              <CalendarCheck2 aria-hidden="true" className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="font-headline text-[1.45rem] font-extrabold tracking-tight text-ink">
                {acceptedCount}
              </p>
              <p className="text-sm font-semibold text-ink-muted">Aceptadas</p>
            </div>
          </div>
        </SurfaceCard>
        <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-0">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-violet-50 text-violet-700">
              <CalendarCheck2 aria-hidden="true" className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="font-headline text-[1.45rem] font-extrabold tracking-tight text-ink">
                {reprogrammingCount}
              </p>
              <p className="text-sm font-semibold text-ink-muted">En reprogramacion</p>
            </div>
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
                  statusFilter === 'all'
                    ? 'border-slate-200/90 hover:border-primary/30 hover:bg-white'
                    : 'border-primary/25 bg-primary/[0.08] text-primary hover:bg-primary/[0.12]',
                )}
                type="button"
                onClick={() => setIsStatusMenuOpen((currentValue) => !currentValue)}
              >
                <SlidersHorizontal aria-hidden="true" className="h-[1.05rem] w-[1.05rem]" />
                {statusFilter !== 'all' ? (
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
                </div>
              ) : null}
            </div>
          </div>
        </div>
        {filteredAppointments.length > 0 ? (
          <div className="admin-scrollbar min-h-0 flex-1 overflow-x-auto overflow-y-auto">
            <table className="min-w-[64rem] lg:min-w-full">
              <thead className="sticky top-0 z-10 bg-slate-100 text-left">
                <tr className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-ink-muted">
                  <th className="px-4 py-3 sm:px-5">Paciente</th>
                  <th className="px-4 py-3">Detalle de la cita</th>
                  <th className="px-4 py-3">Estado</th>
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
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-ink">{appointment.patientName}</p>
                        <p className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                          <UserRound aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
                          Paciente asignado
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="max-w-[30rem] space-y-1.5 text-sm text-ink-muted 2xl:max-w-[36rem]">
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
    </div>
  );
}
