import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import type { RequestUser } from '@/shared/types/request-user.type';
import { BulkCreateTeachersDto } from '../application/dto/bulk-create-teachers.dto';
import { CreateTeacherDto } from '../application/dto/create-teacher.dto';
import { TeachersService } from '../teachers.service';
@Controller('teachers')
@UseGuards(JwtAuthGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  listTeachers(@CurrentUser() user: RequestUser) {
    return this.teachersService.listTeachers(user);
  }

  @Post()
  createTeacher(@CurrentUser() user: RequestUser, @Body() body: CreateTeacherDto) {
    return this.teachersService.createTeacher(user, body);
  }

  @Post('bulk')
  bulkCreateTeachers(@CurrentUser() user: RequestUser, @Body() body: BulkCreateTeachersDto) {
    return this.teachersService.bulkCreateTeachers(user, body);
  }

  @Patch(':teacherId/status')
  toggleTeacherStatus(@CurrentUser() user: RequestUser, @Param('teacherId') teacherId: string) {
    return this.teachersService.toggleTeacherStatus(user, teacherId);
  }
}
