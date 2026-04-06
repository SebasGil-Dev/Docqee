import { PatientPortalRepository } from '../../domain/repositories/patient-portal.repository';

export class PrismaPatientPortalRepository extends PatientPortalRepository {
  getDashboard(): never {
    throw new Error('PrismaPatientPortalRepository.getDashboard is pending implementation.');
  }

  updateProfile(): never {
    throw new Error('PrismaPatientPortalRepository.updateProfile is pending implementation.');
  }

  createRequest(): never {
    throw new Error('PrismaPatientPortalRepository.createRequest is pending implementation.');
  }

  updateRequestStatus(): never {
    throw new Error('PrismaPatientPortalRepository.updateRequestStatus is pending implementation.');
  }

  updateAppointmentStatus(): never {
    throw new Error(
      'PrismaPatientPortalRepository.updateAppointmentStatus is pending implementation.',
    );
  }
}
