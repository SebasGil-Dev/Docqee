export class StudentConversationMessageDto {
  id!: string;
  author!: 'ESTUDIANTE' | 'PACIENTE';
  authorName!: string;
  content!: string;
  sentAt!: string;
}
