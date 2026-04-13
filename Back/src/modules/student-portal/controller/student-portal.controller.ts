import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import type { UploadImageFile } from '@/shared/storage/cloudinary.service';
import type { RequestUser } from '@/shared/types/request-user.type';
import { UpdatePracticeSitesDto } from '../application/dto/update-practice-sites.dto';
import { UpdateStudentProfileDto } from '../application/dto/update-student-profile.dto';
import { UpdateStudentRequestStatusDto } from '../application/dto/update-student-request-status.dto';
import { UpdateStudentTreatmentsDto } from '../application/dto/update-student-treatments.dto';
import { StudentPortalService } from '../student-portal.service';

@Controller('student-portal')
@UseGuards(JwtAuthGuard)
export class StudentPortalController {
  constructor(private readonly studentPortalService: StudentPortalService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: RequestUser) {
    return this.studentPortalService.getDashboard(user);
  }

  @Get('university-sites')
  getUniversitySites(@CurrentUser() user: RequestUser) {
    return this.studentPortalService.getUniversitySites(user);
  }

  @Get('treatment-types')
  getTreatmentTypes() {
    return this.studentPortalService.getTreatmentTypes();
  }

  @Patch('treatments')
  updateTreatments(@CurrentUser() user: RequestUser, @Body() body: UpdateStudentTreatmentsDto) {
    return this.studentPortalService.updateTreatments(user, body);
  }

  @Patch('practice-sites')
  updatePracticeSites(@CurrentUser() user: RequestUser, @Body() body: UpdatePracticeSitesDto) {
    return this.studentPortalService.updatePracticeSites(user, body.siteIds);
  }

  @Patch('requests/:requestId/status')
  updateRequestStatus(
    @CurrentUser() user: RequestUser,
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body() body: UpdateStudentRequestStatusDto,
  ) {
    return this.studentPortalService.updateRequestStatus(user, requestId, body);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: RequestUser, @Body() body: UpdateStudentProfileDto) {
    return this.studentPortalService.updateProfile(user, body);
  }

  @Post('profile/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadProfileAvatar(
    @CurrentUser() user: RequestUser,
    @UploadedFile() avatarFile: UploadImageFile | undefined,
  ) {
    return this.studentPortalService.uploadProfileAvatar(user, avatarFile);
  }
}
