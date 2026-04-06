import { PatientConversationRepository } from '../../domain/repositories/patient-conversation.repository';

export class PrismaPatientConversationRepository extends PatientConversationRepository {
  sendMessage(): never {
    throw new Error(
      'PrismaPatientConversationRepository.sendMessage is pending implementation.',
    );
  }
}
