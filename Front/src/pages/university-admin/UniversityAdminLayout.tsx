import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/app/providers/AuthProvider';
import { AdminShell } from '@/components/admin/AdminShell';
import { ROUTES } from '@/constants/routes';
import { universityAdminContent } from '@/content/universityAdminContent';
import { IS_TEST_MODE } from '@/lib/apiClient';
import {
  getDefaultRouteForRole,
  shouldRequireFirstLoginPasswordChange,
} from '@/lib/authRouting';
import { useUniversityAdminHeaderStore } from '@/lib/universityAdminHeaderStore';
import { useUniversityAdminOverviewStore } from '@/lib/universityAdminOverviewStore';
import { useUniversityAdminProfileStore } from '@/lib/universityAdminProfileStore';

export function UniversityAdminLayout() {
  const { session } = useAuth();
  const location = useLocation();
  const isHomeRoute = location.pathname === ROUTES.universityHome;
  useUniversityAdminProfileStore({
    autoLoad: !isHomeRoute,
  });
  const { institution: overviewInstitution } = useUniversityAdminOverviewStore({
    autoLoad: isHomeRoute,
  });
  const currentHeader = useUniversityAdminHeaderStore();

  if (!IS_TEST_MODE) {
    if (!session) {
      return <Navigate replace state={{ from: location }} to={ROUTES.login} />;
    }

    if (session.user.role !== 'UNIVERSITY_ADMIN') {
      return <Navigate replace to={getDefaultRouteForRole(session.user.role)} />;
    }

    if (shouldRequireFirstLoginPasswordChange(session)) {
      return <Navigate replace to={ROUTES.firstLoginPassword} />;
    }
  }

  const currentInstitution = isHomeRoute ? overviewInstitution : currentHeader;

  const overrideName =
    currentInstitution.adminFirstName || currentInstitution.adminLastName
      ? {
          firstName: currentInstitution.adminFirstName,
          lastName: currentInstitution.adminLastName,
        }
      : undefined;

  return (
    <AdminShell
      avatarKind="logo"
      avatarSrc={currentInstitution.logoSrc}
      content={universityAdminContent.shell}
      surfacePaddingMode="inner"
      {...(overrideName ? { overrideName } : {})}
    >
      <Outlet />
    </AdminShell>
  );
}
