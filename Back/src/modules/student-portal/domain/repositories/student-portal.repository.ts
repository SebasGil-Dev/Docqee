import { StudentPortalDashboardDto } from '../../application/dto/student-portal-dashboard.dto';
import { StudentProfileDto } from '../../application/dto/student-profile.dto';
import { StudentRequestDto } from '../../application/dto/student-request.dto';
import { StudentScheduleBlockDto } from '../../application/dto/student-schedule-block.dto';
import { UpdateStudentProfileDto } from '../../application/dto/update-student-profile.dto';
import { UpdateStudentRequestStatusDto } from '../../application/dto/update-student-request-status.dto';
import { UpsertStudentScheduleBlockDto } from '../../application/dto/upsert-student-schedule-block.dto';

export abstract class StudentPortalRepository {
  abstract getDashboard(studentAccountId: number): Promise<StudentPortalDashboardDto>;

  abstract updateProfile(
    studentAccountId: number,
    payload: UpdateStudentProfileDto,
  ): Promise<StudentProfileDto>;

  abstract createScheduleBlock(
    studentAccountId: number,
    payload: UpsertStudentScheduleBlockDto,
  ): Promise<StudentScheduleBlockDto>;

  abstract updateScheduleBlock(
    studentAccountId: number,
    blockId: number,
    payload: UpsertStudentScheduleBlockDto,
  ): Promise<StudentScheduleBlockDto>;

  abstract updateRequestStatus(
    studentAccountId: number,
    requestId: number,
    payload: UpdateStudentRequestStatusDto,
  ): Promise<StudentRequestDto>;
}
