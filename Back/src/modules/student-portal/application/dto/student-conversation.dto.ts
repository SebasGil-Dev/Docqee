import { StudentConversationMessageDto } from './student-conversation-message.dto';

export class StudentConversationDto {
  id!: string;
  requestId!: string;
  patientName!: string;
  patientAge!: number;
  patientCity!: string;
  reason!: string | null;
  status!: 'ACTIVA' | 'SOLO_LECTURA' | 'CERRADA';
  unreadCount!: number;
  messages!: StudentConversationMessageDto[];
}
