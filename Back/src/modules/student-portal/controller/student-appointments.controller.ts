import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import type { RequestUser } from '@/shared/types/request-user.type';
import { UpsertStudentAppointmentDto } from '../application/dto/upsert-student-appointment.dto';
import { StudentPortalService } from '../student-portal.service';

class UpdateAppointmentStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['PROPUESTA', 'ACEPTADA', 'CANCELADA', 'FINALIZADA'])
  status!: string;
}

@Controller('student-portal/appointments')
@UseGuards(JwtAuthGuard)
export class StudentAppointmentsController {
  constructor(private readonly studentPortalService: StudentPortalService) {}

  @Post()
  createAppointment(
    @CurrentUser() user: RequestUser,
    @Body() body: UpsertStudentAppointmentDto,
  ) {
    return this.studentPortalService.createAppointment(user, body);
  }

  @Patch(':appointmentId')
  updateAppointment(
    @CurrentUser() user: RequestUser,
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @Body() body: UpsertStudentAppointmentDto,
  ) {
    return this.studentPortalService.updateAppointment(user, appointmentId, body);
  }

  @Patch(':appointmentId/status')
  updateAppointmentStatus(
    @CurrentUser() user: RequestUser,
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @Body() body: UpdateAppointmentStatusDto,
  ) {
    return this.studentPortalService.updateAppointmentStatus(user, appointmentId, body.status);
  }
}
