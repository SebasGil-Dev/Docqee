import { createBrowserRouter } from 'react-router-dom';
import { Navigate } from 'react-router-dom';

import { ROUTES } from '@/constants/routes';
import { HomePage } from '@/pages/home/HomePage';

export const router = createBrowserRouter([
  {
    path: ROUTES.home,
    Component: HomePage,
  },
  {
    path: ROUTES.login,
    lazy: async () => {
      const { LoginPage } = await import('@/pages/auth/login/LoginPage');
      return { Component: LoginPage };
    },
  },
  {
    path: ROUTES.register,
    lazy: async () => {
      const { RegisterPage } = await import('@/pages/auth/register/RegisterPage');
      return { Component: RegisterPage };
    },
  },
  {
    path: ROUTES.verifyEmail,
    lazy: async () => {
      const { VerifyEmailPage } = await import('@/pages/auth/verify-email/VerifyEmailPage');
      return { Component: VerifyEmailPage };
    },
  },
  {
    path: ROUTES.firstLoginPassword,
    lazy: async () => {
      const { FirstLoginPasswordPage } = await import(
        '@/pages/auth/first-login/FirstLoginPasswordPage'
      );
      return { Component: FirstLoginPasswordPage };
    },
  },
  {
    path: ROUTES.adminRoot,
    lazy: async () => {
      const { AdminLayout } = await import('@/pages/admin/AdminLayout');
      return { Component: AdminLayout };
    },
    children: [
      {
        index: true,
        Component: function AdminIndexRedirect() {
          return <Navigate replace to={ROUTES.adminUniversities} />;
        },
      },
      {
        path: 'universidades',
        lazy: async () => {
          const { AdminUniversitiesPage } = await import('@/pages/admin/universities/AdminUniversitiesPage');
          return { Component: AdminUniversitiesPage };
        },
      },
      {
        path: 'universidades/registrar',
        lazy: async () => {
          const { AdminRegisterUniversityPage } = await import('@/pages/admin/register-university/AdminRegisterUniversityPage');
          return { Component: AdminRegisterUniversityPage };
        },
      },
      {
        path: 'credenciales',
        lazy: async () => {
          const { AdminCredentialsPage } = await import('@/pages/admin/credentials/AdminCredentialsPage');
          return { Component: AdminCredentialsPage };
        },
      },
    ],
  },
  {
    path: ROUTES.universityRoot,
    lazy: async () => {
      const { UniversityAdminLayout } = await import(
        '@/pages/university-admin/UniversityAdminLayout'
      );
      return { Component: UniversityAdminLayout };
    },
    children: [
      {
        index: true,
        Component: function UniversityIndexRedirect() {
          return <Navigate replace to={ROUTES.universityInstitution} />;
        },
      },
      {
        path: 'informacion-institucional',
        lazy: async () => {
          const { UniversityInstitutionPage } = await import(
            '@/pages/university-admin/institution/UniversityInstitutionPage'
          );
          return { Component: UniversityInstitutionPage };
        },
      },
      {
        path: 'estudiantes',
        lazy: async () => {
          const { UniversityStudentsPage } = await import(
            '@/pages/university-admin/students/UniversityStudentsPage'
          );
          return { Component: UniversityStudentsPage };
        },
      },
      {
        path: 'estudiantes/registrar',
        lazy: async () => {
          const { UniversityRegisterStudentPage } = await import(
            '@/pages/university-admin/students/UniversityRegisterStudentPage'
          );
          return { Component: UniversityRegisterStudentPage };
        },
      },
      {
        path: 'docentes',
        lazy: async () => {
          const { UniversityTeachersPage } = await import(
            '@/pages/university-admin/teachers/UniversityTeachersPage'
          );
          return { Component: UniversityTeachersPage };
        },
      },
      {
        path: 'docentes/registrar',
        lazy: async () => {
          const { UniversityRegisterTeacherPage } = await import(
            '@/pages/university-admin/teachers/UniversityRegisterTeacherPage'
          );
          return { Component: UniversityRegisterTeacherPage };
        },
      },
      {
        path: 'carga-masiva',
        lazy: async () => {
          const { UniversityBulkUploadPage } = await import(
            '@/pages/university-admin/bulk-upload/UniversityBulkUploadPage'
          );
          return { Component: UniversityBulkUploadPage };
        },
      },
      {
        path: 'credenciales',
        lazy: async () => {
          const { UniversityCredentialsPage } = await import(
            '@/pages/university-admin/credentials/UniversityCredentialsPage'
          );
          return { Component: UniversityCredentialsPage };
        },
      },
    ],
  },
  {
    path: ROUTES.patientRoot,
    lazy: async () => {
      const { PatientLayout } = await import('@/pages/patient/PatientLayout');
      return { Component: PatientLayout };
    },
    children: [
      {
        index: true,
        Component: function PatientIndexRedirect() {
          return <Navigate replace to={ROUTES.patientSearchStudents} />;
        },
      },
      {
        path: 'buscar-estudiantes',
        lazy: async () => {
          const { PatientSearchStudentsPage } = await import(
            '@/pages/patient/search/PatientSearchStudentsPage'
          );
          return { Component: PatientSearchStudentsPage };
        },
      },
      {
        path: 'solicitudes',
        lazy: async () => {
          const { PatientRequestsPage } = await import('@/pages/patient/requests/PatientRequestsPage');
          return { Component: PatientRequestsPage };
        },
      },
      {
        path: 'conversaciones',
        lazy: async () => {
          const { PatientConversationsPage } = await import(
            '@/pages/patient/conversations/PatientConversationsPage'
          );
          return { Component: PatientConversationsPage };
        },
      },
      {
        path: 'citas',
        lazy: async () => {
          const { PatientAppointmentsPage } = await import(
            '@/pages/patient/appointments/PatientAppointmentsPage'
          );
          return { Component: PatientAppointmentsPage };
        },
      },
      {
        path: 'mi-perfil',
        lazy: async () => {
          const { PatientProfilePage } = await import('@/pages/patient/profile/PatientProfilePage');
          return { Component: PatientProfilePage };
        },
      },
    ],
  },
  {
    path: ROUTES.studentRoot,
    lazy: async () => {
      const { StudentLayout } = await import('@/pages/student/StudentLayout');
      return { Component: StudentLayout };
    },
    children: [
      {
        index: true,
        Component: function StudentIndexRedirect() {
          return <Navigate replace to={ROUTES.studentProfile} />;
        },
      },
      {
        path: 'mi-perfil',
        lazy: async () => {
          const { StudentProfilePage } = await import('@/pages/student/profile/StudentProfilePage');
          return { Component: StudentProfilePage };
        },
      },
      {
        path: 'tratamientos-y-sedes',
        lazy: async () => {
          const { StudentTreatmentsPage } = await import(
            '@/pages/student/treatments/StudentTreatmentsPage'
          );
          return { Component: StudentTreatmentsPage };
        },
      },
      {
        path: 'agenda',
        lazy: async () => {
          const { StudentAgendaPage } = await import('@/pages/student/agenda/StudentAgendaPage');
          return { Component: StudentAgendaPage };
        },
      },
      {
        path: 'solicitudes',
        lazy: async () => {
          const { StudentRequestsPage } = await import(
            '@/pages/student/requests/StudentRequestsPage'
          );
          return { Component: StudentRequestsPage };
        },
      },
      {
        path: 'conversaciones',
        lazy: async () => {
          const { StudentConversationsPage } = await import(
            '@/pages/student/conversations/StudentConversationsPage'
          );
          return { Component: StudentConversationsPage };
        },
      },
    ],
  },
  {
    path: ROUTES.forgotPassword,
    lazy: async () => {
      const { ForgotPasswordPage } = await import('@/pages/auth/forgot-password/ForgotPasswordPage');
      return { Component: ForgotPasswordPage };
    },
  },
  {
    path: '*',
    lazy: async () => {
      const { NotFoundPage } = await import('@/pages/home/NotFoundPage');
      return { Component: NotFoundPage };
    },
  },
]);
