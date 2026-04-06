export class PatientRequestEntity {
  appointmentsCount!: number;
  conversationId!: string | null;
  id!: string;
  reason!: string | null;
  responseAt!: string | null;
  sentAt!: string;
  status!: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'CERRADA' | 'CANCELADA';
  studentId!: string;
  studentName!: string;
  universityName!: string;
}
