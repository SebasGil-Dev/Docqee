import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import type { RequestUser } from '@/shared/types/request-user.type';
import { FirstLoginAccountRepository } from '../../domain/repositories/first-login-account.repository';
import { ChangeFirstLoginPasswordDto } from '../../dto/change-first-login-password.dto';

@Injectable()
export class ChangeFirstLoginPasswordUseCase {
  constructor(
    private readonly firstLoginAccountRepository: FirstLoginAccountRepository,
  ) {}

  async execute(user: RequestUser, input: ChangeFirstLoginPasswordDto) {
    const account = await this.firstLoginAccountRepository.findByAccountId(user.id);

    if (!account) {
      throw new NotFoundException('No encontramos la cuenta para completar el primer ingreso.');
    }

    if (!this.supportsFirstLoginPasswordChange(account.role)) {
      throw new UnauthorizedException(
        'Este flujo de primer ingreso solo aplica para administradores de universidad y estudiantes.',
      );
    }

    if (!account.requiresPasswordChange) {
      throw new ConflictException(
        'La cuenta ya completo el cambio obligatorio de contrasena.',
      );
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    await this.firstLoginAccountRepository.updatePasswordHash(
      account.accountId,
      passwordHash,
    );
    await this.firstLoginAccountRepository.markFirstLoginCompleted(
      account.accountId,
    );

    return { ok: true };
  }

  private supportsFirstLoginPasswordChange(role: RequestUser['role']) {
    return role === 'STUDENT' || role === 'UNIVERSITY_ADMIN';
  }
}
