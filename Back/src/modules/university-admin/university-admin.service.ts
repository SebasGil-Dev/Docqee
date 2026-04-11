import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { estado_simple_enum, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '@/shared/database/prisma.service';
import {
  CloudinaryService,
  type UploadImageFile,
} from '@/shared/storage/cloudinary.service';
import type { RequestUser } from '@/shared/types/request-user.type';
import {
  buildCityFrontId,
  buildLocalityFrontId,
  normalizeEmail,
  normalizeText,
} from '@/shared/utils/front-format.util';
import { slugify } from '@/shared/utils/text.util';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  UpdateCampusDto,
  UpdateInstitutionProfileDto,
} from './dto/update-institution-profile.dto';

type ResolvedLocality = {
  id_localidad: number;
  nombre: string;
  ciudad: {
    id_ciudad?: number;
    nombre: string;
  };
};

type InstitutionProfileCampus = {
  address: string;
  city: string;
  cityId: string;
  id: string;
  locality: string;
  localityId: string;
  name: string;
  status: 'active' | 'inactive';
};

type InstitutionProfile = {
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminPhone: string;
  campuses: InstitutionProfileCampus[];
  id: string;
  logoAlt: string;
  logoFileName: string | null;
  logoSrc: string | null;
  mainCity: string;
  mainCityId: string;
  mainLocality: string;
  mainLocalityId: string;
  name: string;
};

@Injectable()
export class UniversityAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async getProfile(user: RequestUser) {
    const universityAdmin = await this.findCurrentUniversityAdmin(user);
    return this.toInstitutionProfile(universityAdmin);
  }

  async updateProfile(user: RequestUser, input: UpdateInstitutionProfileDto) {
    const universityAdmin = await this.findCurrentUniversityAdmin(user);
    const currentProfile = this.toInstitutionProfile(universityAdmin);
    const adminEmail = normalizeEmail(input.adminEmail);
    const adminFirstName = normalizeText(input.adminFirstName);
    const adminLastName = normalizeText(input.adminLastName);
    const adminPhone = input.adminPhone ? normalizeText(input.adminPhone) : null;
    const universityName = normalizeText(input.universityName);
    const hasLocalityChanged =
      input.cityId !== currentProfile.mainCityId ||
      input.mainLocalityId !== currentProfile.mainLocalityId;
    const locality = hasLocalityChanged
      ? await this.resolveLocality(input.mainLocalityId, input.cityId)
      : {
          id_localidad: universityAdmin.universidad.localidad.id_localidad,
          nombre: universityAdmin.universidad.localidad.nombre,
          ciudad: {
            nombre: universityAdmin.universidad.localidad.ciudad.nombre,
          },
        };

    if (adminEmail !== universityAdmin.cuenta_acceso.correo) {
      const existingEmailOwner = await this.prisma.cuenta_acceso.findUnique({
        where: { correo: adminEmail },
        select: { id_cuenta: true },
      });

      if (existingEmailOwner && existingEmailOwner.id_cuenta !== universityAdmin.id_cuenta) {
        throw new ConflictException('Ya existe una cuenta registrada con este correo.');
      }
    }

    const logoUrl = await this.resolveNextInstitutionLogoUrl(
      input.logoSrc,
      universityAdmin.universidad.logo_url,
      universityAdmin.id_universidad,
    );
    const transactionOperations: Prisma.PrismaPromise<unknown>[] = [];
    const universityData: {
      id_localidad_principal?: number;
      logo_url?: string | null;
      nombre?: string;
    } = {};
    const adminData: {
      apellidos?: string;
      celular?: string | null;
      nombres?: string;
    } = {};

    if (universityName !== universityAdmin.universidad.nombre) {
      universityData.nombre = universityName;
    }

    if (hasLocalityChanged) {
      universityData.id_localidad_principal = locality.id_localidad;
    }

    if (logoUrl !== universityAdmin.universidad.logo_url) {
      universityData.logo_url = logoUrl;
    }

    if (Object.keys(universityData).length > 0) {
      transactionOperations.push(
        this.prisma.universidad.update({
          where: { id_universidad: universityAdmin.id_universidad },
          data: universityData,
        }),
      );
    }

    if (adminEmail !== universityAdmin.cuenta_acceso.correo) {
      transactionOperations.push(
        this.prisma.cuenta_acceso.update({
          where: { id_cuenta: universityAdmin.id_cuenta },
          data: { correo: adminEmail },
        }),
      );
    }

    if (adminFirstName !== universityAdmin.nombres) {
      adminData.nombres = adminFirstName;
    }

    if (adminLastName !== universityAdmin.apellidos) {
      adminData.apellidos = adminLastName;
    }

    if (adminPhone !== universityAdmin.celular) {
      adminData.celular = adminPhone;
    }

    if (Object.keys(adminData).length > 0) {
      transactionOperations.push(
        this.prisma.cuenta_admin_universidad.update({
          where: { id_cuenta: universityAdmin.id_cuenta },
          data: adminData,
        }),
      );
    }

    if (transactionOperations.length > 0) {
      await this.prisma.$transaction(transactionOperations);
    }

    let campuses: InstitutionProfileCampus[] = currentProfile.campuses;

    if (this.haveCampusesChanged(currentProfile.campuses, input.campuses)) {
      campuses = await this.syncCampuses(
        universityAdmin.id_universidad,
        input.campuses ?? [],
      );
    }

    return this.buildUpdatedInstitutionProfile(currentProfile, {
      adminEmail,
      adminFirstName,
      adminLastName,
      adminPhone,
      campuses,
      locality,
      logoUrl,
      universityName,
    });
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

  async uploadProfileLogo(user: RequestUser, file: UploadImageFile | undefined) {
    const universityAdmin = await this.findCurrentUniversityAdmin(user);

    if (!file) {
      throw new BadRequestException('Selecciona un logo institucional.');
    }

    const uploadedLogo = await this.cloudinaryService.uploadImageFile(file, {
      folder: `docqee/universidades/${universityAdmin.id_universidad}/logos`,
      publicId: `logo-${Date.now()}-${randomUUID()}`,
    });

    return {
      logoFileName: file.originalname ?? 'Logo cargado',
      logoSrc: uploadedLogo.secureUrl,
      publicId: uploadedLogo.publicId,
    };
  }

  private async resolveInstitutionLogoUrl(logoSrc: string | null | undefined, universityId: number) {
    if (!logoSrc) {
      return undefined;
    }

    if (this.cloudinaryService.isImageDataUri(logoSrc)) {
      const uploadedLogo = await this.cloudinaryService.uploadImageDataUri(logoSrc, {
        folder: `docqee/universidades/${universityId}`,
        publicId: 'logo',
      });

      return uploadedLogo.secureUrl;
    }

    if (/^https?:\/\//i.test(logoSrc)) {
      return logoSrc;
    }

    throw new BadRequestException('El logo institucional no tiene un formato valido.');
  }

  private async resolveNextInstitutionLogoUrl(
    logoSrc: string | null | undefined,
    currentLogoUrl: string | null,
    universityId: number,
  ): Promise<string | null> {
    const normalizedLogoSrc = logoSrc?.trim();

    if (!normalizedLogoSrc || normalizedLogoSrc === currentLogoUrl) {
      return currentLogoUrl;
    }

    return (await this.resolveInstitutionLogoUrl(normalizedLogoSrc, universityId)) ?? currentLogoUrl;
  }

  private async syncCampuses(
    universityId: number,
    campuses: UpdateCampusDto[],
  ) {
    const resolvedCampuses = await Promise.all(
      campuses.map(async (campus) => ({
        campus,
        locality: await this.resolveLocality(campus.localityId, campus.cityId),
      })),
    );

    const savedCampuses = await this.prisma.$transaction(async (transaction) => {
      const saved: InstitutionProfileCampus[] = [];
      const savedIds: number[] = [];

      for (const { campus, locality } of resolvedCampuses) {
        const numericId = this.extractStrictNumericId(campus.id);
        const estado =
          campus.status === 'active' ? estado_simple_enum.ACTIVO : estado_simple_enum.INACTIVO;
        const data = {
          direccion: normalizeText(campus.address),
          estado,
          id_localidad: locality.id_localidad,
          nombre: normalizeText(campus.name),
        };

        if (numericId) {
          await transaction.sede.updateMany({
            where: { id_sede: numericId, id_universidad: universityId },
            data,
          });
          savedIds.push(numericId);
          saved.push(this.toInstitutionProfileCampus(campus, locality, numericId));
          continue;
        }

        const createdCampus = await transaction.sede.create({
          data: {
            ...data,
            id_universidad: universityId,
          },
          select: { id_sede: true },
        });

        savedIds.push(createdCampus.id_sede);
        saved.push(this.toInstitutionProfileCampus(campus, locality, createdCampus.id_sede));
      }

      if (savedIds.length > 0) {
        await transaction.sede.updateMany({
          where: {
            id_universidad: universityId,
            id_sede: { notIn: savedIds },
          },
          data: { estado: estado_simple_enum.INACTIVO },
        });
      }

      return saved;
    });

    return savedCampuses.filter((campus) => campus.status === 'active');
  }

  private haveCampusesChanged(
    currentCampuses: InstitutionProfileCampus[],
    nextCampuses: UpdateCampusDto[] | undefined,
  ) {
    if (!nextCampuses) {
      return false;
    }

    if (currentCampuses.length !== nextCampuses.length) {
      return true;
    }

    const currentSignature = currentCampuses
      .map((campus) => this.getCampusSignature(campus))
      .sort()
      .join('\n');
    const nextSignature = nextCampuses
      .map((campus) => this.getCampusSignature(campus))
      .sort()
      .join('\n');

    return currentSignature !== nextSignature;
  }

  private getCampusSignature(campus: InstitutionProfileCampus | UpdateCampusDto) {
    return [
      campus.id,
      normalizeText(campus.name),
      normalizeText(campus.address),
      campus.cityId,
      campus.localityId,
      campus.status,
    ].join('|');
  }

  private toInstitutionProfileCampus(
    campus: UpdateCampusDto,
    locality: ResolvedLocality,
    campusId: number,
  ): InstitutionProfileCampus {
    return {
      address: normalizeText(campus.address),
      city: locality.ciudad.nombre,
      cityId: buildCityFrontId(locality.ciudad.nombre),
      id: String(campusId),
      locality: locality.nombre,
      localityId: buildLocalityFrontId(locality.ciudad.nombre, locality.nombre),
      name: normalizeText(campus.name),
      status: campus.status,
    };
  }

  private buildUpdatedInstitutionProfile(
    currentProfile: InstitutionProfile,
    values: {
      adminEmail: string;
      adminFirstName: string;
      adminLastName: string;
      adminPhone: string | null;
      campuses: InstitutionProfileCampus[];
      locality: ResolvedLocality;
      logoUrl: string | null;
      universityName: string;
    },
  ): InstitutionProfile {
    return {
      ...currentProfile,
      adminEmail: values.adminEmail,
      adminFirstName: values.adminFirstName,
      adminLastName: values.adminLastName,
      adminPhone: values.adminPhone ?? '',
      campuses: values.campuses,
      logoAlt: `Logo institucional de ${values.universityName}`,
      logoFileName: values.logoUrl ? 'Logo guardado' : null,
      logoSrc: values.logoUrl,
      mainCity: values.locality.ciudad.nombre,
      mainCityId: buildCityFrontId(values.locality.ciudad.nombre),
      mainLocality: values.locality.nombre,
      mainLocalityId: buildLocalityFrontId(values.locality.ciudad.nombre, values.locality.nombre),
      name: values.universityName,
    };
  }

  private extractStrictNumericId(value: string) {
    return /^\d+$/.test(value) ? Number(value) : null;
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
      include: { ciudad: true },
    });

    const locality = localities.find((item) => {
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
