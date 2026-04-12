import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import type { RequestUser } from '@/shared/types/request-user.type';
import { CreatePatientRequestDto } from '../application/dto/create-patient-request.dto';
import { PatientPortalService } from '../patient-portal.service';

@Controller('patient-portal')
@UseGuards(JwtAuthGuard)
export class PatientPortalController {
  constructor(private readonly patientPortalService: PatientPortalService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: RequestUser) {
    return this.patientPortalService.getDashboard(user);
  }

  @Post('requests')
  createRequest(@CurrentUser() user: RequestUser, @Body() body: CreatePatientRequestDto) {
    return this.patientPortalService.createRequest(user, body);
  }
}
