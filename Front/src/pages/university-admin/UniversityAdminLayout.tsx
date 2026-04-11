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
import { useUniversityAdminModuleStore } from '@/lib/universityAdminModuleStore';

export function UniversityAdminLayout() {
  const { session } = useAuth();
  const location = useLocation();
  const { institutionProfile } = useUniversityAdminModuleStore();

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

  const overrideName =
    institutionProfile.adminFirstName || institutionProfile.adminLastName
      ? { firstName: institutionProfile.adminFirstName, lastName: institutionProfile.adminLastName }
      : undefined;

  return (
    <AdminShell
      avatarKind="logo"
      avatarSrc={institutionProfile.logoSrc}
      content={universityAdminContent.shell}
      {...(overrideName ? { overrideName } : {})}
    >
      <Outlet />
    </AdminShell>
  );
}
