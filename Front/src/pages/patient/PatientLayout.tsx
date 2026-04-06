import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/app/providers/AuthProvider';
import { AdminShell } from '@/components/admin/AdminShell';
import { ROUTES } from '@/constants/routes';
import { patientContent } from '@/content/patientContent';
import { IS_TEST_MODE } from '@/lib/apiClient';
import { getDefaultRouteForRole } from '@/lib/authRouting';

export function PatientLayout() {
  const { session } = useAuth();
  const location = useLocation();

  if (!IS_TEST_MODE) {
    if (!session) {
      return <Navigate replace state={{ from: location }} to={ROUTES.login} />;
    }

    if (session.user.role !== 'PATIENT') {
      return <Navigate replace to={getDefaultRouteForRole(session.user.role)} />;
    }
  }

  return (
    <AdminShell content={patientContent.shell}>
      <Outlet />
    </AdminShell>
  );
}
