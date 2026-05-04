# Students module

Gestiona estudiantes desde el rol de administrador de universidad.

## Endpoints

- `GET /students`
- `POST /students`
- `POST /students/bulk`
- `PATCH /students/:studentId/status`

## Capacidades

- Listar estudiantes de la universidad autenticada.
- Crear estudiante individual.
- Crear estudiantes en lote desde la carga masiva del frontend.
- Activar o inactivar estudiantes.
- Generar credencial inicial pendiente para primer ingreso.

## Notas

La carga masiva real se procesa aqui mediante `POST /students/bulk`; no existe un modulo backend separado de `bulk-upload` conectado.
