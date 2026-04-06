import { PatientConversationMessageDto } from './patient-conversation-message.dto';

export class PatientConversationDto {
  id!: string;
  messages!: PatientConversationMessageDto[];
  reason!: string | null;
  requestId!: string;
  status!: 'ACTIVA' | 'SOLO_LECTURA' | 'CERRADA';
  studentId!: string;
  studentName!: string;
  universityName!: string;
  unreadCount!: number;
}
