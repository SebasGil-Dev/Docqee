export class PatientAppointmentDto {
  additionalInfo!: string | null;
  appointmentType!: string;
  city!: string;
  createdAt!: string;
  endAt!: string;
  id!: string;
  isRescheduleProposal!: boolean;
  myRating!: number | null;
  respondedAt!: string | null;
  siteAddress!: string | null;
  siteName!: string;
  startAt!: string;
  status!: 'PROPUESTA' | 'ACEPTADA' | 'RECHAZADA' | 'CANCELADA' | 'FINALIZADA';
  studentName!: string;
  teacherName!: string;
  universityName!: string;
}
