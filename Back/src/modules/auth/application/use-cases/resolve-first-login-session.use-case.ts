import { Injectable } from '@nestjs/common';

import type { RequestUser } from '@/shared/types/request-user.type';
import { FirstLoginAccountRepository } from '../../domain/repositories/first-login-account.repository';
import { FirstLoginSessionDto } from '../dto/first-login-session.dto';

@Injectable()
export class ResolveFirstLoginSessionUseCase {
  constructor(
    private readonly firstLoginAccountRepository: FirstLoginAccountRepository,
  ) {}

  async execute(user: RequestUser): Promise<FirstLoginSessionDto> {
    const account = await this.firstLoginAccountRepository.findByAccountId(user.id);

    return {
      requiresPasswordChange: this.shouldRequirePasswordChange(
        account?.requiresPasswordChange ?? false,
        user.role,
      ),
      user,
    };
  }

  private shouldRequirePasswordChange(
    requiresPasswordChange: boolean,
    role: RequestUser['role'],
  ) {
    return (
      requiresPasswordChange &&
      (role === 'STUDENT' || role === 'UNIVERSITY_ADMIN')
    );
  }
}
