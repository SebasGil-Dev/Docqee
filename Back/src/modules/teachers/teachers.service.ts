import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { estado_simple_enum } from '@prisma/client';

import { PrismaService } from '@/shared/database/prisma.service';
import type { RequestUser } from '@/shared/types/request-user.type';
import {
  buildDocumentTypeFrontId,
  extractNumericId,
  normalizeText,
} from '@/shared/utils/front-format.util';
import { BulkCreateTeachersDto } from './application/dto/bulk-create-teachers.dto';
import { CreateTeacherDto } from './application/dto/create-teacher.dto';

const DEFAULT_DOCUMENT_TYPES = [
  { codigo: 'CC', nombre: 'Cedula de ciudadania' },
  { codigo: 'CE', nombre: 'Cedula de extranjeria' },
  { codigo: 'TI', nombre: 'Tarjeta de identidad' },
  { codigo: 'PASSPORT', nombre: 'Pasaporte' },
] as const;

type ResolvedDocumentType = {
  codigo: string;
  id_tipo_documento: number;
};

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  async listTeachers(user: RequestUser) {
    const universityId = this.getUniversityId(user);
    const teachers = await this.prisma.docente_universidad.findMany({
      where: {
        id_universidad: universityId,
      },
      include: {
        docente: {
          include: {
            tipo_documento: true,
          },
        },
      },
      orderBy: {
        fecha_creacion: 'desc',
      },
    });

    return teachers.map((teacher) => ({
      createdAt: teacher.fecha_creacion.toISOString(),
      documentNumber: teacher.docente.numero_documento,
      documentTypeCode: teacher.docente.tipo_documento.codigo,
      documentTypeId: buildDocumentTypeFrontId(teacher.docente.tipo_documento.codigo),
      firstName: teacher.docente.nombres,
      id: String(teacher.id_docente_universidad),
      lastName: teacher.docente.apellidos,
      status: teacher.estado === estado_simple_enum.ACTIVO ? 'active' : 'inactive',
    }));
  }

  async createTeacher(user: RequestUser, input: CreateTeacherDto) {
    const universityId = this.getUniversityId(user);
    const documentType = await this.resolveDocumentType(input.documentType);
    const documentNumber = normalizeText(input.documentNumber);

    const existingTeacher = await this.prisma.docente.findFirst({
      where: {
        id_tipo_documento: documentType.id_tipo_documento,
        numero_documento: documentNumber,
      },
    });

    const teacher =
      existingTeacher ??
      (await this.prisma.docente.create({
        data: {
          id_tipo_documento: documentType.id_tipo_documento,
          numero_documento: documentNumber,
          nombres: normalizeText(input.firstName),
          apellidos: normalizeText(input.lastName),
        },
      }));

    const existingLink = await this.prisma.docente_universidad.findFirst({
      where: {
        id_docente: teacher.id_docente,
        id_universidad: universityId,
      },
      select: { id_docente_universidad: true },
    });

    if (existingLink) {
      throw new ConflictException('Este docente ya se encuentra vinculado a la universidad.');
    }

    await this.prisma.docente_universidad.create({
      data: {
        id_docente: teacher.id_docente,
        id_universidad: universityId,
        estado: estado_simple_enum.ACTIVO,
      },
    });

    const teachers = await this.listTeachers(user);
    return teachers[0] ?? null;
  }

  async bulkCreateTeachers(user: RequestUser, input: BulkCreateTeachersDto) {
    return this.bulkCreateTeachersOptimized(this.getUniversityId(user), input.rows);
    const universityId = this.getUniversityId(user);
    const errors: { row: number; column: string; message: string }[] = [];
    let created = 0;

    for (let i = 0; i < input.rows.length; i++) {
      const row = input.rows[i];
      const rowNum = i + 2;

      if (!row) continue;

      try {
        const documentType = await this.resolveDocumentType(row.tipo_documento);
        const documentNumber = normalizeText(row.numero_documento);

        const existingTeacher = await this.prisma.docente.findFirst({
          where: { id_tipo_documento: documentType.id_tipo_documento, numero_documento: documentNumber },
        });

        const teacher =
          existingTeacher ??
          (await this.prisma.docente.create({
            data: {
              id_tipo_documento: documentType.id_tipo_documento,
              numero_documento: documentNumber,
              nombres: normalizeText(row.nombres),
              apellidos: normalizeText(row.apellidos),
            },
          }));

        const existingLink = await this.prisma.docente_universidad.findFirst({
          where: { id_docente: teacher.id_docente, id_universidad: universityId },
          select: { id_docente_universidad: true },
        });

        if (existingLink) {
          errors.push({ row: rowNum, column: 'numero_documento', message: `El docente con documento "${row.numero_documento}" ya está vinculado a esta universidad.` });
          continue;
        }

        await this.prisma.docente_universidad.create({
          data: { id_docente: teacher.id_docente, id_universidad: universityId, estado: estado_simple_enum.ACTIVO },
        });

        created++;
      } catch {
        errors.push({ row: rowNum, column: 'general', message: 'Error inesperado al procesar esta fila.' });
      }
    }

    return { created, createdCredentials: 0, errors };
  }

  private async bulkCreateTeachersOptimized(
    universityId: number,
    rows: BulkCreateTeachersDto['rows'],
  ) {
    const errors: { row: number; column: string; message: string }[] = [];
    let created = 0;
    const preparedRows = rows
      .map((row, index) => {
        if (!row) {
          return null;
        }

        return {
          documentNumber: normalizeText(row.numero_documento),
          firstName: normalizeText(row.nombres),
          lastName: normalizeText(row.apellidos),
          originalDocumentNumber: row.numero_documento,
          rowNum: index + 2,
          tipoDocumento: row.tipo_documento,
        };
      })
      .filter(
        (
          row,
        ): row is {
          documentNumber: string;
          firstName: string;
          lastName: string;
          originalDocumentNumber: string;
          rowNum: number;
          tipoDocumento: string;
        } => row !== null,
      );
    const documentTypesByIdentifier = await this.getDocumentTypeMap(
      preparedRows.map((row) => row.tipoDocumento),
    );
    const documentCounts = new Map<string, number>();
    const preparedRowsWithDocumentType = preparedRows.map((row) => {
      const documentType = this.getDocumentTypeFromMap(
        documentTypesByIdentifier,
        row.tipoDocumento,
      );

      if (documentType) {
        const documentKey = this.buildDocumentKey(
          documentType.id_tipo_documento,
          row.documentNumber,
        );

        documentCounts.set(documentKey, (documentCounts.get(documentKey) ?? 0) + 1);
      }

      return {
        ...row,
        documentType,
      };
    });
    const rowsWithResolvedDocumentType = preparedRowsWithDocumentType.filter(
      (
        row,
      ): row is typeof row & {
        documentType: ResolvedDocumentType;
      } => row.documentType !== null,
    );
    const existingTeachers =
      rowsWithResolvedDocumentType.length > 0
        ? await this.prisma.docente.findMany({
            where: {
              OR: rowsWithResolvedDocumentType.map((row) => ({
                id_tipo_documento: row.documentType.id_tipo_documento,
                numero_documento: row.documentNumber,
              })),
            },
            select: {
              id_docente: true,
              id_tipo_documento: true,
              numero_documento: true,
            },
          })
        : [];
    const existingTeachersByDocumentKey = new Map(
      existingTeachers.map((teacher) => [
        this.buildDocumentKey(teacher.id_tipo_documento, teacher.numero_documento),
        teacher,
      ]),
    );
    const existingLinks =
      existingTeachers.length > 0
        ? new Set(
            (
              await this.prisma.docente_universidad.findMany({
                where: {
                  id_universidad: universityId,
                  id_docente: {
                    in: existingTeachers.map((teacher) => teacher.id_docente),
                  },
                },
                select: {
                  id_docente: true,
                },
              })
            ).map((teacherLink) => teacherLink.id_docente),
          )
        : new Set<number>();

    for (const row of preparedRowsWithDocumentType) {
      if (!row.documentType) {
        errors.push({
          row: row.rowNum,
          column: 'tipo_documento',
          message: `El tipo de documento "${row.tipoDocumento}" no existe.`,
        });
        continue;
      }

      const documentKey = this.buildDocumentKey(
        row.documentType.id_tipo_documento,
        row.documentNumber,
      );

      if ((documentCounts.get(documentKey) ?? 0) > 1) {
        errors.push({
          row: row.rowNum,
          column: 'numero_documento',
          message: `El documento "${row.originalDocumentNumber}" esta duplicado dentro del archivo.`,
        });
        continue;
      }

      const existingTeacher = existingTeachersByDocumentKey.get(documentKey);

      if (existingTeacher && existingLinks.has(existingTeacher.id_docente)) {
        errors.push({
          row: row.rowNum,
          column: 'numero_documento',
          message: `El docente con documento "${row.originalDocumentNumber}" ya esta vinculado a esta universidad.`,
        });
        continue;
      }

      try {
        if (existingTeacher) {
          await this.prisma.docente_universidad.create({
            data: {
              id_docente: existingTeacher.id_docente,
              id_universidad: universityId,
              estado: estado_simple_enum.ACTIVO,
            },
          });

          existingLinks.add(existingTeacher.id_docente);
          created++;
          continue;
        }

        const teacher = await this.prisma.docente.create({
          data: {
            id_tipo_documento: row.documentType.id_tipo_documento,
            numero_documento: row.documentNumber,
            nombres: row.firstName,
            apellidos: row.lastName,
          },
          select: {
            id_docente: true,
            id_tipo_documento: true,
            numero_documento: true,
          },
        });

        await this.prisma.docente_universidad.create({
          data: {
            id_docente: teacher.id_docente,
            id_universidad: universityId,
            estado: estado_simple_enum.ACTIVO,
          },
        });

        existingTeachersByDocumentKey.set(documentKey, teacher);
        existingLinks.add(teacher.id_docente);
        created++;
      } catch {
        errors.push({
          row: row.rowNum,
          column: 'general',
          message: 'Error inesperado al procesar esta fila.',
        });
      }
    }

    return { created, createdCredentials: 0, errors };
  }

  async toggleTeacherStatus(user: RequestUser, teacherIdentifier: string) {
    const universityId = this.getUniversityId(user);
    const teacherId = this.parseEntityId(teacherIdentifier, 'docente');
    const teacherLink = await this.prisma.docente_universidad.findFirst({
      where: {
        id_docente_universidad: teacherId,
        id_universidad: universityId,
      },
    });

    if (!teacherLink) {
      throw new NotFoundException('El docente solicitado no existe.');
    }

    const nextState =
      teacherLink.estado === estado_simple_enum.ACTIVO
        ? estado_simple_enum.INACTIVO
        : estado_simple_enum.ACTIVO;

    await this.prisma.docente_universidad.update({
      where: { id_docente_universidad: teacherLink.id_docente_universidad },
      data: {
        estado: nextState,
      },
    });

    return {
      status: nextState === estado_simple_enum.ACTIVO ? 'active' : 'inactive',
      teacherId: String(teacherLink.id_docente_universidad),
    };
  }

  private getUniversityId(user: RequestUser) {
    if (user.role !== 'UNIVERSITY_ADMIN' || !user.universityId) {
      throw new ForbiddenException('Este recurso es exclusivo del administrador universitario.');
    }

    return user.universityId;
  }

  private parseEntityId(identifier: string, entityLabel: string) {
    const entityId = extractNumericId(identifier);

    if (!entityId) {
      throw new BadRequestException(`El identificador de ${entityLabel} no es valido.`);
    }

    return entityId;
  }

  private async ensureDefaultDocumentTypes() {
    await this.prisma.tipo_documento.createMany({
      data: DEFAULT_DOCUMENT_TYPES.map((documentType) => ({
        codigo: documentType.codigo,
        nombre: documentType.nombre,
      })),
      skipDuplicates: true,
    });
  }

  private async getDocumentTypeMap(identifiers: string[]) {
    await this.ensureDefaultDocumentTypes();

    const normalizedCodes = [
      ...new Set(
        identifiers.map((identifier) => this.normalizeDocumentTypeIdentifier(identifier)),
      ),
    ];
    const numericIds = [
      ...new Set(
        identifiers
          .map((identifier) => extractNumericId(identifier))
          .filter((identifier): identifier is number => identifier !== null),
      ),
    ];
    const whereClauses: Array<Record<string, unknown>> = [];

    if (normalizedCodes.length > 0) {
      whereClauses.push({ codigo: { in: normalizedCodes } });
    }

    if (numericIds.length > 0) {
      whereClauses.push({ id_tipo_documento: { in: numericIds } });
    }

    const documentTypes =
      whereClauses.length > 0
        ? await this.prisma.tipo_documento.findMany({
            where: {
              OR: whereClauses,
            },
            select: {
              codigo: true,
              id_tipo_documento: true,
            },
          })
        : [];
    const documentTypeMap = new Map<string, ResolvedDocumentType>();

    documentTypes.forEach((documentType) => {
      documentTypeMap.set(documentType.codigo.toUpperCase(), documentType);
      documentTypeMap.set(String(documentType.id_tipo_documento), documentType);
      documentTypeMap.set(buildDocumentTypeFrontId(documentType.codigo), documentType);
    });

    return documentTypeMap;
  }

  private getDocumentTypeFromMap(
    documentTypesByIdentifier: Map<string, ResolvedDocumentType>,
    identifier: string,
  ) {
    const numericId = extractNumericId(identifier);

    return (
      documentTypesByIdentifier.get(this.normalizeDocumentTypeIdentifier(identifier)) ??
      (numericId ? documentTypesByIdentifier.get(String(numericId)) : undefined) ??
      null
    );
  }

  private normalizeDocumentTypeIdentifier(identifier: string) {
    return normalizeText(identifier).replace(/^document-/i, '').toUpperCase();
  }

  private buildDocumentKey(documentTypeId: number, documentNumber: string) {
    return `${documentTypeId}:${documentNumber}`;
  }

  private async resolveDocumentType(identifier: string) {
    await this.ensureDefaultDocumentTypes();

    const documentType = await this.prisma.tipo_documento.findFirst({
      where: {
        OR: [
          { codigo: this.normalizeDocumentTypeIdentifier(identifier) },
          { id_tipo_documento: extractNumericId(identifier) ?? -1 },
        ],
      },
    });

    if (!documentType) {
      throw new NotFoundException('El tipo de documento solicitado no existe.');
    }

    return documentType;
  }
}
