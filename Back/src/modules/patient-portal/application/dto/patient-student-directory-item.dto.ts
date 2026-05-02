export class PatientStudentPracticeSiteDto {
  address!: string | null;
  city!: string;
  locality!: string;
  name!: string;
}

export class PatientStudentDirectoryReviewDto {
  comment!: string | null;
  createdAt!: string;
  id!: string;
  rating!: number;
}

export class PatientStudentProfessionalLinkDto {
  id!: string;
  type!: 'RED_PROFESIONAL' | 'PORTAFOLIO' | 'HOJA_DE_VIDA' | 'OTRO';
  url!: string;
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
  professionalLinks!: PatientStudentProfessionalLinkDto[];
  reviews!: PatientStudentDirectoryReviewDto[];
  reviewsCount!: number;
  semester!: string;
  treatments!: string[];
  universityCity!: string;
  universityLogoAlt!: string;
  universityLogoSrc!: string | null;
  universityLocality!: string;
  universityName!: string;
}
