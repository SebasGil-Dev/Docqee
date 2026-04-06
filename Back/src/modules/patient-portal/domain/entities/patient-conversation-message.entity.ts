export class PatientConversationMessageEntity {
  author!: 'PACIENTE' | 'ESTUDIANTE';
  authorName!: string;
  content!: string;
  id!: string;
  sentAt!: string;
}
