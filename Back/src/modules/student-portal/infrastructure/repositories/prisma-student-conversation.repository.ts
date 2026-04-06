import { StudentConversationRepository } from '../../domain/repositories/student-conversation.repository';

export class PrismaStudentConversationRepository extends StudentConversationRepository {
  getConversations(): never {
    throw new Error(
      'PrismaStudentConversationRepository.getConversations is pending implementation.',
    );
  }

  sendMessage(): never {
    throw new Error(
      'PrismaStudentConversationRepository.sendMessage is pending implementation.',
    );
  }
}
