import { SendStudentConversationMessageDto } from '../../application/dto/send-student-conversation-message.dto';
import { StudentConversationDto } from '../../application/dto/student-conversation.dto';
import { StudentConversationMessageDto } from '../../application/dto/student-conversation-message.dto';

export abstract class StudentConversationRepository {
  abstract getConversations(studentAccountId: number): Promise<StudentConversationDto[]>;

  abstract sendMessage(
    studentAccountId: number,
    conversationId: number,
    payload: SendStudentConversationMessageDto,
  ): Promise<StudentConversationMessageDto>;
}
