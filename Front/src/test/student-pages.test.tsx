import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MemoryRouterProps } from 'react-router-dom';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@/constants/routes';
import { resetStudentModuleState } from '@/lib/studentModuleStore';
import { StudentAgendaPage } from '@/pages/student/agenda/StudentAgendaPage';
import { StudentAppointmentsPage } from '@/pages/student/appointments/StudentAppointmentsPage';
import { StudentConversationsPage } from '@/pages/student/conversations/StudentConversationsPage';
import { StudentLayout } from '@/pages/student/StudentLayout';
import { StudentNotificationsPage } from '@/pages/student/notifications/StudentNotificationsPage';
import { StudentProfilePage } from '@/pages/student/profile/StudentProfilePortalPage';
import { StudentRequestsPage } from '@/pages/student/requests/StudentRequestsPage';
import {
  getStudentDisplayName,
  StudentTreatmentsPage,
} from '@/pages/student/treatments/StudentTreatmentsPage';

function renderStudentApp(
  initialEntries: MemoryRouterProps['initialEntries'] = [ROUTES.studentProfile],
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route element={<StudentLayout />} path={ROUTES.studentRoot}>
          <Route
            element={<Navigate replace to={ROUTES.studentTreatments} />}
            index
          />
          <Route element={<StudentProfilePage />} path="mi-perfil" />
          <Route
            element={<StudentTreatmentsPage />}
            path="inicio"
          />
          <Route
            element={<Navigate replace to={ROUTES.studentTreatments} />}
            path="tratamientos-y-sedes"
          />
          <Route element={<StudentAgendaPage />} path="agenda" />
          <Route element={<StudentAppointmentsPage />} path="citas" />
          <Route element={<StudentRequestsPage />} path="solicitudes" />
          <Route element={<StudentNotificationsPage />} path="notificaciones" />
          <Route element={<StudentConversationsPage />} path="conversaciones" />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function mockStudentViewport(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
}

describe('Student pages', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    mockStudentViewport(false);
    resetStudentModuleState();
  });

  it('formatea el nombre del estudiante segun el tamano de pantalla', () => {
    expect(getStudentDisplayName('Carlos Andres', 'Gomez Cardona')).toEqual({
      compactName: 'Carlos Gomez',
      fullName: 'Carlos Andres Gomez Cardona',
    });
  });

  it('permite actualizar el perfil y agregar un enlace profesional', async () => {
    const user = userEvent.setup();

    renderStudentApp([ROUTES.studentProfile]);

    expect(
      screen.queryByRole('button', { name: /guardar tratamientos/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /guardar sedes/i }),
    ).not.toBeInTheDocument();

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

    await user.click(screen.getByRole('button', { name: /red profesional/i }));
    await user.click(screen.getByRole('option', { name: /hoja de vida/i }));
    await user.type(
      screen.getByLabelText(/^url$/i),
      'https://drive.google.com/file/d/demo-cv',
    );
    await user.click(screen.getByRole('button', { name: /agregar enlace/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      /^tu perfil se actualizo correctamente\.$/i,
    );
    expect(screen.getByText(/https:\/\/drive.google.com\/file\/d\/demo-cv/i)).toBeInTheDocument();
  });

  it('solicita confirmacion para eliminar un enlace profesional y lo guarda de inmediato', async () => {
    const user = userEvent.setup();

    renderStudentApp([ROUTES.studentProfile]);

    await user.click(
      screen.getByRole('button', {
        name: /eliminar enlace https:\/\/linkedin\.com\/in\/valentina-rios-docqee/i,
      }),
    );

    const confirmDialog = screen.getByRole('dialog', { name: /eliminar enlace/i });
    expect(
      within(confirmDialog).getByText(/este cambio se guardará automáticamente/i),
    ).toBeInTheDocument();

    await user.click(
      within(confirmDialog).getByRole('button', { name: /sí, eliminar enlace/i }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(
      /^tu perfil se actualizo correctamente\.$/i,
    );

    await waitFor(() => {
      expect(
        screen.queryByText(/https:\/\/linkedin\.com\/in\/valentina-rios-docqee/i),
      ).not.toBeInTheDocument();
    });
  });

  it('muestra notificaciones del estudiante en el header', async () => {
    const user = userEvent.setup();

    renderStudentApp([ROUTES.studentProfile]);

    await user.click(screen.getByRole('button', { name: /notificaciones/i }));

    expect(screen.getByRole('dialog', { name: /panel de notificaciones/i })).toBeInTheDocument();
    expect(screen.getByText(/nueva solicitud de ana maria perez/i)).toBeInTheDocument();
    expect(screen.getByText(/julian torres acepto la cita/i)).toBeInTheDocument();
    expect(screen.getByText(/solicitud de reprogramacion/i)).toBeInTheDocument();
    expect(screen.getByText(/ricardo suarez cancelo la cita/i)).toBeInTheDocument();
  });

  it('mantiene notificaciones en el header y perfil en el menu hamburguesa en movil', async () => {
    mockStudentViewport(true);
    const user = userEvent.setup();

    renderStudentApp([ROUTES.studentTreatments]);

    const mobileNavigation = screen.getByRole('navigation', {
      name: /navegacion inferior administrativa/i,
    });

    expect(
      within(mobileNavigation).getByRole('link', { name: /^Inicio$/i }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      within(mobileNavigation).getByRole('link', { name: /^Solicitudes$/i }),
    ).toBeInTheDocument();
    expect(
      within(mobileNavigation).getByRole('link', { name: /^Citas$/i }),
    ).toBeInTheDocument();
    expect(
      within(mobileNavigation).getByRole('link', { name: /^Agenda$/i }),
    ).toBeInTheDocument();
    expect(
      within(mobileNavigation).getByRole('link', { name: /^Chat$/i }),
    ).toBeInTheDocument();
    expect(
      within(mobileNavigation).queryByRole('link', { name: /notificaciones/i }),
    ).not.toBeInTheDocument();
    expect(
      within(mobileNavigation).queryByRole('link', { name: /perfil/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Notificaciones(?: \(\d+\))?$/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Notificaciones(?: \(\d+\))?$/i }));

    expect(screen.getByRole('dialog', { name: /panel de notificaciones/i })).toBeInTheDocument();
    expect(screen.getByText(/nueva solicitud de ana maria perez/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /abrir men[u\u00fa] de cuenta/i }),
    );

    expect(
      screen.getByRole('menuitem', { name: /notificaciones/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /perfil/i })).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /cerrar sesi[o\u00f3]n/i }),
    ).toBeInTheDocument();
  });

  it('muestra un mensaje cuando ya no quedan notificaciones sin leer en el header', async () => {
    const user = userEvent.setup();

    renderStudentApp([ROUTES.studentProfile]);

    await user.click(screen.getByRole('button', { name: /notificaciones/i }));
    await user.click(screen.getByRole('button', { name: /marcar todas/i }));

    expect(
      await screen.findByText(/no tienes notificaciones sin leer/i),
    ).toBeInTheDocument();
  });

  it('abre la pantalla de notificaciones del estudiante al seleccionar una alerta', async () => {
    const user = userEvent.setup();

    renderStudentApp([ROUTES.studentProfile]);

    await user.click(screen.getByRole('button', { name: /notificaciones/i }));
    await user.click(screen.getByText(/nueva solicitud de ana maria perez/i));

    expect(await screen.findByRole('heading', { name: /^Notificaciones$/i })).toBeInTheDocument();
    expect(screen.getByText(/dolor dental persistente y revision general/i)).toBeInTheDocument();
    expect(
      within(
        screen.getByTestId(
          'portal-notification-card-student-request-student-request-1-PENDIENTE',
        ),
      ).getByRole('link', { name: /ver detalle/i }),
    ).toBeInTheDocument();
  });

  it('muestra el resumen de valoraciones y comentarios del estudiante', async () => {
    const user = userEvent.setup();

    renderStudentApp([ROUTES.studentTreatments]);

    expect(screen.getByRole('link', { name: /^inicio$/i })).toBeInTheDocument();
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

    expect(screen.getByRole('button', { name: /^Semana$/i })).toBeInTheDocument();
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

    expect(
      screen.queryByText(/revisa las solicitudes de pacientes/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/^Conversaciones activas$/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/buscar por nombre del paciente/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: /^Seguimiento$/i }),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId('student-request-row-student-request-1')).getByText(
        /bogota - chapinero/i,
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('student-request-row-student-request-1')).getByText(/envio:/i),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('student-request-row-student-request-1')).queryByText(/a\u00f1os/i),
    ).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/buscar paciente/i), 'Soacha');

    expect(screen.queryByText(/claudia moreno/i)).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText(/buscar paciente/i));

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

  it('permite revisar el perfil del paciente antes de responder la solicitud', async () => {
    const user = userEvent.setup();

    renderStudentApp([ROUTES.studentRequests]);

    await user.click(
      within(screen.getByTestId('student-request-row-student-request-1')).getByRole('button', {
        name: /ver perfil de ana maria perez/i,
      }),
    );

    const dialog = screen.getByRole('dialog', { name: /perfil de ana maria perez/i });

    expect(within(dialog).queryByText(/^Numero$/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/^3001234567$/i)).not.toBeInTheDocument();
    expect(within(dialog).getByText(/valoraci[o\u00f3]n/i)).toBeInTheDocument();
    expect(
      within(dialog).queryByText(/sin valoraciones registradas/i),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByText(
        /cumplio con el horario acordado y mantuvo una comunicacion clara/i,
      ),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /^Aceptar$/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/la solicitud fue aceptada/i);
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: /perfil de ana maria perez/i }),
      ).not.toBeInTheDocument();
    });
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

    expect(
      await within(screen.getByTestId('student-conversation-thread-student-conversation-1')).findByText(
        /hola julian, manana en la tarde te puedo compartir una propuesta de horario/i,
      ),
    ).toBeInTheDocument();
  });
});
