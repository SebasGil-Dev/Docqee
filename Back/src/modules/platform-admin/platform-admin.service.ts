import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { estado_simple_enum, tipo_cuenta_enum, tipo_envio_credencial_enum } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '@/shared/database/prisma.service';
import { MailService } from '@/shared/mail/mail.service';
import type { RequestUser } from '@/shared/types/request-user.type';
import {
  buildCityFrontId,
  buildLocalityFrontId,
  extractNumericId,
  generateTemporaryPassword,
  normalizeEmail,
  normalizeText,
} from '@/shared/utils/front-format.util';
import { slugify } from '@/shared/utils/text.util';
import { CreateUniversityDto } from './dto/create-university.dto';

@Injectable()
export class PlatformAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async listUniversities(user: RequestUser) {
    this.assertPlatformAdmin(user);

    const universities = await this.prisma.universidad.findMany({
      include: {
        localidad: {
          include: {
            ciudad: true,
          },
        },
        cuenta_admin_universidad: {
          include: {
            cuenta_acceso: {
              include: {
                credencial_inicial: {
                  include: {
                    envio_credencial: true,
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

    return universities.map((university) => this.toUniversityDto(university));
  }

  async createUniversity(user: RequestUser, input: CreateUniversityDto) {
    this.assertPlatformAdmin(user);

    const universityName = normalizeText(input.name);
    const adminEmail = normalizeEmail(input.adminEmail);
    const locality = await this.resolveLocality(input.mainLocalityId, input.cityId);

    const [existingUniversity, existingAccount] = await Promise.all([
      this.prisma.universidad.findUnique({
        where: { nombre: universityName },
        select: { id_universidad: true },
      }),
      this.prisma.cuenta_acceso.findUnique({
        where: { correo: adminEmail },
        select: { id_cuenta: true },
      }),
    ]);

    if (existingUniversity) {
      throw new ConflictException('Ya existe una universidad registrada con este nombre.');
    }

    if (existingAccount) {
      throw new ConflictException('Ya existe una cuenta registrada con este correo.');
    }

    const randomPasswordHash = await bcrypt.hash(generateTemporaryPassword(), 10);

    const university = await this.prisma.$transaction(async (transaction) => {
      const createdUniversity = await transaction.universidad.create({
        data: {
          id_localidad_principal: locality.id_localidad,
          nombre: universityName,
          estado: estado_simple_enum.ACTIVO,
        },
        include: {
          localidad: {
            include: {
              ciudad: true,
            },
          },
        },
      });

      const account = await transaction.cuenta_acceso.create({
        data: {
          tipo_cuenta: tipo_cuenta_enum.ADMIN_UNIVERSIDAD,
          correo: adminEmail,
          password_hash: randomPasswordHash,
          correo_verificado: true,
          correo_verificado_at: new Date(),
          primer_ingreso_pendiente: true,
          estado: estado_simple_enum.ACTIVO,
        },
      });

      await transaction.cuenta_admin_universidad.create({
        data: {
          id_cuenta: account.id_cuenta,
          id_universidad: createdUniversity.id_universidad,
          nombres: normalizeText(input.adminFirstName),
          apellidos: normalizeText(input.adminLastName),
          celular: input.adminPhone ? normalizeText(input.adminPhone) : null,
        },
      });

      await transaction.credencial_inicial.create({
        data: {
          id_cuenta_acceso: account.id_cuenta,
        },
      });

      return transaction.universidad.findUniqueOrThrow({
        where: { id_universidad: createdUniversity.id_universidad },
        include: {
          localidad: {
            include: {
              ciudad: true,
            },
          },
          cuenta_admin_universidad: {
            include: {
              cuenta_acceso: {
                include: {
                  credencial_inicial: {
                    include: {
                      envio_credencial: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    return this.toUniversityDto(university);
  }

  async toggleUniversityStatus(user: RequestUser, universityIdentifier: string) {
    this.assertPlatformAdmin(user);

    const universityId = this.parseEntityId(universityIdentifier, 'universidad');
    const university = await this.prisma.universidad.findUnique({
      where: { id_universidad: universityId },
      include: {
        localidad: {
          include: {
            ciudad: true,
          },
        },
        cuenta_admin_universidad: {
          include: {
            cuenta_acceso: {
              include: {
                credencial_inicial: {
                  include: {
                    envio_credencial: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!university) {
      throw new NotFoundException('La universidad solicitada no existe.');
    }

    const isPending = this.isPendingUniversity(university);

    if (isPending) {
      throw new BadRequestException('No puedes cambiar el estado de una universidad pendiente.');
    }

    const nextState =
      university.estado === estado_simple_enum.ACTIVO
        ? estado_simple_enum.INACTIVO
        : estado_simple_enum.ACTIVO;

    const updatedUniversity = await this.prisma.universidad.update({
      where: { id_universidad: university.id_universidad },
      data: {
        estado: nextState,
      },
      include: {
        localidad: {
          include: {
            ciudad: true,
          },
        },
        cuenta_admin_universidad: {
          include: {
            cuenta_acceso: {
              include: {
                credencial_inicial: {
                  include: {
                    envio_credencial: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return this.toUniversityDto(updatedUniversity);
  }

  async listPendingCredentials(user: RequestUser) {
    this.assertPlatformAdmin(user);

    const credentials = await this.prisma.credencial_inicial.findMany({
      where: {
        anulada_at: null,
        cuenta_acceso: {
          tipo_cuenta: tipo_cuenta_enum.ADMIN_UNIVERSIDAD,
          primer_ingreso_pendiente: true,
        },
      },
      include: {
        envio_credencial: true,
        cuenta_acceso: {
          include: {
            cuenta_admin_universidad: {
              include: {
                universidad: {
                  include: {
                    localidad: {
                      include: {
                        ciudad: true,
                      },
                    },
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

    return credentials
      .map((credential) => this.toPendingCredentialDto(credential))
      .filter((credential) => credential !== null);
  }

  async sendCredential(user: RequestUser, credentialIdentifier: string, isResend = false) {
    this.assertPlatformAdmin(user);

    const credential = await this.findPendingCredential(credentialIdentifier);
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

    const updatedCredential = await this.findPendingCredential(credentialIdentifier);
    const adminUniversity = updatedCredential.cuenta_acceso.cuenta_admin_universidad;

    if (adminUniversity) {
      const adminName = `${adminUniversity.nombres} ${adminUniversity.apellidos}`;
      await this.mailService.sendUniversityAdminCredentials(
        updatedCredential.cuenta_acceso.correo,
        adminName,
        adminUniversity.universidad.nombre,
        temporaryPassword,
      );
    }

    return {
      credential: this.toPendingCredentialDto(updatedCredential),
      temporaryPassword,
    };
  }

  async deleteCredential(user: RequestUser, credentialIdentifier: string) {
    this.assertPlatformAdmin(user);

    const credential = await this.findPendingCredential(credentialIdentifier);
    const adminUniversity = credential.cuenta_acceso.cuenta_admin_universidad;

    if (!adminUniversity) {
      throw new NotFoundException('No encontramos el administrador asociado a esta credencial.');
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.envio_credencial.deleteMany({
        where: { id_credencial_inicial: credential.id_credencial_inicial },
      });

      await transaction.credencial_inicial.delete({
        where: { id_credencial_inicial: credential.id_credencial_inicial },
      });

      await transaction.cuenta_admin_universidad.delete({
        where: { id_cuenta: credential.id_cuenta_acceso },
      });

      await transaction.cuenta_acceso.delete({
        where: { id_cuenta: credential.id_cuenta_acceso },
      });

      await transaction.universidad.delete({
        where: { id_universidad: adminUniversity.id_universidad },
      });
    });

    return { ok: true };
  }

  private assertPlatformAdmin(user: RequestUser) {
    if (user.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Este recurso es exclusivo del administrador de plataforma.');
    }
  }

  private parseEntityId(identifier: string, entityLabel: string) {
    const entityId = extractNumericId(identifier);

    if (!entityId) {
      throw new BadRequestException(`El identificador de ${entityLabel} no es valido.`);
    }

    return entityId;
  }

  private async resolveLocality(localityIdentifier: string, cityIdentifier: string) {
    const numericLocalityId = extractNumericId(localityIdentifier);

    const localities = await this.prisma.localidad.findMany({
      include: {
        ciudad: true,
      },
    });

    const locality =
      localities.find((item) => item.id_localidad === numericLocalityId) ??
      localities.find((item) => {
        return (
          buildLocalityFrontId(item.ciudad.nombre, item.nombre) === localityIdentifier &&
          buildCityFrontId(item.ciudad.nombre) === cityIdentifier
        );
      }) ??
      localities.find((item) => {
        return (
          buildCityFrontId(item.ciudad.nombre) === cityIdentifier &&
          slugify(item.nombre) === slugify(localityIdentifier)
        );
      });

    if (!locality) {
      throw new NotFoundException('La localidad seleccionada no existe.');
    }

    return locality;
  }

  private isPendingUniversity(university: {
    cuenta_admin_universidad: {
      cuenta_acceso: {
        primer_ingreso_pendiente: boolean;
        credencial_inicial: {
          anulada_at: Date | null;
        } | null;
      };
    } | null;
  }) {
    return Boolean(
      university.cuenta_admin_universidad?.cuenta_acceso.primer_ingreso_pendiente &&
        university.cuenta_admin_universidad.cuenta_acceso.credencial_inicial &&
        university.cuenta_admin_universidad.cuenta_acceso.credencial_inicial.anulada_at === null,
    );
  }

  private toUniversityDto(university: {
    id_universidad: number;
    nombre: string;
    estado: estado_simple_enum;
    fecha_creacion: Date;
    localidad: {
      id_localidad: number;
      nombre: string;
      ciudad: {
        nombre: string;
      };
    };
    cuenta_admin_universidad: {
      nombres: string;
      apellidos: string;
      celular: string | null;
      cuenta_acceso: {
        correo: string;
        credencial_inicial: {
          id_credencial_inicial: number;
          anulada_at: Date | null;
        } | null;
        primer_ingreso_pendiente: boolean;
      };
    } | null;
  }) {
    const isPending = this.isPendingUniversity(university);
    const credential = university.cuenta_admin_universidad?.cuenta_acceso.credencial_inicial ?? null;

    return {
      adminEmail: university.cuenta_admin_universidad?.cuenta_acceso.correo ?? '',
      adminFirstName: university.cuenta_admin_universidad?.nombres ?? '',
      adminLastName: university.cuenta_admin_universidad?.apellidos ?? '',
      adminPhone: university.cuenta_admin_universidad?.celular ?? null,
      createdAt: university.fecha_creacion.toISOString(),
      credentialId: credential && credential.anulada_at === null ? String(credential.id_credencial_inicial) : null,
      id: String(university.id_universidad),
      mainCity: university.localidad.ciudad.nombre,
      mainCityId: buildCityFrontId(university.localidad.ciudad.nombre),
      mainLocality: university.localidad.nombre,
      mainLocalityId: buildLocalityFrontId(university.localidad.ciudad.nombre, university.localidad.nombre),
      name: university.nombre,
      status: isPending
        ? 'pending'
        : university.estado === estado_simple_enum.ACTIVO
          ? 'active'
          : 'inactive',
    };
  }

  private toPendingCredentialDto(credential: {
    id_credencial_inicial: number;
    fecha_creacion: Date;
    envio_credencial: {
      enviado_at: Date;
    }[];
    cuenta_acceso: {
      id_cuenta: number;
      correo: string;
      cuenta_admin_universidad: {
        nombres: string;
        apellidos: string;
        universidad: {
          id_universidad: number;
          nombre: string;
        };
      } | null;
    };
  }) {
    const adminUniversity = credential.cuenta_acceso.cuenta_admin_universidad;

    if (!adminUniversity) {
      return null;
    }

    const sentCount = credential.envio_credencial.length;
    const lastSentAt =
      sentCount > 0 ? credential.envio_credencial[sentCount - 1]?.enviado_at ?? null : null;

    return {
      deliveryStatus: sentCount > 0 ? 'sent' : 'generated',
      id: String(credential.id_credencial_inicial),
      lastSentAt: lastSentAt ? lastSentAt.toISOString() : null,
      sentCount,
      universityId: String(adminUniversity.universidad.id_universidad),
      universityName: adminUniversity.universidad.nombre,
      administratorName: `${adminUniversity.nombres} ${adminUniversity.apellidos}`,
      administratorEmail: credential.cuenta_acceso.correo,
    };
  }

  private async findPendingCredential(credentialIdentifier: string) {
    const credentialId = this.parseEntityId(credentialIdentifier, 'credencial');

    const credential = await this.prisma.credencial_inicial.findFirst({
      where: {
        id_credencial_inicial: credentialId,
        anulada_at: null,
        cuenta_acceso: {
          tipo_cuenta: tipo_cuenta_enum.ADMIN_UNIVERSIDAD,
          primer_ingreso_pendiente: true,
        },
      },
      include: {
        envio_credencial: true,
        cuenta_acceso: {
          include: {
            cuenta_admin_universidad: {
              include: {
                universidad: true,
              },
            },
          },
        },
      },
    });

    if (!credential) {
      throw new NotFoundException('La credencial solicitada no existe o ya no esta pendiente.');
    }

    return credential;
  }
}
