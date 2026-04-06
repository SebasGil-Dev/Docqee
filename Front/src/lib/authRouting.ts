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
    case 'PLATFORM_ADMIN':
      return ROUTES.adminUniversities;
    case 'UNIVERSITY_ADMIN':
      return ROUTES.universityInstitution;
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
