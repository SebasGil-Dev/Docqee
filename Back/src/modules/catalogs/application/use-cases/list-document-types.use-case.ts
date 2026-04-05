import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/shared/database/prisma.service';
import { CatalogOptionDto } from '../dto/catalog-option.dto';

const DEFAULT_DOCUMENT_TYPES = [
  { codigo: 'CC', nombre: 'Cedula de ciudadania' },
  { codigo: 'CE', nombre: 'Cedula de extranjeria' },
  { codigo: 'TI', nombre: 'Tarjeta de identidad' },
  { codigo: 'PASSPORT', nombre: 'Pasaporte' },
] as const;

@Injectable()
export class ListDocumentTypesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<CatalogOptionDto[]> {
    for (const documentType of DEFAULT_DOCUMENT_TYPES) {
      await this.prisma.tipo_documento.upsert({
        where: { codigo: documentType.codigo },
        create: {
          codigo: documentType.codigo,
          nombre: documentType.nombre,
        },
        update: {
          nombre: documentType.nombre,
        },
      });
    }

    const documentTypes = await this.prisma.tipo_documento.findMany({
      orderBy: { id_tipo_documento: 'asc' },
      select: {
        id_tipo_documento: true,
        codigo: true,
        nombre: true,
      },
    });

    return documentTypes.map((documentType) => ({
      id: documentType.id_tipo_documento,
      name: `${documentType.codigo}|${documentType.nombre}`,
    }));
  }
}
