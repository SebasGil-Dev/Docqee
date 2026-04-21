export class StudentRequestPatientProfileReviewDto {
  authorName!: string;
  comment!: string | null;
  createdAt!: string;
  id!: string;
  rating!: number;
}

export class StudentRequestPatientProfileDto {
  avatarAlt!: string;
  avatarSrc!: string | null;
  averageRating!: number | null;
  phone!: string | null;
  reviews!: StudentRequestPatientProfileReviewDto[];
}

export class StudentRequestDto {
  id!: string;
  patientName!: string;
  patientAge!: number;
  patientCity!: string;
  patientLocality!: string | null;
  patientProfile!: StudentRequestPatientProfileDto | null;
  reason!: string | null;
  status!: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'CERRADA' | 'CANCELADA';
  sentAt!: string;
  responseAt!: string | null;
  conversationId!: string | null;
  conversationEnabled!: boolean;
  appointmentsCount!: number;
}
