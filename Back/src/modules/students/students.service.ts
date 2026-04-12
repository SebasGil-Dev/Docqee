import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { estado_simple_enum, tipo_cuenta_enum } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '@/shared/database/prisma.service';
import type { RequestUser } from '@/shared/types/request-user.type';
import {
  buildDocumentTypeFrontId,
  extractNumericId,
  generateTemporaryPassword,
  normalizeEmail,
  normalizeText,
} from '@/shared/utils/front-format.util';
import { BulkCreateStudentsDto } from './application/dto/bulk-create-students.dto';
import { CreateStudentDto } from './application/dto/create-student.dto';

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
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listStudents(user: RequestUser) {
    const universityId = this.getUniversityId(user);
    const students = await this.prisma.cuenta_estudiante.findMany({
      where: { id_universidad: universityId },
      include: {
        cuenta_acceso: {
          include: {
            credencial_inicial: true,
          },
        },
        persona: {
          include: {
            tipo_documento: true,
          },
        },
      },
      orderBy: {
        fecha_creacion: 'desc',
      },
    });

    return students.map((student) => ({
      createdAt: student.fecha_creacion.toISOString(),
      credentialId:
        student.cuenta_acceso.credencial_inicial &&
        student.cuenta_acceso.credencial_inicial.anulada_at === null
          ? String(student.cuenta_acceso.credencial_inicial.id_credencial_inicial)
          : null,
      documentNumber: student.persona.numero_documento,
      documentTypeCode: student.persona.tipo_documento.codigo,
      documentTypeId: buildDocumentTypeFrontId(student.persona.tipo_documento.codigo),
      email: student.cuenta_acceso.correo,
      firstName: student.persona.nombres,
      id: String(student.id_cuenta),
      lastName: student.persona.apellidos,
      phone: student.celular,
      semester: String(student.semestre),
      status: student.cuenta_acceso.estado === estado_simple_enum.ACTIVO ? 'active' : 'inactive',
    }));
  }

  async createStudent(user: RequestUser, input: CreateStudentDto) {
    const universityId = this.getUniversityId(user);
    const email = normalizeEmail(input.email);
    const phone = input.phone ? normalizeText(input.phone) : '';
    const documentType = await this.resolveDocumentType(input.documentType);

    const [existingAccount, existingPerson] = await Promise.all([
      this.prisma.cuenta_acceso.findUnique({
        where: { correo: email },
        select: { id_cuenta: true },
      }),
      this.prisma.persona.findFirst({
        where: {
          id_tipo_documento: documentType.id_tipo_documento,
          numero_documento: normalizeText(input.documentNumber),
        },
        select: { id_persona: true },
      }),
    ]);

    if (existingAccount) {
      throw new ConflictException('Ya existe una cuenta registrada con este correo.');
    }

    if (existingPerson) {
      throw new ConflictException('Ya existe un estudiante registrado con este documento.');
    }

    const passwordHash = await bcrypt.hash(generateTemporaryPassword(), 10);

    await this.prisma.$transaction(async (transaction) => {
      const person = await transaction.persona.create({
        data: {
          id_tipo_documento: documentType.id_tipo_documento,
          numero_documento: normalizeText(input.documentNumber),
          nombres: normalizeText(input.firstName),
          apellidos: normalizeText(input.lastName),
        },
      });

      const account = await transaction.cuenta_acceso.create({
        data: {
          tipo_cuenta: tipo_cuenta_enum.ESTUDIANTE,
          correo: email,
          password_hash: passwordHash,
          correo_verificado: true,
          correo_verificado_at: new Date(),
          primer_ingreso_pendiente: true,
          estado: estado_simple_enum.ACTIVO,
        },
      });

      await transaction.cuenta_estudiante.create({
        data: {
          id_cuenta: account.id_cuenta,
          id_persona: person.id_persona,
          id_universidad: universityId,
          celular: phone,
          semestre: Number(input.semester),
        },
      });

      await transaction.credencial_inicial.create({
        data: {
          id_cuenta_acceso: account.id_cuenta,
        },
      });
    });

    const students = await this.listStudents(user);
    return students[0] ?? null;
  }

  async bulkCreateStudents(user: RequestUser, input: BulkCreateStudentsDto) {
    return this.bulkCreateStudentsOptimized(this.getUniversityId(user), input.rows);
    const universityId = this.getUniversityId(user);
    const errors: { row: number; column: string; message: string }[] = [];
    let created = 0;
    let createdCredentials = 0;

    for (let i = 0; i < input.rows.length; i++) {
      const row = input.rows[i];
      const rowNum = i + 2;

      if (!row) continue;

      try {
        const email = normalizeEmail(row.correo);
        const documentType = await this.resolveDocumentType(row.tipo_documento);

        const [existingAccount, existingPerson] = await Promise.all([
          this.prisma.cuenta_acceso.findUnique({ where: { correo: email }, select: { id_cuenta: true } }),
          this.prisma.persona.findFirst({
            where: { id_tipo_documento: documentType.id_tipo_documento, numero_documento: normalizeText(row.numero_documento) },
            select: { id_persona: true },
          }),
        ]);

        if (existingAccount) {
          errors.push({ row: rowNum, column: 'correo', message: `El correo "${row.correo}" ya está registrado.` });
          continue;
        }

        if (existingPerson) {
          errors.push({ row: rowNum, column: 'numero_documento', message: `El documento "${row.numero_documento}" ya está registrado.` });
          continue;
        }

        const passwordHash = await bcrypt.hash(generateTemporaryPassword(), 8);

        await this.prisma.$transaction(async (tx) => {
          const person = await tx.persona.create({
            data: {
              id_tipo_documento: documentType.id_tipo_documento,
              numero_documento: normalizeText(row.numero_documento),
              nombres: normalizeText(row.nombres),
              apellidos: normalizeText(row.apellidos),
            },
          });

          const account = await tx.cuenta_acceso.create({
            data: {
              tipo_cuenta: tipo_cuenta_enum.ESTUDIANTE,
              correo: email,
              password_hash: passwordHash,
              correo_verificado: true,
              correo_verificado_at: new Date(),
              primer_ingreso_pendiente: true,
              estado: estado_simple_enum.ACTIVO,
            },
          });

          await tx.cuenta_estudiante.create({
            data: {
              id_cuenta: account.id_cuenta,
              id_persona: person.id_persona,
              id_universidad: universityId,
              celular: normalizeText(row.celular),
              semestre: row.semestre,
            },
          });

          await tx.credencial_inicial.create({ data: { id_cuenta_acceso: account.id_cuenta } });
        });

        created++;
        createdCredentials++;
      } catch {
        errors.push({ row: rowNum, column: 'general', message: 'Error inesperado al procesar esta fila.' });
      }
    }

    return { created, createdCredentials, errors };
  }

  private async bulkCreateStudentsOptimized(
    universityId: number,
    rows: BulkCreateStudentsDto['rows'],
  ) {
    const errors: { row: number; column: string; message: string }[] = [];
    let created = 0;
    let createdCredentials = 0;
    const preparedRows = rows
      .map((row, index) => {
        if (!row) {
          return null;
        }

        return {
          documentNumber: normalizeText(row.numero_documento),
          email: normalizeEmail(row.correo),
          firstName: normalizeText(row.nombres),
          lastName: normalizeText(row.apellidos),
          originalDocumentNumber: row.numero_documento,
          originalEmail: row.correo,
          phone: normalizeText(row.celular),
          rowNum: index + 2,
          semester: row.semestre,
          tipoDocumento: row.tipo_documento,
        };
      })
      .filter(
        (
          row,
        ): row is {
          documentNumber: string;
          email: string;
          firstName: string;
          lastName: string;
          originalDocumentNumber: string;
          originalEmail: string;
          phone: string;
          rowNum: number;
          semester: number;
          tipoDocumento: string;
        } => row !== null,
      );
    const documentTypesByIdentifier = await this.getDocumentTypeMap(
      preparedRows.map((row) => row.tipoDocumento),
    );
    const emailCounts = new Map<string, number>();
    const documentCounts = new Map<string, number>();
    const preparedRowsWithDocumentType = preparedRows.map((row) => {
      const documentType = this.getDocumentTypeFromMap(
        documentTypesByIdentifier,
        row.tipoDocumento,
      );

      emailCounts.set(row.email, (emailCounts.get(row.email) ?? 0) + 1);

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
    const existingEmails =
      rowsWithResolvedDocumentType.length > 0
        ? new Set(
            (
              await this.prisma.cuenta_acceso.findMany({
                where: {
                  correo: {
                    in: [...new Set(rowsWithResolvedDocumentType.map((row) => row.email))],
                  },
                },
                select: {
                  correo: true,
                },
              })
            ).map((account) => account.correo),
          )
        : new Set<string>();
    const existingDocuments =
      rowsWithResolvedDocumentType.length > 0
        ? new Set(
            (
              await this.prisma.persona.findMany({
                where: {
                  OR: rowsWithResolvedDocumentType.map((row) => ({
                    id_tipo_documento: row.documentType.id_tipo_documento,
                    numero_documento: row.documentNumber,
                  })),
                },
                select: {
                  id_tipo_documento: true,
                  numero_documento: true,
                },
              })
            ).map((person) =>
              this.buildDocumentKey(person.id_tipo_documento, person.numero_documento),
            ),
          )
        : new Set<string>();

    for (const row of preparedRowsWithDocumentType) {
      const documentType = row.documentType;

      if (!documentType) {
        errors.push({
          row: row.rowNum,
          column: 'tipo_documento',
          message: `El tipo de documento "${row.tipoDocumento}" no existe.`,
        });
        continue;
      }

      const documentKey = this.buildDocumentKey(
        documentType.id_tipo_documento,
        row.documentNumber,
      );

      if ((emailCounts.get(row.email) ?? 0) > 1) {
        errors.push({
          row: row.rowNum,
          column: 'correo',
          message: `El correo "${row.originalEmail}" esta duplicado dentro del archivo.`,
        });
        continue;
      }

      if ((documentCounts.get(documentKey) ?? 0) > 1) {
        errors.push({
          row: row.rowNum,
          column: 'numero_documento',
          message: `El documento "${row.originalDocumentNumber}" esta duplicado dentro del archivo.`,
        });
        continue;
      }

      if (existingEmails.has(row.email)) {
        errors.push({
          row: row.rowNum,
          column: 'correo',
          message: `El correo "${row.originalEmail}" ya esta registrado.`,
        });
        continue;
      }

      if (existingDocuments.has(documentKey)) {
        errors.push({
          row: row.rowNum,
          column: 'numero_documento',
          message: `El documento "${row.originalDocumentNumber}" ya esta registrado.`,
        });
        continue;
      }

      try {
        const passwordHash = await bcrypt.hash(generateTemporaryPassword(), 8);

        await this.prisma.$transaction(async (tx) => {
          const person = await tx.persona.create({
            data: {
              id_tipo_documento: documentType.id_tipo_documento,
              numero_documento: row.documentNumber,
              nombres: row.firstName,
              apellidos: row.lastName,
            },
          });

          const account = await tx.cuenta_acceso.create({
            data: {
              tipo_cuenta: tipo_cuenta_enum.ESTUDIANTE,
              correo: row.email,
              password_hash: passwordHash,
              correo_verificado: true,
              correo_verificado_at: new Date(),
              primer_ingreso_pendiente: true,
              estado: estado_simple_enum.ACTIVO,
            },
          });

          await tx.cuenta_estudiante.create({
            data: {
              id_cuenta: account.id_cuenta,
              id_persona: person.id_persona,
              id_universidad: universityId,
              celular: row.phone,
              semestre: row.semester,
            },
          });

          await tx.credencial_inicial.create({
            data: {
              id_cuenta_acceso: account.id_cuenta,
            },
          });
        });

        created++;
        createdCredentials++;
        existingEmails.add(row.email);
        existingDocuments.add(documentKey);
      } catch {
        errors.push({
          row: row.rowNum,
          column: 'general',
          message: 'Error inesperado al procesar esta fila.',
        });
      }
    }

    return { created, createdCredentials, errors };
  }

  async toggleStudentStatus(user: RequestUser, studentIdentifier: string) {
    const universityId = this.getUniversityId(user);
    const studentId = this.parseEntityId(studentIdentifier, 'estudiante');

    const student = await this.prisma.cuenta_estudiante.findFirst({
      where: {
        id_cuenta: studentId,
        id_universidad: universityId,
      },
      include: {
        cuenta_acceso: true,
      },
    });

    if (!student) {
      throw new NotFoundException('El estudiante solicitado no existe.');
    }

    const nextStatus =
      student.cuenta_acceso.estado === estado_simple_enum.ACTIVO
        ? estado_simple_enum.INACTIVO
        : estado_simple_enum.ACTIVO;

    await this.prisma.cuenta_acceso.update({
      where: { id_cuenta: student.id_cuenta },
      data: {
        estado: nextStatus,
      },
    });

    return {
      status: nextStatus === estado_simple_enum.ACTIVO ? 'active' : 'inactive',
      studentId: String(student.id_cuenta),
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
