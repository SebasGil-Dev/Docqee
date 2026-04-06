export class StudentProfileEntity {
  id!: number;
  accountId!: number;
  firstName!: string;
  lastName!: string;
  email!: string;
  universityName!: string;
  semester!: number;
  biography!: string | null;
  availabilityGeneral!: string | null;
  avatarUrl!: string | null;
}
