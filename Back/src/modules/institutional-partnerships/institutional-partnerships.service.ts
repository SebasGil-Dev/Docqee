import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { MailService } from '@/shared/mail/mail.service';
import {
  type CreateInstitutionalPartnershipRequestDto,
  type InstitutionalPartnershipInterestValue,
} from './dto/create-institutional-partnership-request.dto';

const interestTypeLabels: Record<InstitutionalPartnershipInterestValue, string> = {
  OTRO: 'Otro',
  REALIZAR_CONVENIO_INSTITUCIONAL: 'Realizar convenio institucional',
  RECIBIR_MAS_INFORMACION: 'Recibir mas informacion',
  VINCULAR_ESTUDIANTES_ODONTOLOGIA: 'Vincular estudiantes de odontologia',
};

@Injectable()
export class InstitutionalPartnershipsService {
  constructor(private readonly mailService: MailService) {}

  private normalizeField(value: string) {
    return value.trim().replace(/\s+/g, ' ');
  }

  async submitRequest(body: CreateInstitutionalPartnershipRequestDto) {
    const additionalMessage = body.additionalMessage?.trim() || null;

    try {
      await this.mailService.sendInstitutionalPartnershipRequest({
        additionalMessage,
        authorizeDataProcessing: body.authorizeDataProcessing,
        city: this.normalizeField(body.city),
        contactName: this.normalizeField(body.contactName),
        contactRole: this.normalizeField(body.contactRole),
        institutionalEmail: body.institutionalEmail.trim().toLowerCase(),
        interestTypeLabel: interestTypeLabels[body.interestType],
        phone: this.normalizeField(body.phone),
        universityName: this.normalizeField(body.universityName),
      });

      return {
        message:
          'Recibimos tu solicitud de vinculacion. Nuestro equipo se pondra en contacto contigo pronto.',
      };
    } catch {
      throw new InternalServerErrorException(
        'No pudimos enviar tu solicitud de vinculacion en este momento. Intentalo nuevamente.',
      );
    }
  }
}
