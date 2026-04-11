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

type CredentialSendSummary = {
  enviado_at: Date;
};

type CredentialSummary = {
  id_credencial_inicial: number;
  anulada_at: Date | null;
  _count?: {
    envio_credencial: number;
  };
  envio_credencial?: CredentialSendSummary[];
};

type PlatformAdminUniversityRecord = {
  id_universidad: number;
  nombre: string;
  estado: estado_simple_enum;
  fecha_creacion: Date;
  localidad: {
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
      primer_ingreso_pendiente: boolean;
      credencial_inicial: CredentialSummary | null;
    };
  } | null;
};

type PendingCredentialRecord = {
  id_credencial_inicial: number;
  id_cuenta_acceso: number;
  fecha_creacion: Date;
  _count?: {
    envio_credencial: number;
  };
  envio_credencial?: CredentialSendSummary[];
  cuenta_acceso: {
    id_cuenta: number;
    correo: string;
    cuenta_admin_universidad: {
      id_universidad: number;
      nombres: string;
      apellidos: string;
      universidad: {
        id_universidad: number;
        nombre: string;
        estado: estado_simple_enum;
      };
    } | null;
  };
};

@Injectable()
export class PlatformAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async listUniversities(user: RequestUser) {
    this.assertPlatformAdmin(user);

    const universities = await this.findUniversitiesForList();

    return universities.map((university) => this.toUniversityDto(university));
  }

  async getOverview(user: RequestUser) {
    this.assertPlatformAdmin(user);

    const [universities, credentials] = await Promise.all([
      this.findUniversitiesForList(),
      this.findPendingCredentialsForList(),
    ]);

    return {
      credentials: credentials
        .map((credential) => this.toPendingCredentialDto(credential))
        .filter((credential) => credential !== null),
      universities: universities.map((university) => this.toUniversityDto(university)),
    };
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
        select: {
          id_universidad: true,
          nombre: true,
          estado: true,
          fecha_creacion: true,
          localidad: {
            select: {
              nombre: true,
              ciudad: {
                select: { nombre: true },
              },
            },
          },
          cuenta_admin_universidad: {
            select: {
              nombres: true,
              apellidos: true,
              celular: true,
              cuenta_acceso: {
                select: {
                  correo: true,
                  primer_ingreso_pendiente: true,
                  credencial_inicial: {
                    select: {
                      id_credencial_inicial: true,
                      anulada_at: true,
                      _count: {
                        select: { envio_credencial: true },
                      },
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
      select: {
        estado: true,
        cuenta_admin_universidad: {
          select: {
            cuenta_acceso: {
              select: {
                primer_ingreso_pendiente: true,
                credencial_inicial: {
                  select: {
                    id_credencial_inicial: true,
                    anulada_at: true,
                    _count: {
                      select: { envio_credencial: true },
                    },
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

    if (this.isPendingUniversity(university)) {
      throw new BadRequestException('No puedes cambiar el estado de una universidad pendiente.');
    }

    const nextState =
      university.estado === estado_simple_enum.ACTIVO
        ? estado_simple_enum.INACTIVO
        : estado_simple_enum.ACTIVO;

    const updatedUniversity = await this.prisma.universidad.update({
      where: { id_universidad: universityId },
      data: { estado: nextState },
      select: {
        id_universidad: true,
        nombre: true,
        estado: true,
        fecha_creacion: true,
        localidad: {
          select: {
            nombre: true,
            ciudad: {
              select: { nombre: true },
            },
          },
        },
        cuenta_admin_universidad: {
          select: {
            nombres: true,
            apellidos: true,
            celular: true,
            cuenta_acceso: {
              select: {
                correo: true,
                primer_ingreso_pendiente: true,
                credencial_inicial: {
                  select: {
                    id_credencial_inicial: true,
                    anulada_at: true,
                    _count: {
                      select: { envio_credencial: true },
                    },
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

    const credentials = await this.findPendingCredentialsForList();

    return credentials
      .map((credential) => this.toPendingCredentialDto(credential))
      .filter((credential) => credential !== null);
  }

  async sendCredential(user: RequestUser, credentialIdentifier: string, isResend = false) {
    this.assertPlatformAdmin(user);

    const credential = await this.findPendingCredential(credentialIdentifier);
    const temporaryPassword = generateTemporaryPassword();

    const [passwordHash, newEnvio] = await Promise.all([
      bcrypt.hash(temporaryPassword, 8),
      this.prisma.$transaction(async (transaction) => {
        await transaction.cuenta_acceso.update({
          where: { id_cuenta: credential.id_cuenta_acceso },
          data: { primer_ingreso_pendiente: true },
        });
        return transaction.envio_credencial.create({
          data: {
            id_credencial_inicial: credential.id_credencial_inicial,
            tipo_envio: isResend
              ? tipo_envio_credencial_enum.REENVIO
              : tipo_envio_credencial_enum.ENVIO,
          },
          select: { enviado_at: true },
        });
      }),
    ]);

    await this.prisma.cuenta_acceso.update({
      where: { id_cuenta: credential.id_cuenta_acceso },
      data: { password_hash: passwordHash },
    });

    const adminUniversity = credential.cuenta_acceso.cuenta_admin_universidad;
    if (adminUniversity) {
      const adminName = `${adminUniversity.nombres} ${adminUniversity.apellidos}`;
      void this.mailService.sendUniversityAdminCredentials(
        credential.cuenta_acceso.correo,
        adminName,
        adminUniversity.universidad.nombre,
        temporaryPassword,
      );
    }

    const updatedCredential = {
      ...credential,
      _count: {
        envio_credencial: this.getCredentialSentCount(credential) + 1,
      },
      envio_credencial: [newEnvio],
    };

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

  private findUniversitiesForList() {
    return this.prisma.universidad.findMany({
      select: {
        id_universidad: true,
        nombre: true,
        estado: true,
        fecha_creacion: true,
        localidad: {
          select: {
            nombre: true,
            ciudad: {
              select: { nombre: true },
            },
          },
        },
        cuenta_admin_universidad: {
          select: {
            nombres: true,
            apellidos: true,
            celular: true,
            cuenta_acceso: {
              select: {
                correo: true,
                primer_ingreso_pendiente: true,
                credencial_inicial: {
                  select: {
                    id_credencial_inicial: true,
                    anulada_at: true,
                    _count: {
                      select: { envio_credencial: true },
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
  }

  private findPendingCredentialsForList() {
    return this.prisma.credencial_inicial.findMany({
      where: {
        anulada_at: null,
        cuenta_acceso: {
          tipo_cuenta: tipo_cuenta_enum.ADMIN_UNIVERSIDAD,
          primer_ingreso_pendiente: true,
          ultimo_login_at: null,
        },
      },
      select: {
        id_credencial_inicial: true,
        id_cuenta_acceso: true,
        fecha_creacion: true,
        _count: {
          select: { envio_credencial: true },
        },
        envio_credencial: {
          orderBy: { enviado_at: 'desc' },
          select: { enviado_at: true },
          take: 1,
        },
        cuenta_acceso: {
          select: {
            id_cuenta: true,
            correo: true,
            cuenta_admin_universidad: {
              select: {
                id_universidad: true,
                nombres: true,
                apellidos: true,
                universidad: {
                  select: {
                    id_universidad: true,
                    nombre: true,
                    estado: true,
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
    const numericLocalityId = this.extractStrictNumericId(localityIdentifier);

    if (numericLocalityId) {
      const localityById = await this.prisma.localidad.findUnique({
        where: { id_localidad: numericLocalityId },
        include: { ciudad: true },
      });

      if (localityById) {
        return localityById;
      }
    }

    const city = await this.resolveCity(cityIdentifier);
    const localities = await this.prisma.localidad.findMany({
      where: { id_ciudad: city.id_ciudad },
      include: {
        ciudad: true,
      },
    });

    const locality =
      localities.find((item) => {
        return (
          buildLocalityFrontId(item.ciudad.nombre, item.nombre) === localityIdentifier ||
          slugify(item.nombre) === slugify(localityIdentifier)
        );
      });

    if (!locality) {
      throw new NotFoundException('La localidad seleccionada no existe.');
    }

    return locality;
  }

  private async resolveCity(cityIdentifier: string) {
    const numericCityId = this.extractStrictNumericId(cityIdentifier);

    if (numericCityId) {
      const cityById = await this.prisma.ciudad.findUnique({
        where: { id_ciudad: numericCityId },
      });

      if (cityById) {
        return cityById;
      }
    }

    const cities = await this.prisma.ciudad.findMany();
    const city = cities.find((item) => buildCityFrontId(item.nombre) === cityIdentifier);

    if (!city) {
      throw new NotFoundException('La ciudad seleccionada no existe.');
    }

    return city;
  }

  private extractStrictNumericId(value: string) {
    return /^\d+$/.test(value) ? Number(value) : null;
  }

  private isPendingUniversity(university: {
    cuenta_admin_universidad: {
      cuenta_acceso: {
        primer_ingreso_pendiente: boolean;
        credencial_inicial: CredentialSummary | null;
      };
    } | null;
  }) {
    const credencial = university.cuenta_admin_universidad?.cuenta_acceso.credencial_inicial;
    return Boolean(
      university.cuenta_admin_universidad?.cuenta_acceso.primer_ingreso_pendiente &&
        credencial &&
        credencial.anulada_at === null &&
        this.getCredentialSentCount(credencial) === 0,
    );
  }

  private toUniversityDto(university: PlatformAdminUniversityRecord) {
    const isPending = this.isPendingUniversity(university);
    const credential = university.cuenta_admin_universidad?.cuenta_acceso.credencial_inicial ?? null;

    return {
      adminEmail: university.cuenta_admin_universidad?.cuenta_acceso.correo ?? '',
      adminFirstName: university.cuenta_admin_universidad?.nombres ?? '',
      adminLastName: university.cuenta_admin_universidad?.apellidos ?? '',
      adminPhone: university.cuenta_admin_universidad?.celular ?? null,
      createdAt: university.fecha_creacion.toISOString(),
      credentialId:
        credential && credential.anulada_at === null
          ? String(credential.id_credencial_inicial)
          : null,
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

  private toPendingCredentialDto(credential: PendingCredentialRecord) {
    const adminUniversity = credential.cuenta_acceso.cuenta_admin_universidad;

    if (!adminUniversity) {
      return null;
    }

    const sentCount = this.getCredentialSentCount(credential);
    const lastSentAt = credential.envio_credencial?.[0]?.enviado_at ?? null;
    const universityStatus =
      sentCount === 0
        ? 'pending'
        : adminUniversity.universidad.estado === estado_simple_enum.ACTIVO
          ? 'active'
          : 'inactive';

    return {
      deliveryStatus: sentCount > 0 ? 'sent' : 'generated',
      id: String(credential.id_credencial_inicial),
      lastSentAt: lastSentAt ? lastSentAt.toISOString() : null,
      sentCount,
      universityId: String(adminUniversity.universidad.id_universidad),
      universityName: adminUniversity.universidad.nombre,
      administratorName: `${adminUniversity.nombres} ${adminUniversity.apellidos}`,
      administratorEmail: credential.cuenta_acceso.correo,
      universityStatus,
    };
  }

  private getCredentialSentCount(credential: {
    _count?: { envio_credencial: number };
    envio_credencial?: CredentialSendSummary[];
  }) {
    return credential._count?.envio_credencial ?? credential.envio_credencial?.length ?? 0;
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
          ultimo_login_at: null,
        },
      },
      select: {
        id_credencial_inicial: true,
        id_cuenta_acceso: true,
        fecha_creacion: true,
        _count: {
          select: { envio_credencial: true },
        },
        envio_credencial: {
          orderBy: { enviado_at: 'desc' },
          select: { enviado_at: true },
          take: 1,
        },
        cuenta_acceso: {
          select: {
            id_cuenta: true,
            correo: true,
            cuenta_admin_universidad: {
              select: {
                id_universidad: true,
                nombres: true,
                apellidos: true,
                universidad: {
                  select: {
                    id_universidad: true,
                    nombre: true,
                    estado: true,
                  },
                },
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
