import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { estado_simple_enum, Prisma, sexo_enum, tipo_cuenta_enum } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PENDING_CREDENTIAL_PASSWORD_HASH_PREFIX } from '@/shared/constants/auth.constants';
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
import { RefreshSessionDto } from './dto/refresh-session.dto';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

const EMAIL_CODE_EXPIRY_MINUTES = 5;
const PASSWORD_RESET_EXPIRY_MINUTES = 5;

type PendingPatientRegistrationPayload = {
  patient: {
    birthDate: string;
    documentNumber: string;
    documentTypeId: number;
    email: string;
    firstName: string;
    lastName: string;
    localityId: number;
    passwordHash: string;
    phone: string;
    sex: sexo_enum;
  };
  tutor: {
    documentNumber: string;
    documentTypeId: number;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
};

type SessionAccount = {
  id_cuenta: number;
  correo: string;
  password_hash: string;
  tipo_cuenta: tipo_cuenta_enum;
  estado: estado_simple_enum;
  correo_verificado: boolean;
  primer_ingreso_pendiente: boolean;
  cuenta_admin_plataforma: {
    apellidos: string;
    nombres: string;
  } | null;
  cuenta_admin_universidad: {
    apellidos: string;
    id_universidad: number;
    nombres: string;
    universidad: {
      estado: estado_simple_enum;
    };
  } | null;
  cuenta_estudiante: {
    persona: { apellidos: string; nombres: string };
  } | null;
  cuenta_paciente: {
    persona: { apellidos: string; nombres: string };
  } | null;
};

type RefreshTokenPayload = RequestUser & {
  tokenType: 'refresh';
};

type SessionAccountBase = Pick<
  SessionAccount,
  | 'correo'
  | 'correo_verificado'
  | 'id_cuenta'
  | 'password_hash'
  | 'estado'
  | 'primer_ingreso_pendiente'
  | 'tipo_cuenta'
>;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async login(input: LoginDto) {
    const email = normalizeEmail(input.email);
    const account = await this.findSessionAccountBaseByEmail(email);

    if (!account) {
      throw new UnauthorizedException('Correo o contrasena incorrectos.');
    }

    const passwordValidationPromise = this.verifyPassword(input.password, account.password_hash);
    const sessionAccountPromise = this.hydrateSessionAccount(account);
    const [isValidPassword, sessionAccount] = await Promise.all([
      passwordValidationPromise,
      sessionAccountPromise,
    ]);

    if (!isValidPassword) {
      throw new UnauthorizedException('Correo o contrasena incorrectos.');
    }

    this.assertSessionAccessAllowed(sessionAccount);

    void this.touchLastLogin(sessionAccount.id_cuenta);

    return this.buildSessionResponse(sessionAccount);
  }

  async getSession(user: RequestUser) {
    const account = await this.findSessionAccountById(user.id);

    if (!account) {
      throw new UnauthorizedException('No encontramos una sesion activa para esta cuenta.');
    }

    this.assertSessionAccessAllowed(account);

    return {
      requiresPasswordChange: this.resolveRequiresPasswordChange(account),
      user: this.buildRequestUser(account),
    };
  }

  async refreshSession(input: RefreshSessionDto) {
    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(input.refreshToken, {
        secret: this.configService.get<string>('auth.jwtRefreshSecret') ?? 'change_me_too',
      });
    } catch {
      throw new UnauthorizedException('La sesion expiro. Inicia sesion nuevamente.');
    }

    if (payload.tokenType !== 'refresh') {
      throw new UnauthorizedException('El token de renovacion no es valido.');
    }

    const account = await this.findSessionAccountById(payload.id);

    if (!account) {
      throw new UnauthorizedException('No encontramos una sesion activa para esta cuenta.');
    }

    this.assertSessionAccessAllowed(account);

    return this.buildSessionResponse(account);
  }

  async registerPatient(input: RegisterPatientDto) {
    const patientEmail = normalizeEmail(input.patient.email);
    const existingAccount = await this.prisma.cuenta_acceso.findUnique({
      where: { correo: patientEmail },
      select: { id_cuenta: true },
    });

    const canReuseEmail =
      existingAccount && (await this.deleteUnverifiedPatientAccountIfUnused(patientEmail));

    if (existingAccount && !canReuseEmail) {
      throw new ConflictException(
        'No pudimos iniciar el registro con estos datos. Revisa la informacion o intenta recuperar tu cuenta.',
      );
    }

    const documentType = await this.resolveDocumentType(input.patient.documentTypeCode);
    const locality = await this.resolveLocality(input.patient.localityId, input.patient.cityId);
    const passwordHash = await bcrypt.hash(input.patient.password, 10);
    const verificationCode = generateSixDigitCode();
    const verificationCodeHash = await bcrypt.hash(verificationCode, 10);
    const tutorPayload = input.tutor ?? null;
    const tutorDocumentType = tutorPayload
      ? await this.resolveDocumentType(tutorPayload.documentTypeCode)
      : null;
    const payload: PendingPatientRegistrationPayload = {
      patient: {
        birthDate: input.patient.birthDate,
        documentNumber: normalizeText(input.patient.documentNumber),
        documentTypeId: documentType.id_tipo_documento,
        email: patientEmail,
        firstName: normalizeText(input.patient.firstName),
        lastName: normalizeText(input.patient.lastName),
        localityId: locality.id_localidad,
        passwordHash,
        phone: normalizeText(input.patient.phone),
        sex: input.patient.sex as sexo_enum,
      },
      tutor:
        tutorPayload && tutorDocumentType
          ? {
              documentNumber: normalizeText(tutorPayload.documentNumber),
              documentTypeId: tutorDocumentType.id_tipo_documento,
              email: normalizeEmail(tutorPayload.email),
              firstName: normalizeText(tutorPayload.firstName),
              lastName: normalizeText(tutorPayload.lastName),
              phone: normalizeText(tutorPayload.phone),
            }
          : null,
    };

    await this.prisma.registro_paciente_pendiente.upsert({
      where: { correo: patientEmail },
      create: {
        correo: patientEmail,
        payload: payload as unknown as Prisma.InputJsonValue,
        codigo_hash: verificationCodeHash,
        expira_at: this.buildExpiryDate(EMAIL_CODE_EXPIRY_MINUTES),
      },
      update: {
        payload: payload as unknown as Prisma.InputJsonValue,
        codigo_hash: verificationCodeHash,
        expira_at: this.buildExpiryDate(EMAIL_CODE_EXPIRY_MINUTES),
        usado_at: null,
        fecha_actualizacion: new Date(),
      },
    });

    await this.mailService.sendVerificationCode(patientEmail, verificationCode);

    return {
      email: patientEmail,
      ok: true,
    };
  }

  async verifyEmail(input: VerifyEmailDto) {
    const email = normalizeEmail(input.email);
    const pendingRegistration = await this.prisma.registro_paciente_pendiente.findUnique({
      where: { correo: email },
    });

    if (pendingRegistration && pendingRegistration.usado_at === null) {
      if (pendingRegistration.expira_at.getTime() < Date.now()) {
        throw new BadRequestException('El codigo de verificacion expiro. Solicita uno nuevo.');
      }

      const isValidPendingCode = await bcrypt.compare(input.code, pendingRegistration.codigo_hash);

      if (!isValidPendingCode) {
        throw new BadRequestException('El codigo ingresado no es valido.');
      }

      const payload = this.parsePendingPatientRegistrationPayload(pendingRegistration.payload);
      const patientBirthDate = this.parsePatientBirthDate(payload.patient.birthDate);

      await this.assertPatientDocumentAvailable(
        payload.patient.documentTypeId,
        payload.patient.documentNumber,
      );

      try {
        await this.prisma.$transaction(async (transaction) => {
          const existingAccount = await transaction.cuenta_acceso.findUnique({
            where: { correo: email },
            select: { id_cuenta: true },
          });

          if (existingAccount) {
            throw new ConflictException(
              'No pudimos finalizar el registro con estos datos. Revisa la informacion o intenta recuperar tu cuenta.',
            );
          }

          const existingPerson = await transaction.persona.findFirst({
            where: {
              id_tipo_documento: payload.patient.documentTypeId,
              numero_documento: payload.patient.documentNumber,
            },
            select: { id_persona: true },
          });

          if (existingPerson) {
            throw new ConflictException(
              'El numero de documento ya esta registrado en Docqee. Inicia sesion o recupera tu cuenta si ya la tienes.',
            );
          }

          const person = await transaction.persona.create({
            data: {
              id_tipo_documento: payload.patient.documentTypeId,
              numero_documento: payload.patient.documentNumber,
              nombres: payload.patient.firstName,
              apellidos: payload.patient.lastName,
            },
          });

          const tutor = payload.tutor
            ? await transaction.tutor_responsable.upsert({
                where: {
                  id_tipo_documento_numero_documento: {
                    id_tipo_documento: payload.tutor.documentTypeId,
                    numero_documento: payload.tutor.documentNumber,
                  },
                },
                create: {
                  id_tipo_documento: payload.tutor.documentTypeId,
                  numero_documento: payload.tutor.documentNumber,
                  nombres: payload.tutor.firstName,
                  apellidos: payload.tutor.lastName,
                  correo: payload.tutor.email,
                  celular: payload.tutor.phone,
                },
                update: {
                  nombres: payload.tutor.firstName,
                  apellidos: payload.tutor.lastName,
                  correo: payload.tutor.email,
                  celular: payload.tutor.phone,
                },
              })
            : null;

          const account = await transaction.cuenta_acceso.create({
            data: {
              tipo_cuenta: tipo_cuenta_enum.PACIENTE,
              correo: payload.patient.email,
              password_hash: payload.patient.passwordHash,
              correo_verificado: true,
              correo_verificado_at: new Date(),
              primer_ingreso_pendiente: false,
            },
          });

          await transaction.cuenta_paciente.create({
            data: {
              id_cuenta: account.id_cuenta,
              id_persona: person.id_persona,
              id_localidad: payload.patient.localityId,
              id_tutor_responsable: tutor?.id_tutor_responsable ?? null,
              sexo: payload.patient.sex,
              fecha_nacimiento: patientBirthDate,
              celular: payload.patient.phone,
            },
          });

          await transaction.registro_paciente_pendiente.delete({
            where: {
              id_registro_paciente_pendiente:
                pendingRegistration.id_registro_paciente_pendiente,
            },
          });
        });
      } catch (error) {
        this.handlePatientVerificationPersistenceError(error, email);
      }

      return { ok: true };
    }

    const account = await this.prisma.cuenta_acceso.findUnique({
      where: { correo: email },
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
    const email = normalizeEmail(input.email);
    const pendingRegistration = await this.prisma.registro_paciente_pendiente.findUnique({
      where: { correo: email },
      select: {
        id_registro_paciente_pendiente: true,
        usado_at: true,
      },
    });

    if (pendingRegistration && pendingRegistration.usado_at === null) {
      const verificationCode = generateSixDigitCode();
      const verificationCodeHash = await bcrypt.hash(verificationCode, 10);

      await this.prisma.registro_paciente_pendiente.update({
        where: {
          id_registro_paciente_pendiente:
            pendingRegistration.id_registro_paciente_pendiente,
        },
        data: {
          codigo_hash: verificationCodeHash,
          expira_at: this.buildExpiryDate(EMAIL_CODE_EXPIRY_MINUTES),
          fecha_actualizacion: new Date(),
        },
      });

      await this.mailService.sendVerificationCode(email, verificationCode);

      return {
        cooldownSeconds: 60,
        message: 'Generamos un nuevo codigo de verificacion.',
        ok: true,
      };
    }

    const account = await this.prisma.cuenta_acceso.findUnique({
      where: { correo: email },
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
      throw new UnauthorizedException('Esta operacion no esta permitida para tu cuenta.');
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

  private async findSessionAccountBaseByEmail(
    email: string,
  ): Promise<SessionAccountBase | null> {
    return this.prisma.cuenta_acceso.findUnique({
      where: { correo: email },
      select: {
        id_cuenta: true,
        correo: true,
        password_hash: true,
        tipo_cuenta: true,
        estado: true,
        correo_verificado: true,
        primer_ingreso_pendiente: true,
      },
    });
  }

  private verifyPassword(password: string, passwordHash: string) {
    if (passwordHash.startsWith(PENDING_CREDENTIAL_PASSWORD_HASH_PREFIX)) {
      return Promise.resolve(false);
    }

    return bcrypt.compare(password, passwordHash);
  }

  private async findSessionAccountById(id: number): Promise<SessionAccount | null> {
    const account = await this.prisma.cuenta_acceso.findUnique({
      where: { id_cuenta: id },
      select: {
        id_cuenta: true,
        correo: true,
        password_hash: true,
        tipo_cuenta: true,
        estado: true,
        correo_verificado: true,
        primer_ingreso_pendiente: true,
      },
    });

    return account ? this.hydrateSessionAccount(account) : null;
  }

  private async hydrateSessionAccount(account: SessionAccountBase): Promise<SessionAccount> {
    const baseAccount = {
      ...account,
      cuenta_admin_plataforma: null,
      cuenta_admin_universidad: null,
      cuenta_estudiante: null,
      cuenta_paciente: null,
    } satisfies SessionAccount;

    if (account.tipo_cuenta === tipo_cuenta_enum.ADMIN_PLATAFORMA) {
      return {
        ...baseAccount,
        cuenta_admin_plataforma: await this.prisma.cuenta_admin_plataforma.findUnique({
          where: { id_cuenta: account.id_cuenta },
          select: {
            apellidos: true,
            nombres: true,
          },
        }),
      };
    }

    if (account.tipo_cuenta === tipo_cuenta_enum.ADMIN_UNIVERSIDAD) {
      return {
        ...baseAccount,
        cuenta_admin_universidad: await this.prisma.cuenta_admin_universidad.findUnique({
          where: { id_cuenta: account.id_cuenta },
          select: {
            apellidos: true,
            id_universidad: true,
            nombres: true,
            universidad: {
              select: { estado: true },
            },
          },
        }),
      };
    }

    if (account.tipo_cuenta === tipo_cuenta_enum.ESTUDIANTE) {
      return {
        ...baseAccount,
        cuenta_estudiante: await this.prisma.cuenta_estudiante.findUnique({
          where: { id_cuenta: account.id_cuenta },
          select: {
            persona: { select: { apellidos: true, nombres: true } },
          },
        }),
      };
    }

    return {
      ...baseAccount,
      cuenta_paciente: await this.prisma.cuenta_paciente.findUnique({
        where: { id_cuenta: account.id_cuenta },
        select: {
          persona: { select: { apellidos: true, nombres: true } },
        },
      }),
    };
  }

  private async touchLastLogin(accountId: number) {
    try {
      await this.prisma.cuenta_acceso.update({
        where: { id_cuenta: accountId },
        data: {
          ultimo_login_at: new Date(),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.warn(`No pudimos actualizar ultimo_login_at para ${accountId}: ${message}`);
    }
  }

  private assertSessionAccessAllowed(account: SessionAccount) {
    if (
      account.tipo_cuenta === tipo_cuenta_enum.PACIENTE &&
      account.correo_verificado !== true
    ) {
      throw new UnauthorizedException('Debes verificar tu correo antes de iniciar sesion.');
    }

    if (
      account.tipo_cuenta === tipo_cuenta_enum.ESTUDIANTE &&
      account.estado === estado_simple_enum.INACTIVO
    ) {
      throw new UnauthorizedException(
        'Tu cuenta de estudiante se encuentra inactiva. Contacta al administrador de tu universidad.',
      );
    }

    if (
      account.tipo_cuenta === tipo_cuenta_enum.ADMIN_UNIVERSIDAD &&
      account.cuenta_admin_universidad?.universidad.estado === estado_simple_enum.INACTIVO
    ) {
      throw new UnauthorizedException(
        'Tu institucion se encuentra inactiva. Contacta al administrador de la plataforma.',
      );
    }
  }

  private resolveRequiresPasswordChange(
    account: Pick<SessionAccount, 'primer_ingreso_pendiente' | 'tipo_cuenta'>,
  ) {
    return (
      account.primer_ingreso_pendiente &&
      (account.tipo_cuenta === tipo_cuenta_enum.ADMIN_UNIVERSIDAD ||
        account.tipo_cuenta === tipo_cuenta_enum.ESTUDIANTE)
    );
  }

  private async buildSessionResponse(account: SessionAccount) {
    const user = this.buildRequestUser(account);
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(user, {
        expiresIn: (this.configService.get<string>('auth.jwtExpiresIn') ?? '15m') as never,
        secret: this.configService.get<string>('auth.jwtSecret') ?? 'change_me',
      }),
      this.jwtService.signAsync(
        {
          ...user,
          tokenType: 'refresh',
        } satisfies RefreshTokenPayload,
        {
          expiresIn: (this.configService.get<string>('auth.jwtRefreshExpiresIn') ?? '7d') as never,
          secret: this.configService.get<string>('auth.jwtRefreshSecret') ?? 'change_me_too',
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      requiresPasswordChange: this.resolveRequiresPasswordChange(account),
      user,
    };
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
        firstName: account.cuenta_estudiante?.persona.nombres ?? 'Estudiante',
        id: account.id_cuenta,
        lastName: account.cuenta_estudiante?.persona.apellidos ?? 'Docqee',
        role: 'STUDENT',
      };
    }

    return {
      email: account.correo,
      firstName: account.cuenta_paciente?.persona.nombres ?? 'Paciente',
      id: account.id_cuenta,
      lastName: account.cuenta_paciente?.persona.apellidos ?? 'Docqee',
      role: 'PATIENT',
    };
  }

  private async resolveDocumentType(identifier: string) {
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

  private parsePendingPatientRegistrationPayload(
    payload: Prisma.JsonValue,
  ): PendingPatientRegistrationPayload {
    if (!this.isPlainObject(payload) || !this.isPlainObject(payload.patient)) {
      throw new BadRequestException('El registro pendiente no es valido. Inicia el registro nuevamente.');
    }

    const patient = payload.patient;
    const tutor = this.isPlainObject(payload.tutor) ? payload.tutor : null;

    return {
      patient: {
        birthDate: this.readString(patient.birthDate),
        documentNumber: this.readString(patient.documentNumber),
        documentTypeId: this.readNumber(patient.documentTypeId),
        email: this.readString(patient.email),
        firstName: this.readString(patient.firstName),
        lastName: this.readString(patient.lastName),
        localityId: this.readNumber(patient.localityId),
        passwordHash: this.readString(patient.passwordHash),
        phone: this.readString(patient.phone),
        sex: this.readSex(patient.sex),
      },
      tutor: tutor
        ? {
            documentNumber: this.readString(tutor.documentNumber),
            documentTypeId: this.readNumber(tutor.documentTypeId),
            email: this.readString(tutor.email),
            firstName: this.readString(tutor.firstName),
            lastName: this.readString(tutor.lastName),
            phone: this.readString(tutor.phone),
          }
        : null,
    };
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private readString(value: unknown) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException('El registro pendiente no es valido. Inicia el registro nuevamente.');
    }

    return value;
  }

  private readNumber(value: unknown) {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      throw new BadRequestException('El registro pendiente no es valido. Inicia el registro nuevamente.');
    }

    return value;
  }

  private readSex(value: unknown) {
    if (
      value !== sexo_enum.FEMENINO &&
      value !== sexo_enum.MASCULINO &&
      value !== sexo_enum.OTRO
    ) {
      throw new BadRequestException('El registro pendiente no es valido. Inicia el registro nuevamente.');
    }

    return value;
  }

  private parsePatientBirthDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(
        'La fecha de nacimiento del registro no es valida. Inicia el registro nuevamente.',
      );
    }

    return date;
  }

  private async assertPatientDocumentAvailable(
    documentTypeId: number,
    documentNumber: string,
  ) {
    const existingPerson = await this.prisma.persona.findFirst({
      where: {
        id_tipo_documento: documentTypeId,
        numero_documento: documentNumber,
      },
      select: { id_persona: true },
    });

    if (existingPerson) {
      throw new ConflictException(
        'El numero de documento ya esta registrado en Docqee. Inicia sesion o recupera tu cuenta si ya la tienes.',
      );
    }
  }

  private handlePatientVerificationPersistenceError(error: unknown, email: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'El correo o documento ya esta registrado en Docqee. Inicia sesion o recupera tu cuenta si ya la tienes.',
        );
      }

      if (error.code === 'P2003') {
        throw new BadRequestException(
          'No pudimos validar los datos del registro. Inicia el registro nuevamente.',
        );
      }
    }

    const message = error instanceof Error ? error.message : 'Error desconocido';
    this.logger.error(`No pudimos verificar el registro del paciente ${email}: ${message}`);
    throw error;
  }

  private async deleteUnverifiedPatientAccountIfUnused(email: string) {
    const account = await this.prisma.cuenta_acceso.findUnique({
      where: { correo: email },
      select: {
        correo_verificado: true,
        id_cuenta: true,
        tipo_cuenta: true,
        cuenta_paciente: {
          select: {
            id_persona: true,
          },
        },
      },
    });

    if (
      !account ||
      account.tipo_cuenta !== tipo_cuenta_enum.PACIENTE ||
      account.correo_verificado ||
      !account.cuenta_paciente
    ) {
      return false;
    }

    try {
      await this.prisma.$transaction([
        this.prisma.verificacion_correo.deleteMany({
          where: { id_cuenta_acceso: account.id_cuenta },
        }),
        this.prisma.recuperacion_cuenta.deleteMany({
          where: { id_cuenta_acceso: account.id_cuenta },
        }),
        this.prisma.cuenta_paciente.delete({
          where: { id_cuenta: account.id_cuenta },
        }),
        this.prisma.cuenta_acceso.delete({
          where: { id_cuenta: account.id_cuenta },
        }),
        this.prisma.persona.delete({
          where: { id_persona: account.cuenta_paciente.id_persona },
        }),
      ]);

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.warn(`No pudimos limpiar registro pendiente anterior para ${email}: ${message}`);
      return false;
    }
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
