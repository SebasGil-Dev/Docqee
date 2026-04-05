import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import type { RequestUser } from '@/shared/types/request-user.type';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { UpdateInstitutionProfileDto } from '../dto/update-institution-profile.dto';
import { UniversityAdminService } from '../university-admin.service';
@Controller('university-admin')
@UseGuards(JwtAuthGuard)
export class UniversityAdminController {
  constructor(private readonly universityAdminService: UniversityAdminService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: RequestUser) {
    return this.universityAdminService.getProfile(user);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: RequestUser, @Body() body: UpdateInstitutionProfileDto) {
    return this.universityAdminService.updateProfile(user, body);
  }

  @Patch('password')
  changePassword(@CurrentUser() user: RequestUser, @Body() body: ChangePasswordDto) {
    return this.universityAdminService.changePassword(user, body);
  }
}
