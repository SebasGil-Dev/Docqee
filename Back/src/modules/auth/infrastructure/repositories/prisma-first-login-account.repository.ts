import { Injectable } from '@nestjs/common';
import { tipo_cuenta_enum } from '@prisma/client';

import { PrismaService } from '@/shared/database/prisma.service';
import { FirstLoginAccountEntity } from '../../domain/entities/first-login-account.entity';
import { FirstLoginAccountRepository } from '../../domain/repositories/first-login-account.repository';

@Injectable()
export class PrismaFirstLoginAccountRepository
  implements FirstLoginAccountRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findByAccountId(
    accountId: number,
  ): Promise<FirstLoginAccountEntity | null> {
    const account = await this.prisma.cuenta_acceso.findUnique({
      where: { id_cuenta: accountId },
      select: {
        id_cuenta: true,
        correo: true,
        password_hash: true,
        primer_ingreso_pendiente: true,
        tipo_cuenta: true,
      },
    });

    if (!account) {
      return null;
    }

    return {
      accountId: account.id_cuenta,
      email: account.correo,
      passwordHash: account.password_hash,
      requiresPasswordChange: account.primer_ingreso_pendiente,
      role: this.mapRole(account.tipo_cuenta),
    };
  }

  async markFirstLoginCompleted(accountId: number): Promise<void> {
    await this.prisma.cuenta_acceso.update({
      where: { id_cuenta: accountId },
      data: {
        primer_ingreso_pendiente: false,
      },
    });
  }

  async updatePasswordHash(
    accountId: number,
    passwordHash: string,
  ): Promise<void> {
    await this.prisma.cuenta_acceso.update({
      where: { id_cuenta: accountId },
      data: {
        password_hash: passwordHash,
      },
    });
  }

  private mapRole(
    accountType: tipo_cuenta_enum,
  ): FirstLoginAccountEntity['role'] {
    switch (accountType) {
      case tipo_cuenta_enum.ADMIN_PLATAFORMA:
        return 'PLATFORM_ADMIN';
      case tipo_cuenta_enum.ADMIN_UNIVERSIDAD:
        return 'UNIVERSITY_ADMIN';
      case tipo_cuenta_enum.ESTUDIANTE:
        return 'STUDENT';
      default:
        return 'PATIENT';
    }
  }
}
