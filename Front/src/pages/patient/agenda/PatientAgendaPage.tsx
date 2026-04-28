import { CalendarCheck2 } from 'lucide-react';
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
  StudentAgendaAppointment,
} from '@/content/types';
import { usePatientModuleStore } from '@/lib/patientModuleStore';
import { StudentAgendaCalendar } from '@/pages/student/agenda/StudentAgendaCalendar';

function getAgendaStatus(appointment: PatientAppointment): StudentAgendaAppointment['status'] {
  if (appointment.isRescheduleProposal && appointment.status === 'PROPUESTA') {
    return 'REPROGRAMACION_PENDIENTE';
  }

  return appointment.status === 'RECHAZADA' ? 'CANCELADA' : appointment.status;
}

export function PatientAgendaPage() {
  const { appointments, errorMessage, isLoading } = usePatientModuleStore();
  const calendarAppointments = useMemo<StudentAgendaAppointment[]>(
    () =>
      appointments.map((appointment) => ({
        additionalInfo: appointment.additionalInfo,
        appointmentTypeId: appointment.id,
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
        myRating: appointment.myRating,
        status: getAgendaStatus(appointment),
        supervisorId: appointment.id,
        supervisorName: appointment.teacherName,
        treatmentIds: [],
        treatmentNames: [],
      })),
    [appointments],
  );

  return (
    <div className="student-page-compact flex h-full w-full min-h-0 flex-col gap-1.5 overflow-hidden sm:gap-2">
      <Seo
        description={patientContent.agendaPage.meta.description}
        noIndex
        title={patientContent.agendaPage.meta.title}
      />
      <div className="relative">
        <AdminPageHeader
          className="gap-1.5 sm:gap-2"
          description={patientContent.agendaPage.description}
          descriptionClassName="text-[0.78rem] leading-4 sm:text-[0.9rem] sm:leading-5"
          headingAlign="center"
          title={patientContent.agendaPage.title}
          titleClassName="text-[1.45rem] sm:text-[1.75rem]"
        />
        <Link
          className="mt-1.5 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full bg-brand-gradient px-3 text-[0.72rem] font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 sm:absolute sm:right-0 sm:top-1/2 sm:mt-0 sm:w-auto sm:-translate-y-1/2"
          to={ROUTES.patientAppointments}
        >
          <CalendarCheck2 aria-hidden="true" className="h-3.5 w-3.5" />
          <span>Ver citas</span>
        </Link>
      </div>
      {errorMessage ? (
        <SurfaceCard
          className="shrink-0 border border-rose-200 bg-rose-50/90 text-[0.78rem] font-semibold text-rose-800 sm:text-sm"
          paddingClassName="p-2.5 sm:p-3"
        >
          <p role="alert">{errorMessage}</p>
        </SurfaceCard>
      ) : null}
      <AdminPanelCard
        className="flex flex-1 flex-col"
        panelClassName="bg-[#f4f8ff]"
        shellPaddingClassName="p-0.5 sm:p-1"
      >
        <div className="min-h-0 flex flex-1 overflow-hidden px-1.5 py-1.5 sm:px-2 sm:py-2">
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
        <p className="shrink-0 pb-1 text-center text-[0.78rem] font-semibold text-ink-muted sm:text-sm">
          Cargando la agenda del paciente...
        </p>
      ) : null}
    </div>
  );
}
