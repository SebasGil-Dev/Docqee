import { ROUTES } from '@/constants/routes';
import type { SessionUserRole } from '@/lib/authSession';

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
