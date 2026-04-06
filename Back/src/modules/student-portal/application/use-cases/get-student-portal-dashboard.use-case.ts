import { StudentPortalDashboardDto } from '../dto/student-portal-dashboard.dto';
import { StudentPortalRepository } from '../../domain/repositories/student-portal.repository';

export class GetStudentPortalDashboardUseCase {
  constructor(private readonly repository: StudentPortalRepository) {}

  execute(studentAccountId: number): Promise<StudentPortalDashboardDto> {
    return this.repository.getDashboard(studentAccountId);
  }
}
