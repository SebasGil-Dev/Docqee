import { FirstLoginAccountEntity } from '../entities/first-login-account.entity';

export abstract class FirstLoginAccountRepository {
  abstract findByAccountId(accountId: number): Promise<FirstLoginAccountEntity | null>;
  abstract markFirstLoginCompleted(accountId: number): Promise<void>;
  abstract updatePasswordHash(accountId: number, passwordHash: string): Promise<void>;
}
