export class StudentConversationQueryDto {
  search?: string;
  status?: 'ACTIVA' | 'SOLO_LECTURA' | 'CERRADA';
}
