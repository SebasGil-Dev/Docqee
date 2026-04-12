export class PatientStudentDirectoryItemDto {
  avatarAlt!: string;
  avatarSrc!: string | null;
  availabilityGeneral!: string;
  availabilityStatus!: 'available' | 'limited';
  biography!: string;
  city!: string;
  firstName!: string;
  id!: string;
  lastName!: string;
  locality!: string;
  practiceSite!: string;
  semester!: string;
  treatments!: string[];
  universityName!: string;
}
