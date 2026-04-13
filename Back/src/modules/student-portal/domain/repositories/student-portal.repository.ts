import { StudentPortalDashboardDto } from '../../application/dto/student-portal-dashboard.dto';
import { StudentPracticeSiteDto } from '../../application/dto/student-practice-site.dto';
import { StudentProfileDto } from '../../application/dto/student-profile.dto';
import { StudentRequestDto } from '../../application/dto/student-request.dto';
import { StudentScheduleBlockDto } from '../../application/dto/student-schedule-block.dto';
import { StudentTreatmentDto } from '../../application/dto/student-treatment.dto';
import { StudentTreatmentTypeDto } from '../../application/dto/student-treatment-type.dto';
import { UpdateStudentProfileDto } from '../../application/dto/update-student-profile.dto';
import { UpdateStudentRequestStatusDto } from '../../application/dto/update-student-request-status.dto';
import { UpsertStudentScheduleBlockDto } from '../../application/dto/upsert-student-schedule-block.dto';

export abstract class StudentPortalRepository {
  abstract getDashboard(studentAccountId: number): Promise<StudentPortalDashboardDto>;

  abstract getUniversitySites(studentAccountId: number): Promise<StudentPracticeSiteDto[]>;

  abstract updatePracticeSites(
    studentAccountId: number,
    siteIds: number[],
  ): Promise<StudentPracticeSiteDto[]>;

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

  abstract getTreatmentTypes(): Promise<StudentTreatmentTypeDto[]>;

  abstract updateTreatments(
    studentAccountId: number,
    treatmentTypeIds: number[],
  ): Promise<StudentTreatmentDto[]>;

  abstract updateRequestStatus(
    studentAccountId: number,
    requestId: number,
    payload: UpdateStudentRequestStatusDto,
  ): Promise<StudentRequestDto>;
}
