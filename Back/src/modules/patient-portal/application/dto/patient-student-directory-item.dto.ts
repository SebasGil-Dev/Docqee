export class PatientStudentDirectoryItemDto {
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
