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
import { CreateTeacherDto } from './application/dto/create-teacher.dto';

const DEFAULT_DOCUMENT_TYPES = [
  { codigo: 'CC', nombre: 'Cedula de ciudadania' },
  { codigo: 'CE', nombre: 'Cedula de extranjeria' },
  { codigo: 'TI', nombre: 'Tarjeta de identidad' },
  { codigo: 'PASSPORT', nombre: 'Pasaporte' },
] as const;

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

  private async resolveDocumentType(identifier: string) {
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

    const documentType = await this.prisma.tipo_documento.findFirst({
      where: {
        OR: [
          { codigo: normalizeText(identifier).replace('document-', '').toUpperCase() },
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
