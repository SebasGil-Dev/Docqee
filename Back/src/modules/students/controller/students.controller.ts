import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import type { RequestUser } from '@/shared/types/request-user.type';
import { BulkCreateStudentsDto } from '../application/dto/bulk-create-students.dto';
import { CreateStudentDto } from '../application/dto/create-student.dto';
import { StudentsService } from '../students.service';
@Controller('students')
@UseGuards(JwtAuthGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  listStudents(@CurrentUser() user: RequestUser) {
    return this.studentsService.listStudents(user);
  }

  @Post()
  createStudent(@CurrentUser() user: RequestUser, @Body() body: CreateStudentDto) {
    return this.studentsService.createStudent(user, body);
  }

  @Post('bulk')
  bulkCreateStudents(@CurrentUser() user: RequestUser, @Body() body: BulkCreateStudentsDto) {
    return this.studentsService.bulkCreateStudents(user, body);
  }

  @Patch(':studentId/status')
  toggleStudentStatus(@CurrentUser() user: RequestUser, @Param('studentId') studentId: string) {
    return this.studentsService.toggleStudentStatus(user, studentId);
  }
}
