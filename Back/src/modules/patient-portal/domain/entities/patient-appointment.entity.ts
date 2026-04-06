export class PatientAppointmentEntity {
  additionalInfo!: string | null;
  appointmentType!: string;
  city!: string;
  endAt!: string;
  id!: string;
  siteName!: string;
  startAt!: string;
  status!: 'PROPUESTA' | 'ACEPTADA' | 'RECHAZADA' | 'CANCELADA' | 'FINALIZADA';
  studentName!: string;
  teacherName!: string;
  universityName!: string;
}
