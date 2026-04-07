import { Controller, Get, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import type { RequestUser } from '@/shared/types/request-user.type';
import { PatientPortalRepository } from '../domain/repositories/patient-portal.repository';

@Controller('patient-portal')
export class PatientPortalController {
  constructor(private readonly patientPortalRepository: PatientPortalRepository) {}

  @UseGuards(JwtAuthGuard)
  @Get('dashboard')
  getDashboard(@CurrentUser() user: RequestUser) {
    return this.patientPortalRepository.getDashboard(user.id);
  }
}
