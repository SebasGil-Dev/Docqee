import { useCallback, useEffect } from 'react';
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

const REQUEST_NOTIFICATION_POLL_INTERVAL_MS = 8_000;
const MODULE_NOTIFICATION_POLL_INTERVAL_MS = 30_000;

export function StudentLayout() {
  const { session } = useAuth();
  const location = useLocation();
  const shouldAutoLoadStudentModule =
    IS_TEST_MODE ||
    (session?.user.role === 'STUDENT' &&
      !shouldRequireFirstLoginPasswordChange(session));
  const {
    appointments,
    conversations,
    isLoading,
    profile,
    requests,
    refresh,
    refreshRequests,
  } = useStudentModuleStore({
    autoLoad: shouldAutoLoadStudentModule,
  });
  const { markAllNotificationsAsRead, markNotificationAsRead, notifications } =
    useStudentPortalNotifications({
      appointments,
      conversations,
      requests,
    });

  const refreshRequestsIfVisible = useCallback(() => {
    if (document.visibilityState === 'visible' && !isLoading) {
      void refreshRequests();
    }
  }, [isLoading, refreshRequests]);

  const refreshModuleIfVisible = useCallback(() => {
    if (document.visibilityState === 'visible' && !isLoading) {
      void refresh();
    }
  }, [isLoading, refresh]);

  useEffect(() => {
    if (IS_TEST_MODE || !shouldAutoLoadStudentModule) {
      return;
    }

    refreshRequestsIfVisible();

    const requestInterval = setInterval(
      refreshRequestsIfVisible,
      REQUEST_NOTIFICATION_POLL_INTERVAL_MS,
    );
    const moduleInterval = setInterval(
      refreshModuleIfVisible,
      MODULE_NOTIFICATION_POLL_INTERVAL_MS,
    );

    document.addEventListener('visibilitychange', refreshRequestsIfVisible);
    window.addEventListener('focus', refreshRequestsIfVisible);

    return () => {
      clearInterval(requestInterval);
      clearInterval(moduleInterval);
      document.removeEventListener(
        'visibilitychange',
        refreshRequestsIfVisible,
      );
      window.removeEventListener('focus', refreshRequestsIfVisible);
    };
  }, [
    refreshModuleIfVisible,
    refreshRequestsIfVisible,
    shouldAutoLoadStudentModule,
  ]);

  if (!IS_TEST_MODE) {
    if (!session) {
      return <Navigate replace state={{ from: location }} to={ROUTES.login} />;
    }

    if (session.user.role !== 'STUDENT') {
      return (
        <Navigate replace to={getDefaultRouteForRole(session.user.role)} />
      );
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
      onMarkAllNotificationsRead={markAllNotificationsAsRead}
      onOpenNotification={markNotificationAsRead}
      profileTo={ROUTES.studentProfile}
      surfacePaddingMode="inner"
      {...(overrideName ? { overrideName } : {})}
    >
      <Outlet />
    </AdminShell>
  );
}
