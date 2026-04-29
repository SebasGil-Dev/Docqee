import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/shared/database/prisma.service';

@Injectable()
export class ListRegisterCatalogUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const [cities, documentTypes, localities] = await Promise.all([
      this.prisma.ciudad.findMany({
        orderBy: { nombre: 'asc' },
        select: {
          id_ciudad: true,
          nombre: true,
        },
      }),
      this.prisma.tipo_documento.findMany({
        orderBy: { id_tipo_documento: 'asc' },
        select: {
          codigo: true,
          id_tipo_documento: true,
          nombre: true,
        },
      }),
      this.prisma.localidad.findMany({
        orderBy: [{ id_ciudad: 'asc' }, { nombre: 'asc' }],
        select: {
          id_ciudad: true,
          id_localidad: true,
          nombre: true,
        },
      }),
    ]);

    return {
      cities: cities.map((city) => ({
        id: city.id_ciudad,
        name: city.nombre,
      })),
      documentTypes: documentTypes.map((documentType) => ({
        id: documentType.id_tipo_documento,
        name: `${documentType.codigo}|${documentType.nombre}`,
      })),
      localities: localities.map((locality) => ({
        cityId: locality.id_ciudad,
        id: locality.id_localidad,
        name: locality.nombre,
      })),
    };
  }
}
