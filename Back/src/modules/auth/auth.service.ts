import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { tipo_cuenta_enum } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '@/shared/database/prisma.service';
import { MailService } from '@/shared/mail/mail.service';
import type { RequestUser } from '@/shared/types/request-user.type';
import {
  buildCityFrontId,
  buildLocalityFrontId,
  extractNumericId,
  generateSixDigitCode,
  normalizeEmail,
  normalizeText,
} from '@/shared/utils/front-format.util';
import { slugify } from '@/shared/utils/text.util';
import { LoginDto } from './dto/login.dto';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

const EMAIL_CODE_EXPIRY_MINUTES = 5;
const PASSWORD_RESET_EXPIRY_MINUTES = 5;

type SessionAccount = {
  id_cuenta: number;
  correo: string;
  password_hash: string;
  tipo_cuenta: tipo_cuenta_enum;
  correo_verificado: boolean;
  primer_ingreso_pendiente: boolean;
  cuenta_admin_plataforma: {
    nombres: string;
    apellidos: string;
  } | null;
  cuenta_admin_universidad: {
    nombres: string;
    apellidos: string;
    id_universidad: number;
  } | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async login(input: LoginDto) {
    await this.ensureDefaultPlatformAdmin();

    const email = normalizeEmail(input.email);
    const account = await this.findSessionAccountByEmail(email);

    if (!account) {
      throw new UnauthorizedException('Correo o contrasena incorrectos.');
    }

    const isValidPassword = await bcrypt.compare(input.password, account.password_hash);

    if (!isValidPassword) {
      throw new UnauthorizedException('Correo o contrasena incorrectos.');
    }

    if (
      account.tipo_cuenta === tipo_cuenta_enum.PACIENTE &&
      account.correo_verificado !== true
    ) {
      throw new UnauthorizedException('Debes verificar tu correo antes de iniciar sesion.');
    }

    const user = this.buildRequestUser(account);
    const accessToken = await this.jwtService.signAsync(user, {
      expiresIn: (this.configService.get<string>('auth.jwtExpiresIn') ?? '15m') as never,
      secret: this.configService.get<string>('auth.jwtSecret') ?? 'change_me',
    });

    await this.prisma.cuenta_acceso.update({
      where: { id_cuenta: account.id_cuenta },
      data: {
        ultimo_login_at: new Date(),
      },
    });

    const requiresPasswordChange =
      account.primer_ingreso_pendiente &&
      (account.tipo_cuenta === tipo_cuenta_enum.ADMIN_UNIVERSIDAD ||
        account.tipo_cuenta === tipo_cuenta_enum.ESTUDIANTE);

    return {
      accessToken,
      requiresPasswordChange,
      user,
    };
  }

  getSession(user: RequestUser) {
    return { user };
  }

  async registerPatient(input: RegisterPatientDto) {
    const patientEmail = normalizeEmail(input.patient.email);
    const existingAccount = await this.prisma.cuenta_acceso.findUnique({
      where: { correo: patientEmail },
      select: { id_cuenta: true },
    });

    if (existingAccount) {
      throw new ConflictException('Ya existe una cuenta registrada con este correo.');
    }

    const documentType = await this.resolveDocumentType(input.patient.documentTypeCode);
    const locality = await this.resolveLocality(input.patient.localityId, input.patient.cityId);
    const passwordHash = await bcrypt.hash(input.patient.password, 10);
    const verificationCode = generateSixDigitCode();
    const verificationCodeHash = await bcrypt.hash(verificationCode, 10);
    const tutorPayload = input.tutor ?? null;

    const createdAccount = await this.prisma.$transaction(async (transaction) => {
      const person = await transaction.persona.create({
        data: {
          id_tipo_documento: documentType.id_tipo_documento,
          numero_documento: normalizeText(input.patient.documentNumber),
          nombres: normalizeText(input.patient.firstName),
          apellidos: normalizeText(input.patient.lastName),
        },
      });

      const tutor = tutorPayload
        ? await transaction.tutor_responsable.create({
            data: {
              id_tipo_documento: (await this.resolveDocumentType(tutorPayload.documentTypeCode))
                .id_tipo_documento,
              numero_documento: normalizeText(tutorPayload.documentNumber),
              nombres: normalizeText(tutorPayload.firstName),
              apellidos: normalizeText(tutorPayload.lastName),
              correo: normalizeEmail(tutorPayload.email),
              celular: normalizeText(tutorPayload.phone),
            },
          })
        : null;

      const account = await transaction.cuenta_acceso.create({
        data: {
          tipo_cuenta: tipo_cuenta_enum.PACIENTE,
          correo: patientEmail,
          password_hash: passwordHash,
          correo_verificado: false,
          primer_ingreso_pendiente: false,
        },
      });

      await transaction.cuenta_paciente.create({
        data: {
          id_cuenta: account.id_cuenta,
          id_persona: person.id_persona,
          id_localidad: locality.id_localidad,
          id_tutor_responsable: tutor?.id_tutor_responsable ?? null,
          sexo: input.patient.sex,
          fecha_nacimiento: new Date(input.patient.birthDate),
          celular: normalizeText(input.patient.phone),
        },
      });

      await transaction.verificacion_correo.create({
        data: {
          id_cuenta_acceso: account.id_cuenta,
          codigo_hash: verificationCodeHash,
          expira_at: this.buildExpiryDate(EMAIL_CODE_EXPIRY_MINUTES),
        },
      });

      return account;
    });

    await this.mailService.sendVerificationCode(createdAccount.correo, verificationCode);

    return {
      email: createdAccount.correo,
      ok: true,
    };
  }

  async verifyEmail(input: VerifyEmailDto) {
    const account = await this.prisma.cuenta_acceso.findUnique({
      where: { correo: normalizeEmail(input.email) },
      select: {
        id_cuenta: true,
        correo_verificado: true,
      },
    });

    if (!account) {
      throw new NotFoundException('No encontramos una cuenta asociada a este correo.');
    }

    if (account.correo_verificado) {
      return { ok: true };
    }

    const verification = await this.prisma.verificacion_correo.findFirst({
      where: {
        id_cuenta_acceso: account.id_cuenta,
        usado_at: null,
      },
      orderBy: { fecha_creacion: 'desc' },
    });

    if (!verification || verification.expira_at.getTime() < Date.now()) {
      throw new BadRequestException('El codigo de verificacion expiro. Solicita uno nuevo.');
    }

    const isValidCode = await bcrypt.compare(input.code, verification.codigo_hash);

    if (!isValidCode) {
      throw new BadRequestException('El codigo ingresado no es valido.');
    }

    await this.prisma.$transaction([
      this.prisma.verificacion_correo.update({
        where: { id_verificacion_correo: verification.id_verificacion_correo },
        data: { usado_at: new Date() },
      }),
      this.prisma.cuenta_acceso.update({
        where: { id_cuenta: account.id_cuenta },
        data: {
          correo_verificado: true,
          correo_verificado_at: new Date(),
        },
      }),
    ]);

    return { ok: true };
  }

  async resendVerificationCode(input: RequestPasswordResetDto) {
    const account = await this.prisma.cuenta_acceso.findUnique({
      where: { correo: normalizeEmail(input.email) },
      select: {
        id_cuenta: true,
        correo: true,
        correo_verificado: true,
      },
    });

    if (!account) {
      throw new NotFoundException('No encontramos una cuenta asociada a este correo.');
    }

    if (account.correo_verificado) {
      return {
        cooldownSeconds: 60,
        message: 'El correo ya se encuentra verificado.',
        ok: true,
      };
    }

    const verificationCode = generateSixDigitCode();
    const verificationCodeHash = await bcrypt.hash(verificationCode, 10);

    await this.prisma.verificacion_correo.create({
      data: {
        id_cuenta_acceso: account.id_cuenta,
        codigo_hash: verificationCodeHash,
        expira_at: this.buildExpiryDate(EMAIL_CODE_EXPIRY_MINUTES),
      },
    });

    await this.mailService.sendVerificationCode(account.correo, verificationCode);

    return {
      cooldownSeconds: 60,
      message: 'Generamos un nuevo codigo de verificacion.',
      ok: true,
    };
  }

  async requestPasswordReset(input: RequestPasswordResetDto) {
    const account = await this.prisma.cuenta_acceso.findUnique({
      where: { correo: normalizeEmail(input.email) },
      select: {
        id_cuenta: true,
        correo: true,
      },
    });

    if (!account) {
      throw new NotFoundException('No encontramos una cuenta asociada a este correo.');
    }

    const code = generateSixDigitCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = this.buildExpiryDate(PASSWORD_RESET_EXPIRY_MINUTES);

    await this.prisma.recuperacion_cuenta.create({
      data: {
        id_cuenta_acceso: account.id_cuenta,
        codigo_hash: codeHash,
        expira_at: expiresAt,
      },
    });

    await this.mailService.sendPasswordResetCode(account.correo, code);

    return {
      cooldownSeconds: 60,
      expiresAt: expiresAt.getTime(),
      ok: true,
    };
  }

  async verifyPasswordResetCode(input: VerifyEmailDto) {
    await this.assertPasswordResetCode(input.email, input.code);
    return { ok: true };
  }

  async resetPassword(input: ResetPasswordDto) {
    const resetRecord = await this.assertPasswordResetCode(input.email, input.code);
    const passwordHash = await bcrypt.hash(input.password, 10);

    await this.prisma.$transaction([
      this.prisma.recuperacion_cuenta.update({
        where: { id_recuperacion_cuenta: resetRecord.id_recuperacion_cuenta },
        data: { usado_at: new Date() },
      }),
      this.prisma.cuenta_acceso.update({
        where: { id_cuenta: resetRecord.id_cuenta_acceso },
        data: {
          password_hash: passwordHash,
          primer_ingreso_pendiente: false,
        },
      }),
    ]);

    return { ok: true };
  }

  async changeFirstLoginPassword(user: RequestUser, password: string) {
    const account = await this.prisma.cuenta_acceso.findUnique({
      where: { id_cuenta: user.id },
      select: { primer_ingreso_pendiente: true, tipo_cuenta: true },
    });

    if (
      !account?.primer_ingreso_pendiente ||
      (account.tipo_cuenta !== tipo_cuenta_enum.ADMIN_UNIVERSIDAD &&
        account.tipo_cuenta !== tipo_cuenta_enum.ESTUDIANTE)
    ) {
      throw new UnauthorizedException('Esta operación no está permitida para tu cuenta.');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.cuenta_acceso.update({
      where: { id_cuenta: user.id },
      data: {
        password_hash: passwordHash,
        primer_ingreso_pendiente: false,
      },
    });

    return { ok: true };
  }

  private async ensureDefaultPlatformAdmin() {
    const adminEmail = this.configService.get<string>('auth.platformAdminEmail') ?? 'admin@docqee.local';
    const adminPassword = this.configService.get<string>('auth.platformAdminPassword') ?? 'Admin123!';
    const adminNombres = this.configService.get<string>('auth.platformAdminNombres') ?? 'Admin';
    const adminApellidos = this.configService.get<string>('auth.platformAdminApellidos') ?? 'Docqee';

    const existingAdmin = await this.prisma.cuenta_acceso.findUnique({
      where: { correo: adminEmail },
      select: { id_cuenta: true },
    });

    if (existingAdmin) {
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    await this.prisma.$transaction(async (transaction) => {
      const account = await transaction.cuenta_acceso.create({
        data: {
          tipo_cuenta: tipo_cuenta_enum.ADMIN_PLATAFORMA,
          correo: adminEmail,
          password_hash: passwordHash,
          correo_verificado: true,
          correo_verificado_at: new Date(),
          primer_ingreso_pendiente: false,
        },
      });

      await transaction.cuenta_admin_plataforma.create({
        data: {
          id_cuenta: account.id_cuenta,
          nombres: adminNombres,
          apellidos: adminApellidos,
        },
      });
    });
  }

  private async findSessionAccountByEmail(email: string): Promise<SessionAccount | null> {
    return this.prisma.cuenta_acceso.findUnique({
      where: { correo: email },
      select: {
        id_cuenta: true,
        correo: true,
        password_hash: true,
        tipo_cuenta: true,
        correo_verificado: true,
        primer_ingreso_pendiente: true,
        cuenta_admin_plataforma: {
          select: {
            nombres: true,
            apellidos: true,
          },
        },
        cuenta_admin_universidad: {
          select: {
            nombres: true,
            apellidos: true,
            id_universidad: true,
          },
        },
      },
    });
  }

  private buildRequestUser(account: SessionAccount): RequestUser {
    if (account.tipo_cuenta === tipo_cuenta_enum.ADMIN_PLATAFORMA && account.cuenta_admin_plataforma) {
      return {
        email: account.correo,
        firstName: account.cuenta_admin_plataforma.nombres,
        id: account.id_cuenta,
        lastName: account.cuenta_admin_plataforma.apellidos,
        role: 'PLATFORM_ADMIN',
      };
    }

    if (account.tipo_cuenta === tipo_cuenta_enum.ADMIN_UNIVERSIDAD && account.cuenta_admin_universidad) {
      return {
        email: account.correo,
        firstName: account.cuenta_admin_universidad.nombres,
        id: account.id_cuenta,
        lastName: account.cuenta_admin_universidad.apellidos,
        role: 'UNIVERSITY_ADMIN',
        universityId: account.cuenta_admin_universidad.id_universidad,
      };
    }

    if (account.tipo_cuenta === tipo_cuenta_enum.ESTUDIANTE) {
      return {
        email: account.correo,
        firstName: 'Estudiante',
        id: account.id_cuenta,
        lastName: 'Docqee',
        role: 'STUDENT',
      };
    }

    return {
      email: account.correo,
      firstName: 'Paciente',
      id: account.id_cuenta,
      lastName: 'Docqee',
      role: 'PATIENT',
    };
  }

  private async resolveDocumentType(identifier: string) {
    const seededDocumentTypes = [
      { codigo: 'CC', nombre: 'Cedula de ciudadania' },
      { codigo: 'CE', nombre: 'Cedula de extranjeria' },
      { codigo: 'TI', nombre: 'Tarjeta de identidad' },
      { codigo: 'PASSPORT', nombre: 'Pasaporte' },
    ] as const;

    for (const documentType of seededDocumentTypes) {
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

    const normalizedIdentifier = normalizeText(identifier).toUpperCase();
    const documentTypeCode = normalizedIdentifier.startsWith('DOCUMENT-')
      ? normalizedIdentifier.replace('DOCUMENT-', '')
      : normalizedIdentifier;

    const documentType = await this.prisma.tipo_documento.findFirst({
      where: {
        OR: [
          { codigo: documentTypeCode },
          { id_tipo_documento: extractNumericId(identifier) ?? -1 },
        ],
      },
    });

    if (!documentType) {
      throw new BadRequestException('El tipo de documento solicitado no existe.');
    }

    return documentType;
  }

  private async resolveLocality(localityIdentifier: string, cityIdentifier?: string) {
    const numericLocalityId = extractNumericId(localityIdentifier);

    const localities = await this.prisma.localidad.findMany({
      include: {
        ciudad: true,
      },
    });

    const locality =
      localities.find((item) => item.id_localidad === numericLocalityId) ??
      localities.find((item) => {
        const candidateFrontId = buildLocalityFrontId(item.ciudad.nombre, item.nombre);
        return candidateFrontId === localityIdentifier;
      }) ??
      localities.find((item) => {
        if (!cityIdentifier) {
          return false;
        }

        return (
          buildCityFrontId(item.ciudad.nombre) === cityIdentifier &&
          slugify(item.nombre) === slugify(localityIdentifier)
        );
      });

    if (!locality) {
      throw new BadRequestException('La localidad seleccionada no existe.');
    }

    return locality;
  }

  private buildExpiryDate(minutes: number) {
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  private async assertPasswordResetCode(email: string, code: string) {
    const account = await this.prisma.cuenta_acceso.findUnique({
      where: { correo: normalizeEmail(email) },
      select: { id_cuenta: true },
    });

    if (!account) {
      throw new NotFoundException('No encontramos una cuenta asociada a este correo.');
    }

    const resetRecord = await this.prisma.recuperacion_cuenta.findFirst({
      where: {
        id_cuenta_acceso: account.id_cuenta,
        usado_at: null,
      },
      orderBy: { fecha_creacion: 'desc' },
    });

    if (!resetRecord || resetRecord.expira_at.getTime() < Date.now()) {
      throw new BadRequestException('El codigo de recuperacion expiro.');
    }

    const isValidCode = await bcrypt.compare(code, resetRecord.codigo_hash);

    if (!isValidCode) {
      throw new BadRequestException('El codigo de recuperacion no es valido.');
    }

    return resetRecord;
  }
}
