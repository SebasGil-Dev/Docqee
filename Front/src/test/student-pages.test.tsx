import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MemoryRouterProps } from 'react-router-dom';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { ROUTES } from '@/constants/routes';
import { resetStudentModuleState } from '@/lib/studentModuleStore';
import { StudentAgendaPage } from '@/pages/student/agenda/StudentAgendaPage';
import { StudentConversationsPage } from '@/pages/student/conversations/StudentConversationsPage';
import { StudentLayout } from '@/pages/student/StudentLayout';
import { StudentProfilePage } from '@/pages/student/profile/StudentProfilePortalPage';
import { StudentRequestsPage } from '@/pages/student/requests/StudentRequestsPage';
import { StudentTreatmentsPage } from '@/pages/student/treatments/StudentTreatmentsPage';

function renderStudentApp(
  initialEntries: MemoryRouterProps['initialEntries'] = [ROUTES.studentProfile],
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route element={<StudentLayout />} path={ROUTES.studentRoot}>
          <Route
            element={<Navigate replace to={ROUTES.studentProfile} />}
            index
          />
          <Route element={<StudentProfilePage />} path="mi-perfil" />
          <Route
            element={<StudentTreatmentsPage />}
            path="tratamientos-y-sedes"
          />
          <Route element={<StudentAgendaPage />} path="agenda" />
          <Route element={<StudentRequestsPage />} path="solicitudes" />
          <Route element={<StudentConversationsPage />} path="conversaciones" />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('Student pages', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetStudentModuleState();
  });

  it('permite actualizar el perfil y agregar un enlace profesional', async () => {
    const user = userEvent.setup();

    renderStudentApp([ROUTES.studentProfile]);

    await user.clear(screen.getByLabelText(/descripcion profesional/i));
    await user.type(
      screen.getByLabelText(/descripcion profesional/i),
      'Estudiante enfocada en operatoria, prevencion y acompanamiento humanizado.',
    );
    await user.clear(screen.getByLabelText(/disponibilidad general/i));
    await user.type(
      screen.getByLabelText(/disponibilidad general/i),
      'Atiendo lunes, martes y jueves en jornada de tarde.',
    );

    await user.click(screen.getByLabelText(/tipo de enlace/i));
    await user.click(screen.getByRole('option', { name: /hoja de vida/i }));
    await user.type(
      screen.getByLabelText(/^url$/i),
      'https://drive.google.com/file/d/demo-cv',
    );
    await user.click(screen.getByRole('button', { name: /agregar enlace/i }));
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      /tu perfil se actualizo correctamente/i,
    );
    expect(screen.getByText(/https:\/\/drive.google.com\/file\/d\/demo-cv/i)).toBeInTheDocument();
  });

  it('muestra el resumen de valoraciones y comentarios del estudiante', () => {
    renderStudentApp([ROUTES.studentTreatments]);

    expect(screen.getByText(/bienvenido, valentina rios/i)).toBeInTheDocument();
    expect(screen.getByText(/4.7 de 5 en 3 valoraciones/i)).toBeInTheDocument();
    expect(screen.getByText(/comentarios de tus citas/i)).toBeInTheDocument();
    expect(screen.getByTestId('student-review-card-student-review-1')).toHaveTextContent(
      /me senti muy bien acompanado durante la cita/i,
    );
  });

  it('permite gestionar tratamientos y sedes desde mi perfil', async () => {
    const user = userEvent.setup();

    renderStudentApp([ROUTES.studentProfile]);

    await user.click(
      within(
        screen.getByTestId('student-profile-treatment-card-treatment-1'),
      ).getByRole('button', {
        name: /inactivar/i,
      }),
    );
    await waitFor(() => {
      expect(
        within(
          screen.getByTestId('student-profile-treatment-card-treatment-1'),
        ).getByText(/^Inactivo$/i),
      ).toBeInTheDocument();
    });

    await user.click(
      within(
        screen.getByTestId('student-profile-practice-site-card-practice-site-1'),
      ).getByRole('button', {
        name: /inactivar/i,
      }),
    );
    await waitFor(() => {
      expect(
        within(
          screen.getByTestId('student-profile-practice-site-card-practice-site-1'),
        ).getByText(/^Inactivo$/i),
      ).toBeInTheDocument();
    });
  });

  it('permite crear un bloqueo de agenda y cambiar su estado', async () => {
    const user = userEvent.setup();

    renderStudentApp([ROUTES.studentAgenda]);

    await user.click(screen.getByLabelText(/tipo de bloqueo/i));
    await user.click(screen.getByRole('option', { name: /recurrente/i }));
    await user.click(screen.getByLabelText(/dia de la semana/i));
    await user.click(screen.getByRole('option', { name: /viernes/i }));
    await user.type(screen.getByLabelText(/fecha de inicio/i), '2026-04-11');
    await user.type(screen.getByLabelText(/hora de inicio/i), '07:00');
    await user.type(screen.getByLabelText(/hora de finalizacion/i), '09:00');
    await user.type(screen.getByLabelText(/motivo opcional/i), 'Espacio reservado para practica externa.');
    await user.click(screen.getByRole('button', { name: /agregar bloqueo/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      /el bloqueo de agenda se agrego correctamente/i,
    );

    const scheduleCard = screen
      .getByText(/espacio reservado para practica externa/i)
      .closest('[data-testid^="student-schedule-block-"]') as HTMLElement | null;
    expect(scheduleCard).not.toBeNull();
    await user.click(within(scheduleCard!).getByRole('button', { name: /inactivar/i }));
    await waitFor(() => {
      expect(
        within(
          screen.getByText(/espacio reservado para practica externa/i).closest(
            '[data-testid^="student-schedule-block-"]',
          )!,
        ).getByText(/^Inactivo$/i),
      ).toBeInTheDocument();
    });
  });

  it('permite filtrar solicitudes pendientes y aceptarlas', async () => {
    const user = userEvent.setup();

    renderStudentApp([ROUTES.studentRequests]);

    await user.click(screen.getByRole('button', { name: /filtrar solicitudes por estado/i }));
    await user.click(screen.getByRole('menuitemradio', { name: /pendiente/i }));

    expect(screen.getByText(/ana maria perez/i)).toBeInTheDocument();
    expect(screen.queryByText(/julian torres/i)).not.toBeInTheDocument();

    await user.click(
      within(screen.getByTestId('student-request-row-student-request-1')).getByRole('button', {
        name: /aceptar/i,
      }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(
      /la solicitud fue aceptada/i,
    );
    await waitFor(() => {
      expect(screen.queryByText(/ana maria perez/i)).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /filtrar solicitudes por estado/i }));
    await user.click(screen.getByRole('menuitemradio', { name: /aceptada/i }));

    expect(screen.getByText(/ana maria perez/i)).toBeInTheDocument();
    expect(
      within(screen.getByTestId('student-request-row-student-request-1')).getByText(
        /^Aceptada$/i,
      ),
    ).toBeInTheDocument();
  });

  it('permite abrir una conversacion y enviar un mensaje al paciente', async () => {
    const user = userEvent.setup();

    renderStudentApp([ROUTES.studentConversations]);

    expect(
      screen.getByTestId('student-conversation-card-student-conversation-1'),
    ).toHaveTextContent(/julian torres/i);
    expect(
      within(screen.getByTestId('student-conversation-thread-student-conversation-1')).getByText(
        /perfecto, quedo atento al horario que me sugieras/i,
      ),
    ).toBeInTheDocument();

    await user.type(
      screen.getByLabelText(/mensaje para el paciente/i),
      'Hola Julian, manana en la tarde te puedo compartir una propuesta de horario.',
    );
    await user.click(screen.getByRole('button', { name: /enviar mensaje/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      /tu mensaje se envio correctamente/i,
    );
    expect(
      within(screen.getByTestId('student-conversation-thread-student-conversation-1')).getByText(
        /hola julian, manana en la tarde te puedo compartir una propuesta de horario/i,
      ),
    ).toBeInTheDocument();
  });
});
