import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import type { RequestUser } from '@/shared/types/request-user.type';
import { CreateUniversityDto } from '../dto/create-university.dto';
import { PlatformAdminService } from '../platform-admin.service';
@Controller('platform-admin')
@UseGuards(JwtAuthGuard)
export class PlatformAdminController {
  constructor(private readonly platformAdminService: PlatformAdminService) {}

  @Get('overview')
  getOverview(@CurrentUser() user: RequestUser) {
    return this.platformAdminService.getOverview(user);
  }

  @Get('universities')
  listUniversities(@CurrentUser() user: RequestUser) {
    return this.platformAdminService.listUniversities(user);
  }

  @Post('universities')
  createUniversity(@CurrentUser() user: RequestUser, @Body() body: CreateUniversityDto) {
    return this.platformAdminService.createUniversity(user, body);
  }

  @Patch('universities/:universityId/status')
  toggleUniversityStatus(
    @CurrentUser() user: RequestUser,
    @Param('universityId') universityId: string,
  ) {
    return this.platformAdminService.toggleUniversityStatus(user, universityId);
  }

  @Get('credentials')
  listPendingCredentials(@CurrentUser() user: RequestUser) {
    return this.platformAdminService.listPendingCredentials(user);
  }

  @Post('credentials/:credentialId/send')
  sendCredential(@CurrentUser() user: RequestUser, @Param('credentialId') credentialId: string) {
    return this.platformAdminService.sendCredential(user, credentialId, false);
  }

  @Post('credentials/:credentialId/resend')
  resendCredential(
    @CurrentUser() user: RequestUser,
    @Param('credentialId') credentialId: string,
  ) {
    return this.platformAdminService.sendCredential(user, credentialId, true);
  }

  @Delete('credentials/:credentialId')
  deleteCredential(@CurrentUser() user: RequestUser, @Param('credentialId') credentialId: string) {
    return this.platformAdminService.deleteCredential(user, credentialId);
  }
}
