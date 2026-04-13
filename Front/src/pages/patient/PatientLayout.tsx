import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/app/providers/AuthProvider';
import { AdminShell } from '@/components/admin/AdminShell';
import { ROUTES } from '@/constants/routes';
import { patientContent } from '@/content/patientContent';
import { IS_TEST_MODE } from '@/lib/apiClient';
import { getDefaultRouteForRole } from '@/lib/authRouting';
import { usePatientPortalNotifications } from '@/lib/portalNotifications';
import { usePatientModuleStore } from '@/lib/patientModuleStore';

export function PatientLayout() {
  const { session } = useAuth();
  const location = useLocation();
  const shouldAutoLoadPatientModule =
    IS_TEST_MODE || session?.user.role === 'PATIENT';
  const { appointments, conversations, profile, requests } = usePatientModuleStore({
    autoLoad: shouldAutoLoadPatientModule,
  });
  const {
    markAllNotificationsAsRead,
    markNotificationAsRead,
    notifications,
  } = usePatientPortalNotifications({
    appointments,
    conversations,
    requests,
  });

  if (!IS_TEST_MODE) {
    if (!session) {
      return <Navigate replace state={{ from: location }} to={ROUTES.login} />;
    }

    if (session.user.role !== 'PATIENT') {
      return <Navigate replace to={getDefaultRouteForRole(session.user.role)} />;
    }
  }

  return (
    <AdminShell
      content={patientContent.shell}
      headerNotifications={notifications}
      notificationsPageTo={ROUTES.patientNotifications}
      onMarkAllNotificationsRead={markAllNotificationsAsRead}
      onOpenNotification={markNotificationAsRead}
      overrideName={{
        firstName: profile.firstName || patientContent.shell.adminUser.firstName,
        lastName: profile.lastName || patientContent.shell.adminUser.lastName,
      }}
    >
      <Outlet />
    </AdminShell>
  );
}
