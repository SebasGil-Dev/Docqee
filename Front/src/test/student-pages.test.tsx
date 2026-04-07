import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MemoryRouterProps } from 'react-router-dom';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { ROUTES } from '@/constants/routes';
import { resetStudentModuleState } from '@/lib/studentModuleStore';
import { StudentAgendaPage } from '@/pages/student/agenda/StudentAgendaPage';
import { StudentAppointmentsPage } from '@/pages/student/appointments/StudentAppointmentsPage';
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
          <Route element={<StudentAppointmentsPage />} path="citas" />
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

  it('muestra el resumen de valoraciones y comentarios del estudiante', async () => {
    const user = userEvent.setup();

    renderStudentApp([ROUTES.studentTreatments]);

    expect(screen.getByText(/bienvenido, valentina rios/i)).toBeInTheDocument();
    expect(screen.getByText(/4.7 de 5 en 3 valoraciones/i)).toBeInTheDocument();
    expect(screen.getByText(/comentarios de tus citas/i)).toBeInTheDocument();
    expect(
      within(screen.getByTestId('student-review-comments-dashboard')).getByText(/^3$/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId('student-review-card-student-review-1')).toHaveTextContent(
      /me senti muy bien acompanado durante la cita/i,
    );

    await user.click(screen.getByRole('button', { name: /filtrar comentarios por estrellas/i }));
    await user.click(screen.getByRole('menuitemradio', { name: /4 estrellas/i }));

    expect(screen.queryByTestId('student-review-card-student-review-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('student-review-card-student-review-2')).toBeInTheDocument();
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

    expect(screen.getByText(/calendario de citas/i)).toBeInTheDocument();
    expect(screen.getAllByText(/valoracion inicial/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /agregar bloqueo/i }));

    const createDialog = screen.getByRole('dialog', { name: /agregar bloqueo/i });
    await user.type(within(createDialog).getByLabelText(/fecha especifica/i), '2026-04-10');
    await user.type(within(createDialog).getByLabelText(/hora de inicio/i), '07:00');
    await user.type(within(createDialog).getByLabelText(/hora de finalizacion/i), '09:00');
    await user.type(
      within(createDialog).getByLabelText(/motivo opcional/i),
      'Espacio reservado para practica externa.',
    );
    await user.click(within(createDialog).getByRole('button', { name: /agregar bloqueo/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      /el bloqueo de agenda se agrego correctamente/i,
    );

    const scheduleEvent = await screen.findByTestId(
      'student-agenda-block-event-schedule-block-4',
    );
    await user.click(scheduleEvent);

    const manageDialog = screen.getByRole('dialog', { name: /gestionar bloqueo/i });
    expect(within(manageDialog).getByText(/espacio reservado para practica externa/i)).toBeInTheDocument();
    await user.click(within(manageDialog).getByRole('button', { name: /inactivar/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      /el bloqueo de agenda se inactivo correctamente/i,
    );

    await user.click(await screen.findByTestId('student-agenda-block-event-schedule-block-4'));
    const secondManageDialog = screen.getByRole('dialog', { name: /gestionar bloqueo/i });
    expect(within(secondManageDialog).getByText(/^Inactivo$/i)).toBeInTheDocument();
    await user.click(within(secondManageDialog).getByRole('button', { name: /eliminar/i }));

    const confirmDialog = screen.getByRole('dialog', { name: /eliminar bloqueo/i });
    await user.click(
      within(confirmDialog).getByRole('button', { name: /si, eliminar bloqueo/i }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(
      /el bloqueo de agenda se elimino correctamente/i,
    );
    await waitFor(() => {
      expect(
        screen.queryByTestId('student-agenda-block-event-schedule-block-4'),
      ).not.toBeInTheDocument();
    });
  });

  it('permite agendar una cita y gestionarla desde el modulo de citas', async () => {
    const user = userEvent.setup();

    renderStudentApp([ROUTES.studentAppointments]);

    expect(screen.getByText(/propuestas activas/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /agendar cita/i }));

    const dialog = screen.getByRole('dialog', { name: /agendar cita/i });
    await user.click(within(dialog).getByLabelText(/solicitud aceptada/i));
    await user.click(within(dialog).getByRole('option', { name: /julian torres/i }));
    await user.click(within(dialog).getByLabelText(/^sede$/i));
    await user.click(within(dialog).getByRole('option', { name: /sede norte/i }));
    await user.type(within(dialog).getByLabelText(/fecha de la cita/i), '2026-04-11');
    await user.type(within(dialog).getByLabelText(/hora de inicio/i), '08:00');
    await user.type(within(dialog).getByLabelText(/hora de finalizacion/i), '09:00');
    await user.click(within(dialog).getByLabelText(/docente supervisor/i));
    await user.click(within(dialog).getByRole('option', { name: /catalina mora/i }));
    await user.click(within(dialog).getByRole('button', { name: /operatoria basica/i }));
    await user.click(within(dialog).getByRole('button', { name: /promocion y prevencion/i }));
    await user.type(
      within(dialog).getByLabelText(/informacion adicional/i),
      'Paciente listo para propuesta de control preventivo.',
    );
    await user.click(within(dialog).getByRole('button', { name: /guardar cita/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      /la cita se agendo correctamente como propuesta/i,
    );
    expect(screen.getByTestId('student-appointment-row-student-appointment-6')).toHaveTextContent(
      /julian torres/i,
    );

    await user.click(
      within(screen.getByTestId('student-appointment-row-student-appointment-6')).getByRole(
        'button',
        {
          name: /cancelar cita/i,
        },
      ),
    );

    const confirmDialog = screen.getByRole('dialog', { name: /cancelar cita/i });
    await user.click(
      within(confirmDialog).getByRole('button', { name: /si, cancelar cita/i }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(
      /la cita ahora esta cancelada/i,
    );
    expect(
      within(screen.getByTestId('student-appointment-row-student-appointment-6')).getByText(
        /^Cancelada$/i,
      ),
    ).toBeInTheDocument();
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
      screen.queryByText(/mantiene las conversaciones activas con los pacientes/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/^Conversaciones activas$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Mensajes pendientes$/i)).not.toBeInTheDocument();
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
