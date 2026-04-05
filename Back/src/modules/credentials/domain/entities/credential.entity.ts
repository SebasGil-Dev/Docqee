export class CredentialEntity {
  id!: string;
  studentId!: string;
  email!: string;
  status!: 'GENERATED' | 'SENT';
  lastSentAt?: Date;
}
