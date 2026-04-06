import type { RequestUser } from '@/shared/types/request-user.type';

export class FirstLoginSessionDto {
  requiresPasswordChange!: boolean;
  user!: RequestUser;
}
