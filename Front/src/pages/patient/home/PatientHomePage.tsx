import {
  ArrowRight,
  CalendarCheck2,
  MessageSquareMore,
  Search,
  UserRound,
} from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { ROUTES } from '@/constants/routes';
import { patientContent } from '@/content/patientContent';
import type {
  PatientAppointment,
  PatientRequest,
  PatientRequestStatus,
  PatientStudentDirectoryItem,
} from '@/content/types';
import { formatDisplayName } from '@/lib/formatDisplayName';
import { getOptimizedAvatarUrl } from '@/lib/imageOptimization';
import { usePatientModuleStore } from '@/lib/patientModuleStore';

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function getAppointmentStatusLabel(status: PatientAppointment['status']) {
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

function getAppointmentStatusClasses(status: PatientAppointment['status']) {
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

function getRequestStatusLabel(status: PatientRequestStatus) {
  switch (status) {
    case 'ACEPTADA':
      return 'Aceptada';
    case 'RECHAZADA':
      return 'Rechazada';
    case 'CERRADA':
      return 'Cerrada';
    case 'CANCELADA':
      return 'Cancelada';
    default:
      return 'Pendiente';
  }
}

function getRequestStatusClasses(status: PatientRequestStatus) {
  switch (status) {
    case 'ACEPTADA':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'RECHAZADA':
      return 'bg-rose-50 text-rose-700 ring-rose-200';
    case 'CERRADA':
      return 'bg-sky-50 text-sky-700 ring-sky-200';
    case 'CANCELADA':
      return 'bg-slate-100 text-slate-700 ring-slate-200';
    default:
      return 'bg-amber-50 text-amber-700 ring-amber-200';
  }
}

function getStudentAvailabilityLabel(student: PatientStudentDirectoryItem) {
  return student.availabilityStatus === 'available'
    ? 'Disponible'
    : 'Disponibilidad limitada';
}

function getStudentAvailabilityClasses(student: PatientStudentDirectoryItem) {
  return student.availabilityStatus === 'available'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : 'bg-amber-50 text-amber-700 ring-amber-200';
}

function isUpcomingAppointment(appointment: PatientAppointment) {
  if (
    appointment.status === 'RECHAZADA' ||
    appointment.status === 'CANCELADA' ||
    appointment.status === 'FINALIZADA'
  ) {
    return false;
  }

  return new Date(appointment.startAt).getTime() >= Date.now();
}

export function PatientHomePage() {
  const { appointments, conversations, errorMessage, isLoading, profile, requests, students } =
    usePatientModuleStore();
  const patientName = formatDisplayName(
    `${profile.firstName || patientContent.shell.adminUser.firstName} ${
      profile.lastName || patientContent.shell.adminUser.lastName
    }`,
  );
  const optimizedAvatarSrc = getOptimizedAvatarUrl(profile.avatarSrc, 128);
  const upcomingAppointments = useMemo(
    () =>
      [...appointments]
        .filter(isUpcomingAppointment)
        .sort(
          (firstAppointment, secondAppointment) =>
            new Date(firstAppointment.startAt).getTime() -
            new Date(secondAppointment.startAt).getTime(),
        ),
    [appointments],
  );
  const recentRequests = useMemo(
    () =>
      [...requests]
        .sort(
          (firstRequest, secondRequest) =>
            new Date(secondRequest.sentAt).getTime() -
            new Date(firstRequest.sentAt).getTime(),
        )
        .slice(0, 3),
    [requests],
  );
  const suggestedStudents = useMemo(
    () =>
      [...students]
        .sort((firstStudent, secondStudent) => {
          if (firstStudent.availabilityStatus !== secondStudent.availabilityStatus) {
            return firstStudent.availabilityStatus === 'available' ? -1 : 1;
          }

          return `${firstStudent.firstName} ${firstStudent.lastName}`.localeCompare(
            `${secondStudent.firstName} ${secondStudent.lastName}`,
            'es-CO',
          );
        })
        .slice(0, 4),
    [students],
  );
  const activeRequestCount = requests.filter(
    (request) => request.status === 'PENDIENTE' || request.status === 'ACEPTADA',
  ).length;
  const activeConversationCount = conversations.filter(
    (conversation) => conversation.status === 'ACTIVA',
  ).length;
  const availableStudentsCount = students.filter(
    (student) => student.availabilityStatus === 'available',
  ).length;

  return (
    <div className="mx-auto flex h-full max-w-[90rem] min-h-0 flex-col gap-4 overflow-hidden 2xl:max-w-[98rem]">
      <Seo
        description={patientContent.homePage.meta.description}
        noIndex
        title={patientContent.homePage.meta.title}
      />
      <AdminPageHeader
        action={
          <Link
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-[0.82rem] font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110"
            to={ROUTES.patientSearchStudents}
          >
            <Search aria-hidden="true" className="h-4 w-4" />
            <span>{patientContent.homePage.ctaLabel}</span>
          </Link>
        }
        description={patientContent.homePage.description}
        title={patientContent.homePage.title}
      />
      {errorMessage ? (
        <SurfaceCard
          className="border border-rose-200 bg-rose-50/90 text-sm font-medium text-rose-800"
          paddingClassName="p-3.5"
        >
          <p role="alert">{errorMessage}</p>
        </SurfaceCard>
      ) : null}
      <SurfaceCard
        className="overflow-hidden bg-brand-gradient text-white"
        paddingClassName="p-0"
      >
        <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {optimizedAvatarSrc ? (
              <img
                alt={patientName}
                className="h-14 w-14 rounded-full border border-white/20 object-cover shadow-[0_18px_36px_-24px_rgba(15,23,42,0.55)]"
                decoding="async"
                src={optimizedAvatarSrc}
              />
            ) : (
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/14 text-sm font-extrabold uppercase tracking-[0.12em] text-white">
                {`${patientName.charAt(0)}${patientName.split(' ')[1]?.charAt(0) ?? ''}`}
              </span>
            )}
            <div className="min-w-0 space-y-1">
              <h1 className="truncate font-headline text-[1.3rem] font-extrabold tracking-tight text-white sm:text-[1.55rem]">
                Bienvenido, {patientName}
              </h1>
              <p className="text-sm text-white/85">
                {profile.city && profile.locality
                  ? `${formatDisplayName(profile.city)} · ${formatDisplayName(profile.locality)}`
                  : 'Tu espacio para coordinar solicitudes, citas y seguimiento.'}
              </p>
            </div>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-3 lg:min-w-[33rem]">
            <div className="rounded-[1.3rem] bg-white/12 px-4 py-3.5 ring-1 ring-white/15">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white/70">
                Solicitudes activas
              </p>
              <p className="mt-2 font-headline text-[1.9rem] font-extrabold tracking-tight text-white">
                {activeRequestCount}
              </p>
            </div>
            <div className="rounded-[1.3rem] bg-white/12 px-4 py-3.5 ring-1 ring-white/15">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white/70">
                Chats activos
              </p>
              <p className="mt-2 font-headline text-[1.9rem] font-extrabold tracking-tight text-white">
                {activeConversationCount}
              </p>
            </div>
            <div className="rounded-[1.3rem] bg-white/12 px-4 py-3.5 ring-1 ring-white/15">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white/70">
                Estudiantes disponibles
              </p>
              <p className="mt-2 font-headline text-[1.9rem] font-extrabold tracking-tight text-white">
                {availableStudentsCount}
              </p>
            </div>
          </div>
        </div>
      </SurfaceCard>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-[1rem] bg-primary/10 text-primary ring-1 ring-primary/10">
                  <CalendarCheck2 aria-hidden="true" className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    Proximas citas
                  </p>
                  <p className="font-headline text-[1.45rem] font-extrabold tracking-tight text-ink">
                    {upcomingAppointments.length}
                  </p>
                </div>
              </div>
            </SurfaceCard>
            <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-[1rem] bg-primary/10 text-primary ring-1 ring-primary/10">
                  <MessageSquareMore aria-hidden="true" className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    Mensajes pendientes
                  </p>
                  <p className="font-headline text-[1.45rem] font-extrabold tracking-tight text-ink">
                    {conversations.reduce(
                      (total, conversation) => total + conversation.unreadCount,
                      0,
                    )}
                  </p>
                </div>
              </div>
            </SurfaceCard>
          </div>
          <AdminPanelCard panelClassName="bg-white">
            <div className="border-b border-slate-200/80 px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-primary/75">
                    Seguimiento cercano
                  </p>
                  <h2 className="font-headline text-[1.2rem] font-extrabold tracking-tight text-ink">
                    Proximas citas
                  </h2>
                </div>
                <Link
                  className="inline-flex items-center gap-2 text-[0.8rem] font-semibold text-primary transition duration-200 hover:text-primary/80"
                  to={ROUTES.patientAppointments}
                >
                  <span>Ver citas</span>
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="grid gap-3 px-4 py-4 sm:px-5 sm:py-5">
              {upcomingAppointments.length > 0 ? (
                upcomingAppointments.slice(0, 3).map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex flex-col gap-2 rounded-[1.15rem] border border-slate-200/80 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-[0.88rem] font-semibold text-ink">
                        {appointment.studentName}
                      </p>
                      <p className="truncate text-[0.8rem] text-ink-muted">
                        {appointment.appointmentType} · {appointment.siteName}
                      </p>
                      <p className="text-[0.76rem] font-medium text-ink-muted">
                        {formatDateLabel(appointment.startAt)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ring-1 ${getAppointmentStatusClasses(appointment.status)}`}
                    >
                      {getAppointmentStatusLabel(appointment.status)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-ink-muted">
                  Aun no tienes citas proximas para este momento.
                </p>
              )}
            </div>
          </AdminPanelCard>
        </div>
        <div className="space-y-4">
          <AdminPanelCard panelClassName="bg-white">
            <div className="border-b border-slate-200/80 px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-primary/75">
                    Tus movimientos
                  </p>
                  <h2 className="font-headline text-[1.2rem] font-extrabold tracking-tight text-ink">
                    Solicitudes recientes
                  </h2>
                </div>
                <Link
                  className="inline-flex items-center gap-2 text-[0.8rem] font-semibold text-primary transition duration-200 hover:text-primary/80"
                  to={ROUTES.patientRequests}
                >
                  <span>Ver solicitudes</span>
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="grid gap-3 px-4 py-4 sm:px-5 sm:py-5">
              {recentRequests.length > 0 ? (
                recentRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex flex-col gap-2 rounded-[1.15rem] border border-slate-200/80 bg-white px-4 py-3 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.38)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-[0.88rem] font-semibold text-ink">
                          {request.studentName}
                        </p>
                        <p className="truncate text-[0.8rem] text-ink-muted">
                          {request.universityName}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ring-1 ${getRequestStatusClasses(request.status)}`}
                      >
                        {getRequestStatusLabel(request.status)}
                      </span>
                    </div>
                    <p className="text-[0.76rem] text-ink-muted">
                      {formatDateLabel(request.sentAt)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-ink-muted">
                  Aun no tienes solicitudes registradas.
                </p>
              )}
            </div>
          </AdminPanelCard>
          <AdminPanelCard panelClassName="bg-white">
            <div className="border-b border-slate-200/80 px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-primary/75">
                    Para continuar
                  </p>
                  <h2 className="font-headline text-[1.2rem] font-extrabold tracking-tight text-ink">
                    Estudiantes sugeridos
                  </h2>
                </div>
                <Link
                  className="inline-flex items-center gap-2 text-[0.8rem] font-semibold text-primary transition duration-200 hover:text-primary/80"
                  to={ROUTES.patientSearchStudents}
                >
                  <span>Explorar</span>
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="grid gap-3 px-4 py-4 sm:px-5 sm:py-5">
              {suggestedStudents.length > 0 ? (
                suggestedStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex flex-col gap-2 rounded-[1.15rem] border border-slate-200/80 bg-slate-50/70 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-[0.88rem] font-semibold text-ink">
                          {formatDisplayName(`${student.firstName} ${student.lastName}`)}
                        </p>
                        <p className="truncate text-[0.8rem] text-ink-muted">
                          {student.universityName}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ring-1 ${getStudentAvailabilityClasses(student)}`}
                      >
                        {getStudentAvailabilityLabel(student)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[0.76rem] text-ink-muted">
                      <span className="inline-flex items-center gap-1">
                        <UserRound aria-hidden="true" className="h-3.5 w-3.5" />
                        Semestre {student.semester}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Search aria-hidden="true" className="h-3.5 w-3.5" />
                        {student.practiceSite}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-ink-muted">
                  Aun no encontramos estudiantes disponibles para sugerirte.
                </p>
              )}
            </div>
          </AdminPanelCard>
        </div>
      </div>
      {isLoading ? (
        <p className="pb-2 text-sm font-medium text-ink-muted">
          Cargando la informacion principal del paciente...
        </p>
      ) : null}
    </div>
  );
}
