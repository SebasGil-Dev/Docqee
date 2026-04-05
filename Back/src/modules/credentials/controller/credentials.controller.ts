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
import { EditStudentCredentialEmailDto } from '../application/dto/edit-student-credential-email.dto';
import { CredentialsService } from '../credentials.service';
@Controller('credentials')
@UseGuards(JwtAuthGuard)
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Get('students')
  listStudentCredentials(@CurrentUser() user: RequestUser) {
    return this.credentialsService.listStudentCredentials(user);
  }

  @Patch('students/:credentialId/email')
  editStudentCredentialEmail(
    @CurrentUser() user: RequestUser,
    @Param('credentialId') credentialId: string,
    @Body() body: EditStudentCredentialEmailDto,
  ) {
    return this.credentialsService.editStudentCredentialEmail(user, credentialId, body);
  }

  @Post('students/:credentialId/send')
  sendStudentCredential(
    @CurrentUser() user: RequestUser,
    @Param('credentialId') credentialId: string,
  ) {
    return this.credentialsService.sendStudentCredential(user, credentialId, false);
  }

  @Post('students/:credentialId/resend')
  resendStudentCredential(
    @CurrentUser() user: RequestUser,
    @Param('credentialId') credentialId: string,
  ) {
    return this.credentialsService.sendStudentCredential(user, credentialId, true);
  }

  @Post('students/send-all')
  sendAllStudentCredentials(@CurrentUser() user: RequestUser) {
    return this.credentialsService.sendAllStudentCredentials(user);
  }

  @Delete('students/:credentialId')
  deleteStudentCredential(
    @CurrentUser() user: RequestUser,
    @Param('credentialId') credentialId: string,
  ) {
    return this.credentialsService.deleteStudentCredential(user, credentialId);
  }
}
