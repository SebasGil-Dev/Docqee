import { ROUTES } from '@/constants/routes';
import type { AuthSession, SessionUserRole } from '@/lib/authSession';

export function shouldRequireFirstLoginPasswordChange(
  session: Pick<AuthSession, 'requiresPasswordChange' | 'user'> | null | undefined,
) {
  if (!session?.requiresPasswordChange) {
    return false;
  }

  return (
    session.user.role === 'STUDENT' || session.user.role === 'UNIVERSITY_ADMIN'
  );
}

export function getDefaultRouteForRole(role: SessionUserRole) {
  switch (role) {
    case 'PATIENT':
      return ROUTES.patientSearchStudents;
    case 'PLATFORM_ADMIN':
      return ROUTES.adminUniversities;
    case 'STUDENT':
      return ROUTES.studentTreatments;
    case 'UNIVERSITY_ADMIN':
      return ROUTES.universityHome;
    default:
      return ROUTES.home;
  }
}

export function getLandingRouteForSession(
  session: Pick<AuthSession, 'requiresPasswordChange' | 'user'>,
) {
  if (shouldRequireFirstLoginPasswordChange(session)) {
    return ROUTES.firstLoginPassword;
  }

  return getDefaultRouteForRole(session.user.role);
}

export function preloadLandingRouteForSession(
  session: Pick<AuthSession, 'requiresPasswordChange' | 'user'>,
) {
  if (typeof window === 'undefined') {
    return;
  }

  const preloads: Array<Promise<unknown>> = [];

  if (shouldRequireFirstLoginPasswordChange(session)) {
    preloads.push(
      import('@/pages/auth/first-login/FirstLoginPasswordPage'),
    );
  } else {
    switch (session.user.role) {
      case 'PATIENT':
        preloads.push(
          import('@/pages/patient/PatientLayout'),
          import('@/pages/patient/search/PatientSearchStudentsPage'),
          import('@/lib/patientModuleStore').then(({ refreshPatientModuleState }) =>
            refreshPatientModuleState(),
          ),
        );
        break;
      case 'PLATFORM_ADMIN':
        preloads.push(
          import('@/pages/admin/AdminLayout'),
          import('@/pages/admin/universities/AdminUniversitiesPage'),
          import('@/lib/adminModuleStore').then(({ refreshAdminModuleState }) =>
            refreshAdminModuleState(),
          ),
        );
        break;
      case 'STUDENT':
        preloads.push(
          import('@/pages/student/StudentLayout'),
          import('@/pages/student/treatments/StudentTreatmentsPage'),
          import('@/lib/studentModuleStore').then(({ refreshStudentModuleState }) =>
            refreshStudentModuleState(),
          ),
        );
        break;
      case 'UNIVERSITY_ADMIN':
        preloads.push(
          import('@/pages/university-admin/UniversityAdminLayout'),
          import('@/pages/university-admin/home/UniversityHomePage'),
          import('@/lib/universityAdminOverviewStore').then(
            ({ refreshUniversityAdminOverviewState }) =>
              refreshUniversityAdminOverviewState(),
          ),
        );
        break;
      default:
        break;
    }
  }

  void Promise.allSettled(preloads);
}
