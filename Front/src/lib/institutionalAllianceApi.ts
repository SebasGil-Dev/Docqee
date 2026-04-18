import type { InstitutionalAllianceInterestValue } from '@/content/types';
import { IS_TEST_MODE, apiRequest } from '@/lib/apiClient';

export type InstitutionalAllianceRequestInput = {
  additionalMessage?: string;
  authorizeDataProcessing: boolean;
  city: string;
  contactName: string;
  contactRole: string;
  institutionalEmail: string;
  interestType: InstitutionalAllianceInterestValue;
  phone: string;
  universityName: string;
};

type InstitutionalAllianceRequestResponse = {
  message: string;
};

export async function submitInstitutionalAllianceRequest(
  input: InstitutionalAllianceRequestInput,
) {
  if (IS_TEST_MODE) {
    return {
      message:
        'Recibimos tu solicitud de vinculación. Nuestro equipo se pondrá en contacto contigo pronto.',
    } satisfies InstitutionalAllianceRequestResponse;
  }

  return apiRequest<InstitutionalAllianceRequestResponse>('/api/solicitudes-vinculacion', {
    body: input,
    method: 'POST',
    skipAuth: true,
    skipRefresh: true,
  });
}
