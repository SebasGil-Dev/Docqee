export class PatientConversationEntity {
  id!: string;
  reason!: string | null;
  requestId!: string;
  status!: 'ACTIVA' | 'SOLO_LECTURA' | 'CERRADA';
  studentId!: string;
  studentName!: string;
  universityName!: string;
  unreadCount!: number;
}
