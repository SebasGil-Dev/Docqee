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

export function UniversityAdminLayout() {
  const { session } = useAuth();
  const location = useLocation();

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

  return (
    <AdminShell content={universityAdminContent.shell}>
      <Outlet />
    </AdminShell>
  );
}
