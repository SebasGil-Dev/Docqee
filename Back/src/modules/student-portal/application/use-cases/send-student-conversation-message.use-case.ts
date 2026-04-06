import { StudentConversationMessageDto } from '../dto/student-conversation-message.dto';
import { SendStudentConversationMessageDto } from '../dto/send-student-conversation-message.dto';
import { StudentConversationRepository } from '../../domain/repositories/student-conversation.repository';

export class SendStudentConversationMessageUseCase {
  constructor(
    private readonly conversationRepository: StudentConversationRepository,
  ) {}

  execute(
    studentAccountId: number,
    conversationId: number,
    payload: SendStudentConversationMessageDto,
  ): Promise<StudentConversationMessageDto> {
    return this.conversationRepository.sendMessage(
      studentAccountId,
      conversationId,
      payload,
    );
  }
}
