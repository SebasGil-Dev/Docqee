import { CalendarCheck2, CheckCircle2, Clock3 } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { ROUTES } from '@/constants/routes';
import { patientContent } from '@/content/patientContent';
import type {
  PatientAppointmentStatus,
  StudentAgendaAppointment,
} from '@/content/types';
import { usePatientModuleStore } from '@/lib/patientModuleStore';
import { StudentAgendaCalendar } from '@/pages/student/agenda/StudentAgendaCalendar';

function getAgendaStatus(status: PatientAppointmentStatus) {
  return status === 'RECHAZADA' ? 'CANCELADA' : status;
}

export function PatientAgendaPage() {
  const { appointments, errorMessage, isLoading } = usePatientModuleStore();
  const calendarAppointments = useMemo<StudentAgendaAppointment[]>(
    () =>
      appointments.map((appointment) => ({
        additionalInfo: appointment.additionalInfo,
        appointmentType: appointment.appointmentType,
        city: appointment.city,
        createdAt: appointment.createdAt,
        endAt: appointment.endAt,
        id: appointment.id,
        patientName: appointment.studentName,
        requestId: appointment.id,
        respondedAt: appointment.respondedAt,
        siteId: appointment.id,
        siteName: appointment.siteName,
        startAt: appointment.startAt,
        myRating: null,
        status: getAgendaStatus(appointment.status),
        supervisorId: appointment.id,
        supervisorName: appointment.teacherName,
        treatmentIds: [],
        treatmentNames: [],
      })),
    [appointments],
  );
  const proposalCount = appointments.filter(
    (appointment) => appointment.status === 'PROPUESTA',
  ).length;
  const confirmedCount = appointments.filter(
    (appointment) => appointment.status === 'ACEPTADA',
  ).length;
  const completedCount = appointments.filter(
    (appointment) => appointment.status === 'FINALIZADA',
  ).length;

  return (
    <div className="flex h-full w-full min-h-0 flex-col gap-4 overflow-hidden">
      <Seo
        description={patientContent.agendaPage.meta.description}
        noIndex
        title={patientContent.agendaPage.meta.title}
      />
      <AdminPageHeader
        action={
          <Link
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[0.82rem] font-semibold text-primary transition duration-300 hover:bg-slate-50"
            to={ROUTES.patientAppointments}
          >
            <CalendarCheck2 aria-hidden="true" className="h-4 w-4" />
            <span>Ver citas</span>
          </Link>
        }
        description={patientContent.agendaPage.description}
        title={patientContent.agendaPage.title}
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
        <SurfaceCard
          className="min-w-0 overflow-hidden bg-brand-gradient text-white"
          paddingClassName="p-0"
        >
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-white/12 text-white ring-1 ring-white/18">
              <Clock3 aria-hidden="true" className="h-4.5 w-4.5" />
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
          <div className="flex items-center gap-3 px-4 py-3.5">
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
        <SurfaceCard
          className="border border-slate-200/80 bg-white shadow-none"
          paddingClassName="p-0"
        >
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-primary/10 text-primary ring-1 ring-primary/10">
              <CalendarCheck2 aria-hidden="true" className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="font-headline text-[1.55rem] font-extrabold tracking-tight text-ink">
                {completedCount}
              </p>
              <p className="text-sm font-semibold text-ink-muted">Citas finalizadas</p>
            </div>
          </div>
        </SurfaceCard>
      </div>
      <AdminPanelCard className="flex-1" panelClassName="bg-[#f4f8ff]">
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <StudentAgendaCalendar
            appointments={calendarAppointments}
            emptyDayMessage="No hay citas visibles para este dia."
            emptyWeekMessage="Sin citas"
            scheduleBlocks={[]}
            showBlockLegend={false}
          />
        </div>
      </AdminPanelCard>
      {isLoading ? (
        <p className="pb-2 text-sm font-medium text-ink-muted">
          Cargando la agenda del paciente...
        </p>
      ) : null}
    </div>
  );
}
