import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '@/shared/database/prisma.service';
import type { RequestUser } from '@/shared/types/request-user.type';
import {
  buildCityFrontId,
  buildLocalityFrontId,
  extractNumericId,
  normalizeEmail,
  normalizeText,
} from '@/shared/utils/front-format.util';
import { slugify } from '@/shared/utils/text.util';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateInstitutionProfileDto } from './dto/update-institution-profile.dto';

@Injectable()
export class UniversityAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(user: RequestUser) {
    const universityAdmin = await this.findCurrentUniversityAdmin(user);
    return this.toInstitutionProfile(universityAdmin);
  }

  async updateProfile(user: RequestUser, input: UpdateInstitutionProfileDto) {
    const universityAdmin = await this.findCurrentUniversityAdmin(user);
    const locality = await this.resolveLocality(input.mainLocalityId, input.cityId);
    const adminEmail = normalizeEmail(input.adminEmail);

    const existingEmailOwner = await this.prisma.cuenta_acceso.findUnique({
      where: { correo: adminEmail },
      select: { id_cuenta: true },
    });

    if (existingEmailOwner && existingEmailOwner.id_cuenta !== universityAdmin.id_cuenta) {
      throw new ConflictException('Ya existe una cuenta registrada con este correo.');
    }

    await this.prisma.$transaction([
      this.prisma.universidad.update({
        where: { id_universidad: universityAdmin.id_universidad },
        data: {
          nombre: normalizeText(input.universityName),
          id_localidad_principal: locality.id_localidad,
          logo_url: input.logoSrc ? input.logoSrc : undefined,
        },
      }),
      this.prisma.cuenta_acceso.update({
        where: { id_cuenta: universityAdmin.id_cuenta },
        data: {
          correo: adminEmail,
        },
      }),
      this.prisma.cuenta_admin_universidad.update({
        where: { id_cuenta: universityAdmin.id_cuenta },
        data: {
          celular: input.adminPhone ? normalizeText(input.adminPhone) : null,
        },
      }),
    ]);

    const updatedUniversityAdmin = await this.findCurrentUniversityAdmin(user);
    return this.toInstitutionProfile(updatedUniversityAdmin);
  }

  async changePassword(user: RequestUser, input: ChangePasswordDto) {
    const universityAdmin = await this.findCurrentUniversityAdmin(user);
    const isValidPassword = await bcrypt.compare(
      input.currentPassword,
      universityAdmin.cuenta_acceso.password_hash,
    );

    if (!isValidPassword) {
      throw new BadRequestException('La contrasena actual no coincide.');
    }

    const nextPasswordHash = await bcrypt.hash(input.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.cuenta_acceso.update({
        where: { id_cuenta: universityAdmin.id_cuenta },
        data: {
          password_hash: nextPasswordHash,
          primer_ingreso_pendiente: false,
        },
      }),
      this.prisma.credencial_inicial.updateMany({
        where: {
          id_cuenta_acceso: universityAdmin.id_cuenta,
          anulada_at: null,
        },
        data: {
          anulada_at: new Date(),
        },
      }),
    ]);

    return { ok: true };
  }

  private assertUniversityAdmin(user: RequestUser) {
    if (user.role !== 'UNIVERSITY_ADMIN' || !user.universityId) {
      throw new ForbiddenException('Este recurso es exclusivo del administrador universitario.');
    }
  }

  private async findCurrentUniversityAdmin(user: RequestUser) {
    this.assertUniversityAdmin(user);

    const universityAdmin = await this.prisma.cuenta_admin_universidad.findUnique({
      where: { id_cuenta: user.id },
      include: {
        cuenta_acceso: true,
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
    });

    if (!universityAdmin) {
      throw new NotFoundException('No encontramos la cuenta administradora de esta universidad.');
    }

    return universityAdmin;
  }

  private async resolveLocality(localityIdentifier: string, cityIdentifier: string) {
    const numericLocalityId = extractNumericId(localityIdentifier);
    const localities = await this.prisma.localidad.findMany({
      include: { ciudad: true },
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

  private toInstitutionProfile(universityAdmin: {
    id_cuenta: number;
    celular: string | null;
    cuenta_acceso: {
      correo: string;
    };
    universidad: {
      id_universidad: number;
      nombre: string;
      logo_url: string | null;
      localidad: {
        nombre: string;
        ciudad: {
          nombre: string;
        };
      };
    };
  }) {
    const cityName = universityAdmin.universidad.localidad.ciudad.nombre;
    const localityName = universityAdmin.universidad.localidad.nombre;

    return {
      adminEmail: universityAdmin.cuenta_acceso.correo,
      adminPhone: universityAdmin.celular ?? '',
      id: String(universityAdmin.universidad.id_universidad),
      logoAlt: `Logo institucional de ${universityAdmin.universidad.nombre}`,
      logoFileName: universityAdmin.universidad.logo_url ? 'Logo guardado' : null,
      logoSrc: universityAdmin.universidad.logo_url,
      mainCity: cityName,
      mainCityId: buildCityFrontId(cityName),
      mainLocality: localityName,
      mainLocalityId: buildLocalityFrontId(cityName, localityName),
      name: universityAdmin.universidad.nombre,
    };
  }
}
