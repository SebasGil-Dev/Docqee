# Catalogs module

Expone catalogos reutilizables para formularios publicos y privados.

## Endpoints

- `GET /catalogs/register`
- `GET /catalogs/cities`
- `GET /catalogs/document-types`
- `GET /catalogs/localities/:cityId`

## Datos principales

- Tipos de documento.
- Ciudades.
- Localidades por ciudad.
- Catalogo combinado para registro de paciente.

## Notas

Los catalogos salen de la base de datos por Prisma. El frontend no deberia duplicar estas listas como datos fijos salvo para estados visuales temporales.
