# Teachers module

Gestiona docentes desde el rol de administrador de universidad.

## Endpoints

- `GET /teachers`
- `POST /teachers`
- `POST /teachers/bulk`
- `PATCH /teachers/:teacherId/status`

## Capacidades

- Listar docentes vinculados a la universidad autenticada.
- Crear docente individual.
- Crear docentes en lote desde la carga masiva del frontend.
- Activar o inactivar la vinculacion docente-universidad.

## Notas

El modelo permite reutilizar la identidad docente y vincularla a universidades mediante la relacion institucional correspondiente.
