import { SendPatientConversationMessageDto } from '../dto/send-patient-conversation-message.dto';
import { PatientConversationMessageDto } from '../dto/patient-conversation-message.dto';
import { PatientConversationRepository } from '../../domain/repositories/patient-conversation.repository';

export class SendPatientConversationMessageUseCase {
  constructor(private readonly repository: PatientConversationRepository) {}

  execute(
    patientAccountId: number,
    conversationId: number,
    payload: SendPatientConversationMessageDto,
  ): Promise<PatientConversationMessageDto> {
    return this.repository.sendMessage(patientAccountId, conversationId, payload);
  }
}
