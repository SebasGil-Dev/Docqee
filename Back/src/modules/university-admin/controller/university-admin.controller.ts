import {
  Body,
  Controller,
  Get,
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

  @Post('profile/logo')
  @UseInterceptors(
    FileInterceptor('logo', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadProfileLogo(
    @CurrentUser() user: RequestUser,
    @UploadedFile() logoFile: UploadImageFile | undefined,
  ) {
    return this.universityAdminService.uploadProfileLogo(user, logoFile);
  }

  @Patch('password')
  changePassword(@CurrentUser() user: RequestUser, @Body() body: ChangePasswordDto) {
    return this.universityAdminService.changePassword(user, body);
  }
}
