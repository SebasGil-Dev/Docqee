import { PatientConversationMessageDto } from '../../application/dto/patient-conversation-message.dto';
import { SendPatientConversationMessageDto } from '../../application/dto/send-patient-conversation-message.dto';

export abstract class PatientConversationRepository {
  abstract sendMessage(
    patientAccountId: number,
    conversationId: number,
    payload: SendPatientConversationMessageDto,
  ): Promise<PatientConversationMessageDto>;
}
