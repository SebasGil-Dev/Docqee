import type { RequestUser } from '@/shared/types/request-user.type';

export class FirstLoginAccountEntity {
  accountId!: number;
  email!: string;
  passwordHash!: string;
  requiresPasswordChange!: boolean;
  role!: RequestUser['role'];
}
