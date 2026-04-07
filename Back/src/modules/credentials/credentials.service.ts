import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { tipo_cuenta_enum, tipo_envio_credencial_enum } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '@/shared/database/prisma.service';
import { MailService } from '@/shared/mail/mail.service';
import type { RequestUser } from '@/shared/types/request-user.type';
import {
  extractNumericId,
  generateTemporaryPassword,
  normalizeEmail,
} from '@/shared/utils/front-format.util';
import { EditStudentCredentialEmailDto } from './application/dto/edit-student-credential-email.dto';

@Injectable()
export class CredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async listStudentCredentials(user: RequestUser) {
    const universityId = this.getUniversityId(user);
    const credentials = await this.prisma.credencial_inicial.findMany({
      where: {
        anulada_at: null,
        cuenta_acceso: {
          tipo_cuenta: tipo_cuenta_enum.ESTUDIANTE,
          cuenta_estudiante: {
            id_universidad: universityId,
          },
        },
      },
      include: {
        envio_credencial: true,
        cuenta_acceso: {
          include: {
            cuenta_estudiante: {
              include: {
                persona: {
                  include: {
                    tipo_documento: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        fecha_creacion: 'desc',
      },
    });

    return credentials.map((credential) => this.toStudentCredentialDto(credential));
  }

  async editStudentCredentialEmail(
    user: RequestUser,
    credentialIdentifier: string,
    input: EditStudentCredentialEmailDto,
  ) {
    const credential = await this.findStudentCredential(user, credentialIdentifier);
    const email = normalizeEmail(input.email);
    const existingAccount = await this.prisma.cuenta_acceso.findUnique({
      where: { correo: email },
      select: { id_cuenta: true },
    });

    if (existingAccount && existingAccount.id_cuenta !== credential.id_cuenta_acceso) {
      throw new ConflictException('Ya existe una cuenta registrada con este correo.');
    }

    await this.prisma.cuenta_acceso.update({
      where: { id_cuenta: credential.id_cuenta_acceso },
      data: { correo: email },
    });

    return { ok: true };
  }

  async sendStudentCredential(user: RequestUser, credentialIdentifier: string, isResend = false) {
    const credential = await this.findStudentCredential(user, credentialIdentifier);
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.cuenta_acceso.update({
        where: { id_cuenta: credential.id_cuenta_acceso },
        data: {
          password_hash: passwordHash,
          primer_ingreso_pendiente: true,
        },
      });

      await transaction.envio_credencial.create({
        data: {
          id_credencial_inicial: credential.id_credencial_inicial,
          tipo_envio: isResend
            ? tipo_envio_credencial_enum.REENVIO
            : tipo_envio_credencial_enum.ENVIO,
        },
      });
    });

    const student = credential.cuenta_acceso.cuenta_estudiante;
    const studentName = student
      ? `${student.persona.nombres} ${student.persona.apellidos}`
      : 'Estudiante';
    void this.mailService.sendStudentCredentials(
      credential.cuenta_acceso.correo,
      studentName,
      temporaryPassword,
    );

    return {
      temporaryPassword,
    };
  }

  async sendAllStudentCredentials(user: RequestUser) {
    const universityId = this.getUniversityId(user);
    const generatedCredentials = await this.prisma.credencial_inicial.findMany({
      where: {
        anulada_at: null,
        envio_credencial: {
          none: {},
        },
        cuenta_acceso: {
          tipo_cuenta: tipo_cuenta_enum.ESTUDIANTE,
          cuenta_estudiante: {
            id_universidad: universityId,
          },
        },
      },
      select: {
        id_credencial_inicial: true,
        id_cuenta_acceso: true,
        cuenta_acceso: {
          select: {
            correo: true,
            cuenta_estudiante: {
              select: { persona: { select: { nombres: true, apellidos: true } } },
            },
          },
        },
      },
    });

    for (const credential of generatedCredentials) {
      const temporaryPassword = generateTemporaryPassword();
      const passwordHash = await bcrypt.hash(temporaryPassword, 10);

      await this.prisma.$transaction(async (transaction) => {
        await transaction.cuenta_acceso.update({
          where: { id_cuenta: credential.id_cuenta_acceso },
          data: {
            password_hash: passwordHash,
            primer_ingreso_pendiente: true,
          },
        });

        await transaction.envio_credencial.create({
          data: {
            id_credencial_inicial: credential.id_credencial_inicial,
            tipo_envio: tipo_envio_credencial_enum.ENVIO,
          },
        });
      });

      const student = credential.cuenta_acceso.cuenta_estudiante;
      const studentName = student
        ? `${student.persona.nombres} ${student.persona.apellidos}`
        : 'Estudiante';
      void this.mailService.sendStudentCredentials(
        credential.cuenta_acceso.correo,
        studentName,
        temporaryPassword,
      );
    }

    return {
      sentCount: generatedCredentials.length,
    };
  }

  async deleteStudentCredential(user: RequestUser, credentialIdentifier: string) {
    const credential = await this.findStudentCredential(user, credentialIdentifier);

    await this.prisma.credencial_inicial.update({
      where: { id_credencial_inicial: credential.id_credencial_inicial },
      data: {
        anulada_at: new Date(),
      },
    });

    return { ok: true };
  }

  private getUniversityId(user: RequestUser) {
    if (user.role !== 'UNIVERSITY_ADMIN' || !user.universityId) {
      throw new ForbiddenException('Este recurso es exclusivo del administrador universitario.');
    }

    return user.universityId;
  }

  private parseCredentialId(identifier: string) {
    const credentialId = extractNumericId(identifier);

    if (!credentialId) {
      throw new BadRequestException('El identificador de la credencial no es valido.');
    }

    return credentialId;
  }

  private async findStudentCredential(user: RequestUser, credentialIdentifier: string) {
    const universityId = this.getUniversityId(user);
    const credentialId = this.parseCredentialId(credentialIdentifier);

    const credential = await this.prisma.credencial_inicial.findFirst({
      where: {
        id_credencial_inicial: credentialId,
        anulada_at: null,
        cuenta_acceso: {
          tipo_cuenta: tipo_cuenta_enum.ESTUDIANTE,
          cuenta_estudiante: {
            id_universidad: universityId,
          },
        },
      },
      include: {
        envio_credencial: true,
        cuenta_acceso: {
          include: {
            cuenta_estudiante: {
              include: {
                persona: {
                  include: {
                    tipo_documento: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!credential) {
      throw new NotFoundException('La credencial solicitada no existe.');
    }

    return credential;
  }

  private toStudentCredentialDto(credential: {
    id_credencial_inicial: number;
    envio_credencial: {
      enviado_at: Date;
    }[];
    cuenta_acceso: {
      correo: string;
      cuenta_estudiante: {
        id_cuenta: number;
        persona: {
          nombres: string;
          apellidos: string;
          numero_documento: string;
          tipo_documento: {
            codigo: string;
          };
        };
      } | null;
    };
  }) {
    const student = credential.cuenta_acceso.cuenta_estudiante;

    if (!student) {
      throw new NotFoundException('No encontramos el estudiante asociado a la credencial.');
    }

    const sentCount = credential.envio_credencial.length;
    const lastSentAt =
      sentCount > 0 ? credential.envio_credencial[sentCount - 1]?.enviado_at ?? null : null;

    return {
      deliveryStatus: sentCount > 0 ? 'sent' : 'generated',
      id: String(credential.id_credencial_inicial),
      lastSentAt: lastSentAt ? lastSentAt.toISOString() : null,
      sentCount,
      studentId: String(student.id_cuenta),
      studentName: `${student.persona.nombres} ${student.persona.apellidos}`,
      studentEmail: credential.cuenta_acceso.correo,
      studentDocument: `${student.persona.tipo_documento.codigo} ${student.persona.numero_documento}`,
    };
  }
}
