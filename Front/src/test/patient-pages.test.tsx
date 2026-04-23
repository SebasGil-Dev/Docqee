import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MemoryRouterProps } from 'react-router-dom';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { ROUTES } from '@/constants/routes';
import { resetPatientModuleState } from '@/lib/patientModuleStore';
import { PatientAgendaPage } from '@/pages/patient/agenda/PatientAgendaPage';
import { PatientAppointmentsPage } from '@/pages/patient/appointments/PatientAppointmentsPage';
import { PatientConversationsPage } from '@/pages/patient/conversations/PatientConversationsPage';
import { PatientHomePage } from '@/pages/patient/home/PatientHomePage';
import { PatientLayout } from '@/pages/patient/PatientLayout';
import { PatientNotificationsPage } from '@/pages/patient/notifications/PatientNotificationsPage';
import { PatientProfilePage } from '@/pages/patient/profile/PatientProfilePage';
import { PatientRequestsPage } from '@/pages/patient/requests/PatientRequestsPage';
import { PatientSearchStudentsPage } from '@/pages/patient/search/PatientSearchStudentsPage';

function renderPatientApp(
  initialEntries: MemoryRouterProps['initialEntries'] = [ROUTES.patientHome],
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route element={<PatientLayout />} path={ROUTES.patientRoot}>
          <Route
            element={<Navigate replace to={ROUTES.patientHome} />}
            index
          />
          <Route element={<PatientHomePage />} path="inicio" />
          <Route element={<PatientSearchStudentsPage />} path="buscar-estudiantes" />
          <Route element={<PatientRequestsPage />} path="solicitudes" />
          <Route element={<PatientAgendaPage />} path="agenda" />
          <Route element={<PatientNotificationsPage />} path="notificaciones" />
          <Route element={<PatientConversationsPage />} path="conversaciones" />
          <Route element={<PatientAppointmentsPage />} path="citas" />
          <Route element={<PatientProfilePage />} path="mi-perfil" />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('Patient pages', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetPatientModuleState();
  });

  it('permite actualizar el perfil del paciente', async () => {
    const user = userEvent.setup();

    renderPatientApp([ROUTES.patientProfile]);

    await user.clear(screen.getByLabelText(/^celular$/i));
    await user.type(screen.getByLabelText(/^celular$/i), '3012223344');
    await user.clear(screen.getByLabelText(/ciudad principal/i));
    await user.type(screen.getByLabelText(/ciudad principal/i), 'Cali');
    await user.clear(screen.getByLabelText(/localidad principal/i));
    await user.type(screen.getByLabelText(/localidad principal/i), 'San Fernando');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      /tu perfil se actualizo correctamente/i,
    );
    expect(screen.getByText(/3012223344/i)).toBeInTheDocument();
    expect(screen.getByText(/cali - san fernando/i)).toBeInTheDocument();
  });

  it('muestra comentarios del paciente y permite filtrarlos por estrellas', async () => {
    const user = userEvent.setup();

    renderPatientApp([ROUTES.patientHome]);

    expect(
      await screen.findByRole('heading', { name: /bienvenido, sara lopez/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('patient-review-comments-dashboard')).toHaveTextContent('3');
    expect(screen.getByTestId('patient-review-card-patient-review-1')).toBeInTheDocument();
    expect(screen.getByTestId('patient-review-card-patient-review-2')).toBeInTheDocument();
    expect(screen.getByTestId('patient-review-card-patient-review-3')).toBeInTheDocument();

    await user.click(screen.getByTestId('patient-review-rating-filter-button'));
    await user.click(screen.getByRole('menuitemradio', { name: /4 estrellas/i }));

    expect(screen.queryByTestId('patient-review-card-patient-review-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('patient-review-card-patient-review-2')).toBeInTheDocument();
    expect(screen.queryByTestId('patient-review-card-patient-review-3')).not.toBeInTheDocument();
  });

  it('permite filtrar estudiantes y enviar una nueva solicitud', async () => {
    const user = userEvent.setup();

    renderPatientApp([ROUTES.patientSearchStudents]);

    expect(
      screen.getByRole('heading', { name: /estudiantes recomendados para ti/i }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText(/ciudad/i)).toHaveValue('Bogota');
      expect(screen.getByLabelText(/localidad/i)).toHaveValue('Chapinero');
      expect(screen.getByText(/daniel pardo/i)).toBeInTheDocument();
    });

    await user.type(
      screen.getByPlaceholderText(/buscar por nombre de estudiante/i),
      'clinica',
    );
    await waitFor(() => {
      expect(
        screen.queryByTestId('patient-student-card-patient-student-1'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('patient-student-card-patient-student-2'),
      ).not.toBeInTheDocument();
    });

    await user.clear(screen.getByPlaceholderText(/buscar por nombre de estudiante/i));
    await user.selectOptions(screen.getByLabelText(/ciudad/i), 'all');
    await user.selectOptions(screen.getByLabelText(/tratamiento/i), 'Rehabilitacion oral');

    await waitFor(() => {
      expect(screen.queryByText(/daniel pardo/i)).not.toBeInTheDocument();
      expect(screen.getByTestId('patient-student-card-patient-student-3')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('patient-student-card-patient-student-3'));
    await user.type(
      screen.getByLabelText(/motivo de la solicitud/i),
      'Necesito una nueva valoracion para seguimiento restaurativo.',
    );
    await user.click(screen.getByRole('button', { name: /enviar solicitud/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      /tu solicitud fue enviada a camila perez/i,
    );
  });

  it('permite cancelar una solicitud pendiente', async () => {
    const user = userEvent.setup();

    renderPatientApp([ROUTES.patientRequests]);

    await user.click(
      within(screen.getByTestId('patient-request-row-patient-request-2')).getByRole('button', {
        name: /cancelar solicitud/i,
      }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(/solicitud actualizada:/i);
    await waitFor(() => {
      expect(
        within(screen.getByTestId('patient-request-row-patient-request-2')).getByText(
          /^Cancelada$/i,
        ),
      ).toBeInTheDocument();
    });
  });

  it('permite enviar un mensaje en una conversacion activa', async () => {
    const user = userEvent.setup();

    renderPatientApp([ROUTES.patientConversations]);

    await user.type(
      screen.getByLabelText(/mensaje para el estudiante/i),
      'Hola, confirmo que estare pendiente de la propuesta de horario.',
    );
    await user.click(screen.getByRole('button', { name: /enviar mensaje/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      /conversacion actualizada:/i,
    );
    expect(
      within(
        screen.getByTestId('patient-conversation-thread-patient-conversation-1'),
      ).getByText(/hola, confirmo que estare pendiente de la propuesta de horario/i),
    ).toBeInTheDocument();
  });

  it('permite aceptar una cita propuesta', async () => {
    const user = userEvent.setup();

    renderPatientApp([ROUTES.patientAppointments]);

    await user.click(
      within(
        screen.getByTestId('patient-appointment-row-patient-appointment-1'),
      ).getByRole('button', { name: /aceptar/i }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(/cita actualizada:/i);
    await waitFor(() => {
      expect(
        within(
          screen.getByTestId('patient-appointment-row-patient-appointment-1'),
        ).getByText(/^Aceptada$/i),
      ).toBeInTheDocument();
    });
  });

  it('permite rechazar una reprogramacion propuesta', async () => {
    const user = userEvent.setup();

    renderPatientApp([ROUTES.patientAppointments]);

    expect(
      within(
        screen.getByTestId('patient-appointment-row-patient-appointment-4'),
      ).getByText(/reprogramacion propuesta/i),
    ).toBeInTheDocument();

    await user.click(
      within(
        screen.getByTestId('patient-appointment-row-patient-appointment-4'),
      ).getByRole('button', { name: /rechazar/i }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(
      /reprogramacion fue rechazada/i,
    );
    await waitFor(() => {
      expect(
        within(
          screen.getByTestId('patient-appointment-row-patient-appointment-4'),
        ).getByText(/^Aceptada$/i),
      ).toBeInTheDocument();
    });
  });

  it('permite marcar todas las notificaciones del paciente como leidas', async () => {
    const user = userEvent.setup();

    renderPatientApp([ROUTES.patientNotifications]);

    expect(await screen.findByRole('heading', { name: /^Notificaciones$/i })).toBeInTheDocument();
    expect(screen.getAllByText(/^Sin leer$/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /marcar todas como leidas/i }));

    await waitFor(() => {
      expect(screen.queryByText(/^Sin leer$/i)).not.toBeInTheDocument();
    });
  });
});
