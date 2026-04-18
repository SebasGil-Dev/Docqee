import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/app/providers/AuthProvider';
import { AdminShell } from '@/components/admin/AdminShell';
import { ROUTES } from '@/constants/routes';
import { patientContent } from '@/content/patientContent';
import { IS_TEST_MODE } from '@/lib/apiClient';
import { getDefaultRouteForRole } from '@/lib/authRouting';
import { usePatientPortalNotifications } from '@/lib/portalNotifications';
import { usePatientModuleStore } from '@/lib/patientModuleStore';

const NOTIFICATION_POLL_INTERVAL_MS = 15_000;

export function PatientLayout() {
  const { session } = useAuth();
  const location = useLocation();
  const shouldAutoLoadPatientModule =
    IS_TEST_MODE || session?.user.role === 'PATIENT';
  const { appointments, conversations, profile, requests, refresh } = usePatientModuleStore({
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

  useEffect(() => {
    if (IS_TEST_MODE || !shouldAutoLoadPatientModule) {
      return;
    }

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    }, NOTIFICATION_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [shouldAutoLoadPatientModule, refresh]);

  if (!IS_TEST_MODE) {
    if (!session) {
      return <Navigate replace state={{ from: location }} to={ROUTES.login} />;
    }

    if (session.user.role !== 'PATIENT') {
      return <Navigate replace to={getDefaultRouteForRole(session.user.role)} />;
    }
  }

  const overrideName =
    profile.firstName || profile.lastName
      ? { firstName: profile.firstName, lastName: profile.lastName }
      : undefined;

  return (
    <AdminShell
      avatarSrc={profile.avatarSrc}
      content={patientContent.shell}
      headerNotifications={notifications}
      notificationsPageTo={ROUTES.patientNotifications}
      onMarkAllNotificationsRead={markAllNotificationsAsRead}
      onOpenNotification={markNotificationAsRead}
      surfacePaddingMode="inner"
      {...(overrideName ? { overrideName } : {})}
    >
      <Outlet />
    </AdminShell>
  );
}
