export class StudentConversationMessageEntity {
  id!: number;
  conversationId!: number;
  authorAccountId!: number;
  authorRole!: 'ESTUDIANTE' | 'PACIENTE';
  content!: string;
  sentAt!: Date;
}
