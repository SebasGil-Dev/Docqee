import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { estado_simple_enum } from '@prisma/client';
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
        data: { correo: adminEmail },
      }),
      this.prisma.cuenta_admin_universidad.update({
        where: { id_cuenta: universityAdmin.id_cuenta },
        data: {
          nombres: normalizeText(input.adminFirstName),
          apellidos: normalizeText(input.adminLastName),
          celular: input.adminPhone ? normalizeText(input.adminPhone) : null,
        },
      }),
    ]);

    if (input.campuses && input.campuses.length > 0) {
      await this.syncCampuses(universityAdmin.id_universidad, input.campuses);
    }

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

  private async syncCampuses(
    universityId: number,
    campuses: UpdateInstitutionProfileDto['campuses'] & object[],
  ) {
    const localities = await this.prisma.localidad.findMany({ include: { ciudad: true } });

    for (const campus of campuses) {
      // Only treat as existing DB record if the entire id is a pure integer string ("1", "42")
      // Frontend temp ids like "campus-1" must create new records
      const numericId = /^\d+$/.test(campus.id) ? parseInt(campus.id, 10) : null;
      const estado = campus.status === 'active' ? estado_simple_enum.ACTIVO : estado_simple_enum.INACTIVO;

      const locality =
        localities.find((l) => l.id_localidad === extractNumericId(campus.localityId)) ??
        localities.find(
          (l) =>
            buildLocalityFrontId(l.ciudad.nombre, l.nombre) === campus.localityId &&
            buildCityFrontId(l.ciudad.nombre) === campus.cityId,
        ) ??
        localities.find(
          (l) =>
            buildCityFrontId(l.ciudad.nombre) === campus.cityId &&
            slugify(l.nombre) === slugify(campus.localityId),
        );

      if (!locality) continue;

      if (numericId) {
        await this.prisma.sede.updateMany({
          where: { id_sede: numericId, id_universidad: universityId },
          data: {
            nombre: normalizeText(campus.name),
            direccion: normalizeText(campus.address),
            id_localidad: locality.id_localidad,
            estado,
          },
        });
      } else {
        await this.prisma.sede.create({
          data: {
            id_universidad: universityId,
            id_localidad: locality.id_localidad,
            nombre: normalizeText(campus.name),
            direccion: normalizeText(campus.address),
            estado,
          },
        });
      }
    }

    // Mark sedes not in the list as inactive (only consider existing numeric IDs)
    const sentIds = campuses
      .map((c) => (/^\d+$/.test(c.id) ? parseInt(c.id, 10) : null))
      .filter((id): id is number => id !== null);

    if (sentIds.length > 0) {
      await this.prisma.sede.updateMany({
        where: {
          id_universidad: universityId,
          id_sede: { notIn: sentIds },
        },
        data: { estado: estado_simple_enum.INACTIVO },
      });
    }
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
            localidad: { include: { ciudad: true } },
            sede: {
              where: { estado: estado_simple_enum.ACTIVO },
              include: { localidad: { include: { ciudad: true } } },
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
    nombres: string;
    apellidos: string;
    celular: string | null;
    cuenta_acceso: { correo: string };
    universidad: {
      id_universidad: number;
      nombre: string;
      logo_url: string | null;
      localidad: { nombre: string; ciudad: { nombre: string } };
      sede: {
        id_sede: number;
        nombre: string;
        direccion: string;
        localidad: { nombre: string; ciudad: { nombre: string } };
      }[];
    };
  }) {
    const cityName = universityAdmin.universidad.localidad.ciudad.nombre;
    const localityName = universityAdmin.universidad.localidad.nombre;

    return {
      adminEmail: universityAdmin.cuenta_acceso.correo,
      adminFirstName: universityAdmin.nombres,
      adminLastName: universityAdmin.apellidos,
      adminPhone: universityAdmin.celular ?? '',
      campuses: universityAdmin.universidad.sede.map((s) => ({
        address: s.direccion,
        city: s.localidad.ciudad.nombre,
        cityId: buildCityFrontId(s.localidad.ciudad.nombre),
        id: String(s.id_sede),
        locality: s.localidad.nombre,
        localityId: buildLocalityFrontId(s.localidad.ciudad.nombre, s.localidad.nombre),
        name: s.nombre,
        status: 'active' as const,
      })),
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
