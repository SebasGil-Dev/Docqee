# Student Portal integration notes

## Frontend contract already prepared

The frontend student module expects these shapes and endpoints:

### Dashboard
- `GET /student-portal/dashboard`
- Response: `StudentPortalDashboardDto`

### Profile
- `PATCH /student-portal/profile`
- Body: `UpdateStudentProfileDto`
- Response: `StudentProfileDto`

### Treatments and practice sites
- `PATCH /student-portal/treatments/:treatmentId/status`
- `PATCH /student-portal/practice-sites/:practiceSiteId/status`
- Suggested response:
  - `{ treatmentId: string, status: 'active' | 'inactive' }`
  - `{ practiceSiteId: string, status: 'active' | 'inactive' }`

### Schedule blocks
- `POST /student-portal/schedule-blocks`
- `PATCH /student-portal/schedule-blocks/:blockId`
- `PATCH /student-portal/schedule-blocks/:blockId/status`

### Requests
- `PATCH /student-portal/requests/:requestId/status`
- Body: `UpdateStudentRequestStatusDto`
- Response: `StudentRequestDto`

## Mapping hints from the data model
- `perfil_estudiante` -> profile biography, photo, availability.
- `enlace_profesional` -> profile links.
- `estudiante_tratamiento` -> treatments.
- `estudiante_sede_practica` -> practice sites.
- `horario_bloqueado` -> schedule blocks.
- `solicitud` + `conversacion` + `cita` -> student requests dashboard.

## Important business notes
- Student portal should only resolve data for the authenticated `ESTUDIANTE`.
- Active/inactive toggles should respect the owning university and current account state.
- Request status transitions should align with the domain rules already defined for `solicitud`.
