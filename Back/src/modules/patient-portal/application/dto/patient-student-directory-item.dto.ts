export class PatientStudentDirectoryItemDto {
  avatarAlt!: string;
  avatarSrc!: string | null;
  availabilityGeneral!: string;
  availabilityStatus!: 'available' | 'limited';
  averageRating!: number | null;
  biography!: string;
  city!: string;
  firstName!: string;
  id!: string;
  lastName!: string;
  locality!: string;
  practiceSite!: string;
  reviewsCount!: number;
  semester!: string;
  treatments!: string[];
  universityName!: string;
}
