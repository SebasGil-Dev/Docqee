import { PatientPortalDashboardDto } from '../dto/patient-portal-dashboard.dto';
import { PatientPortalRepository } from '../../domain/repositories/patient-portal.repository';

export class GetPatientPortalDashboardUseCase {
  constructor(private readonly repository: PatientPortalRepository) {}

  execute(patientAccountId: number): Promise<PatientPortalDashboardDto> {
    return this.repository.getDashboard(patientAccountId);
  }
}
