import { Controller, Get, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import type { RequestUser } from '@/shared/types/request-user.type';
import { StudentPortalRepository } from '../domain/repositories/student-portal.repository';

@Controller('student-portal')
export class StudentPortalController {
  constructor(private readonly studentPortalRepository: StudentPortalRepository) {}

  @UseGuards(JwtAuthGuard)
  @Get('dashboard')
  getDashboard(@CurrentUser() user: RequestUser) {
    return this.studentPortalRepository.getDashboard(user.id);
  }
}
