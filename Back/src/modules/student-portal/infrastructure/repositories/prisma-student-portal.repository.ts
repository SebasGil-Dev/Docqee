import { StudentPortalRepository } from '../../domain/repositories/student-portal.repository';

export class PrismaStudentPortalRepository extends StudentPortalRepository {
  getDashboard(): never {
    throw new Error('PrismaStudentPortalRepository.getDashboard is pending implementation.');
  }

  updateProfile(): never {
    throw new Error('PrismaStudentPortalRepository.updateProfile is pending implementation.');
  }

  createScheduleBlock(): never {
    throw new Error('PrismaStudentPortalRepository.createScheduleBlock is pending implementation.');
  }

  updateScheduleBlock(): never {
    throw new Error('PrismaStudentPortalRepository.updateScheduleBlock is pending implementation.');
  }

  updateRequestStatus(): never {
    throw new Error('PrismaStudentPortalRepository.updateRequestStatus is pending implementation.');
  }
}
