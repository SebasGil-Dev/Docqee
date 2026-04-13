import { useMemo } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/app/providers/AuthProvider';
import {
  AdminShell,
  type AdminShellNotification,
} from '@/components/admin/AdminShell';
import { ROUTES } from '@/constants/routes';
import { studentContent } from '@/content/studentContent';
import { IS_TEST_MODE } from '@/lib/apiClient';
import {
  getDefaultRouteForRole,
  shouldRequireFirstLoginPasswordChange,
} from '@/lib/authRouting';
import { useStudentModuleStore } from '@/lib/studentModuleStore';

function buildStudentHeaderNotifications(
  requests: ReturnType<typeof useStudentModuleStore>['requests'],
  appointments: ReturnType<typeof useStudentModuleStore>['appointments'],
) {
  const requestNotifications: AdminShellNotification[] = requests
    .filter((request) => request.status === 'PENDIENTE')
    .map((request) => ({
      createdAt: request.sentAt,
      description: request.reason
        ? `${request.patientCity} - ${request.reason}`
        : `${request.patientCity} - Tienes una nueva solicitud pendiente por revisar.`,
      id: `student-request-${request.id}-${request.status}`,
      title: `Nueva solicitud de ${request.patientName}`,
      to: ROUTES.studentRequests,
      tone: 'warning',
    }));

  const appointmentNotifications: AdminShellNotification[] = appointments.flatMap(
    (appointment) => {
      if (appointment.status === 'ACEPTADA') {
        const nextNotification: AdminShellNotification = {
          createdAt: appointment.startAt,
          description: `${appointment.appointmentType} - ${appointment.siteName}`,
          id: `student-appointment-${appointment.id}-${appointment.status}`,
          title: `${appointment.patientName} acepto la cita`,
          to: ROUTES.studentAppointments,
          tone: 'success',
        };

        return [nextNotification];
      }

      if (appointment.status === 'REPROGRAMACION_PENDIENTE') {
        const nextNotification: AdminShellNotification = {
          createdAt: appointment.startAt,
          description: `${appointment.patientName} solicito reprogramar ${appointment.appointmentType.toLowerCase()}.`,
          id: `student-appointment-${appointment.id}-${appointment.status}`,
          title: 'Solicitud de reprogramacion',
          to: ROUTES.studentAppointments,
          tone: 'warning',
        };

        return [nextNotification];
      }

      if (appointment.status === 'CANCELADA') {
        const nextNotification: AdminShellNotification = {
          createdAt: appointment.startAt,
          description: `${appointment.appointmentType} - ${appointment.siteName}`,
          id: `student-appointment-${appointment.id}-${appointment.status}`,
          title: `${appointment.patientName} cancelo la cita`,
          to: ROUTES.studentAppointments,
          tone: 'danger',
        };

        return [nextNotification];
      }

      return [];
    },
  );

  return [...requestNotifications, ...appointmentNotifications].sort(
    (firstNotification, secondNotification) =>
      new Date(secondNotification.createdAt).getTime() -
      new Date(firstNotification.createdAt).getTime(),
  );
}

export function StudentLayout() {
  const { session } = useAuth();
  const location = useLocation();
  const shouldAutoLoadStudentModule =
    IS_TEST_MODE ||
    (session?.user.role === 'STUDENT' &&
      !shouldRequireFirstLoginPasswordChange(session));
  const { appointments, profile, requests } = useStudentModuleStore({
    autoLoad: shouldAutoLoadStudentModule,
  });

  if (!IS_TEST_MODE) {
    if (!session) {
      return <Navigate replace state={{ from: location }} to={ROUTES.login} />;
    }

    if (session.user.role !== 'STUDENT') {
      return <Navigate replace to={getDefaultRouteForRole(session.user.role)} />;
    }

    if (shouldRequireFirstLoginPasswordChange(session)) {
      return <Navigate replace to={ROUTES.firstLoginPassword} />;
    }
  }

  const overrideName =
    profile.firstName || profile.lastName
      ? { firstName: profile.firstName, lastName: profile.lastName }
      : undefined;
  const headerNotifications = useMemo(
    () => buildStudentHeaderNotifications(requests, appointments),
    [appointments, requests],
  );

  return (
    <AdminShell
      avatarSrc={profile.avatarSrc}
      content={studentContent.shell}
      headerNotifications={headerNotifications}
      {...(overrideName ? { overrideName } : {})}
    >
      <Outlet />
    </AdminShell>
  );
}
