import { useCallback, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/app/providers/AuthProvider';
import { AdminShell } from '@/components/admin/AdminShell';
import { ROUTES } from '@/constants/routes';
import { patientContent } from '@/content/patientContent';
import { IS_TEST_MODE } from '@/lib/apiClient';
import { getDefaultRouteForRole } from '@/lib/authRouting';
import { usePatientPortalNotifications } from '@/lib/portalNotifications';
import { usePatientModuleStore } from '@/lib/patientModuleStore';

const REQUEST_NOTIFICATION_POLL_INTERVAL_MS = 8_000;
const APPOINTMENT_SYNC_POLL_INTERVAL_MS = 5_000;
const REVIEW_SYNC_POLL_INTERVAL_MS = 5_000;
const MODULE_NOTIFICATION_POLL_INTERVAL_MS = 15_000;

export function PatientLayout() {
  const { session } = useAuth();
  const location = useLocation();
  const shouldAutoLoadPatientModule =
    IS_TEST_MODE || session?.user.role === 'PATIENT';
  const isSearchingStudentsRoute =
    location.pathname === ROUTES.patientSearchStudents;
  const {
    appointments,
    conversations,
    isLoading,
    profile,
    requests,
    refresh,
    refreshAppointments,
    refreshReviews,
    refreshRequests,
  } = usePatientModuleStore({
    autoLoad: shouldAutoLoadPatientModule,
  });
  const { markAllNotificationsAsRead, markNotificationAsRead, notifications } =
    usePatientPortalNotifications({
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
      void refresh({ preserveStudents: isSearchingStudentsRoute });
    }
  }, [isLoading, isSearchingStudentsRoute, refresh]);

  const refreshAppointmentsIfVisible = useCallback(() => {
    if (document.visibilityState === 'visible' && !isLoading) {
      void refreshAppointments();
    }
  }, [isLoading, refreshAppointments]);

  const refreshReviewsIfVisible = useCallback(() => {
    if (document.visibilityState === 'visible' && !isLoading) {
      void refreshReviews();
    }
  }, [isLoading, refreshReviews]);

  useEffect(() => {
    if (IS_TEST_MODE || !shouldAutoLoadPatientModule) {
      return;
    }

    refreshRequestsIfVisible();
    refreshAppointmentsIfVisible();
    refreshReviewsIfVisible();

    const requestInterval = setInterval(
      refreshRequestsIfVisible,
      REQUEST_NOTIFICATION_POLL_INTERVAL_MS,
    );
    const appointmentInterval = setInterval(
      refreshAppointmentsIfVisible,
      APPOINTMENT_SYNC_POLL_INTERVAL_MS,
    );
    const reviewInterval = setInterval(
      refreshReviewsIfVisible,
      REVIEW_SYNC_POLL_INTERVAL_MS,
    );
    const moduleInterval = setInterval(
      refreshModuleIfVisible,
      MODULE_NOTIFICATION_POLL_INTERVAL_MS,
    );

    document.addEventListener('visibilitychange', refreshRequestsIfVisible);
    document.addEventListener('visibilitychange', refreshAppointmentsIfVisible);
    document.addEventListener('visibilitychange', refreshReviewsIfVisible);
    window.addEventListener('focus', refreshRequestsIfVisible);
    window.addEventListener('focus', refreshAppointmentsIfVisible);
    window.addEventListener('focus', refreshReviewsIfVisible);

    return () => {
      clearInterval(requestInterval);
      clearInterval(appointmentInterval);
      clearInterval(reviewInterval);
      clearInterval(moduleInterval);
      document.removeEventListener(
        'visibilitychange',
        refreshRequestsIfVisible,
      );
      document.removeEventListener(
        'visibilitychange',
        refreshAppointmentsIfVisible,
      );
      document.removeEventListener(
        'visibilitychange',
        refreshReviewsIfVisible,
      );
      window.removeEventListener('focus', refreshRequestsIfVisible);
      window.removeEventListener('focus', refreshAppointmentsIfVisible);
      window.removeEventListener('focus', refreshReviewsIfVisible);
    };
  }, [
    refreshAppointmentsIfVisible,
    refreshModuleIfVisible,
    refreshReviewsIfVisible,
    refreshRequestsIfVisible,
    shouldAutoLoadPatientModule,
  ]);

  if (!IS_TEST_MODE) {
    if (!session) {
      return <Navigate replace state={{ from: location }} to={ROUTES.login} />;
    }

    if (session.user.role !== 'PATIENT') {
      return (
        <Navigate replace to={getDefaultRouteForRole(session.user.role)} />
      );
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
      onMarkAllNotificationsRead={markAllNotificationsAsRead}
      onOpenNotification={markNotificationAsRead}
      profileTo={ROUTES.patientProfile}
      surfacePaddingMode="inner"
      {...(overrideName ? { overrideName } : {})}
    >
      <Outlet />
    </AdminShell>
  );
}
