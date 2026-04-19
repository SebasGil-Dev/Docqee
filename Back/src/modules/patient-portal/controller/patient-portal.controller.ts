import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import type { UploadImageFile } from '@/shared/storage/cloudinary.service';
import type { RequestUser } from '@/shared/types/request-user.type';
import { CreatePatientAppointmentReviewDto } from '../application/dto/create-patient-appointment-review.dto';
import { CreatePatientRequestDto } from '../application/dto/create-patient-request.dto';
import { PatientStudentDirectoryQueryDto } from '../application/dto/patient-student-directory-query.dto';
import { UpdatePatientAppointmentStatusDto } from '../application/dto/update-patient-appointment-status.dto';
import { UpdatePatientProfileDto } from '../application/dto/update-patient-profile.dto';
import { UpdatePatientRequestStatusDto } from '../application/dto/update-patient-request-status.dto';
import { PatientPortalService } from '../patient-portal.service';

@Controller('patient-portal')
@UseGuards(JwtAuthGuard)
export class PatientPortalController {
  constructor(private readonly patientPortalService: PatientPortalService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: RequestUser) {
    return this.patientPortalService.getDashboard(user);
  }

  @Get('students')
  getStudentDirectory(
    @CurrentUser() user: RequestUser,
    @Query() query: PatientStudentDirectoryQueryDto,
  ) {
    return this.patientPortalService.getStudentDirectory(user, query);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: RequestUser, @Body() body: UpdatePatientProfileDto) {
    return this.patientPortalService.updateProfile(user, body);
  }

  @Post('profile/avatar')
  @UseInterceptors(FileInterceptor('avatar', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadProfileAvatar(
    @CurrentUser() user: RequestUser,
    @UploadedFile() avatarFile: UploadImageFile | undefined,
  ) {
    return this.patientPortalService.uploadProfileAvatar(user, avatarFile);
  }

  @Post('requests')
  createRequest(@CurrentUser() user: RequestUser, @Body() body: CreatePatientRequestDto) {
    return this.patientPortalService.createRequest(user, body);
  }

  @Patch('requests/:requestId/status')
  updateRequestStatus(
    @CurrentUser() user: RequestUser,
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body() body: UpdatePatientRequestStatusDto,
  ) {
    return this.patientPortalService.updateRequestStatus(user, requestId, body);
  }

  @Patch('appointments/:appointmentId/status')
  updateAppointmentStatus(
    @CurrentUser() user: RequestUser,
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @Body() body: UpdatePatientAppointmentStatusDto,
  ) {
    return this.patientPortalService.updateAppointmentStatus(user, appointmentId, body);
  }

  @Post('appointments/:appointmentId/review')
  createAppointmentReview(
    @CurrentUser() user: RequestUser,
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @Body() body: CreatePatientAppointmentReviewDto,
  ) {
    return this.patientPortalService.createAppointmentReview(user, appointmentId, body);
  }
}
