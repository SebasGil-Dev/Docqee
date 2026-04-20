import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/app/providers/AuthProvider';
import { AdminShell } from '@/components/admin/AdminShell';
import { ROUTES } from '@/constants/routes';
import { studentContent } from '@/content/studentContent';
import { IS_TEST_MODE } from '@/lib/apiClient';
import {
  getDefaultRouteForRole,
  shouldRequireFirstLoginPasswordChange,
} from '@/lib/authRouting';
import { useStudentPortalNotifications } from '@/lib/portalNotifications';
import { useStudentModuleStore } from '@/lib/studentModuleStore';

const NOTIFICATION_POLL_INTERVAL_MS = 15_000;

export function StudentLayout() {
  const { session } = useAuth();
  const location = useLocation();
  const shouldAutoLoadStudentModule =
    IS_TEST_MODE ||
    (session?.user.role === 'STUDENT' &&
      !shouldRequireFirstLoginPasswordChange(session));
  const { appointments, conversations, profile, requests, refresh } = useStudentModuleStore({
    autoLoad: shouldAutoLoadStudentModule,
  });
  const {
    markAllNotificationsAsRead,
    markNotificationAsRead,
    notifications,
  } = useStudentPortalNotifications({
    appointments,
    conversations,
    requests,
  });

  useEffect(() => {
    if (IS_TEST_MODE || !shouldAutoLoadStudentModule) {
      return;
    }

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    }, NOTIFICATION_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [shouldAutoLoadStudentModule, refresh]);

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

  return (
    <AdminShell
      avatarSrc={profile.avatarSrc}
      content={studentContent.shell}
      headerNotifications={notifications}
      hideHeaderNotificationsOnMobile
      notificationsPageTo={ROUTES.studentNotifications}
      onMarkAllNotificationsRead={markAllNotificationsAsRead}
      onOpenNotification={markNotificationAsRead}
      surfacePaddingMode="inner"
      {...(overrideName ? { overrideName } : {})}
    >
      <Outlet />
    </AdminShell>
  );
}
