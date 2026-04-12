import { Injectable } from '@nestjs/common';

import type { RequestUser } from '@/shared/types/request-user.type';
import { CreatePatientRequestDto } from './application/dto/create-patient-request.dto';
import { PatientPortalRepository } from './domain/repositories/patient-portal.repository';

@Injectable()
export class PatientPortalService {
  constructor(private readonly patientPortalRepository: PatientPortalRepository) {}

  getDashboard(user: RequestUser) {
    return this.patientPortalRepository.getDashboard(user.id);
  }

  createRequest(user: RequestUser, payload: CreatePatientRequestDto) {
    return this.patientPortalRepository.createRequest(user.id, payload);
  }
}
