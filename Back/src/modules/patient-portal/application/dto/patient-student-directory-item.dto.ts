export class PatientStudentPracticeSiteDto {
  city!: string;
  locality!: string;
  name!: string;
}

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
  practiceSites!: PatientStudentPracticeSiteDto[];
  reviewsCount!: number;
  semester!: string;
  treatments!: string[];
  universityCity!: string;
  universityLocality!: string;
  universityName!: string;
}
