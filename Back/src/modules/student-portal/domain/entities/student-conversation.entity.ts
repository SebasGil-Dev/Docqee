import { StudentConversationMessageEntity } from './student-conversation-message.entity';

export class StudentConversationEntity {
  id!: number;
  requestId!: number;
  studentAccountId!: number;
  patientAccountId!: number;
  patientName!: string;
  patientAge!: number;
  patientCity!: string;
  reason!: string | null;
  status!: 'ACTIVA' | 'SOLO_LECTURA' | 'CERRADA';
  unreadCount!: number;
  messages!: StudentConversationMessageEntity[];
}
