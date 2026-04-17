import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import type { RequestUser } from '@/shared/types/request-user.type';
import { UpsertStudentScheduleBlockDto } from '../application/dto/upsert-student-schedule-block.dto';
import { StudentPortalService } from '../student-portal.service';

@Controller('student-portal/schedule-blocks')
@UseGuards(JwtAuthGuard)
export class StudentScheduleBlocksController {
  constructor(private readonly studentPortalService: StudentPortalService) {}

  @Post()
  createScheduleBlock(
    @CurrentUser() user: RequestUser,
    @Body() body: UpsertStudentScheduleBlockDto,
  ) {
    return this.studentPortalService.createScheduleBlock(user, body);
  }

  @Patch(':blockId')
  updateScheduleBlock(
    @CurrentUser() user: RequestUser,
    @Param('blockId', ParseIntPipe) blockId: number,
    @Body() body: UpsertStudentScheduleBlockDto,
  ) {
    return this.studentPortalService.updateScheduleBlock(user, blockId, body);
  }

  @Patch(':blockId/status')
  toggleScheduleBlockStatus(
    @CurrentUser() user: RequestUser,
    @Param('blockId', ParseIntPipe) blockId: number,
  ) {
    return this.studentPortalService.toggleScheduleBlockStatus(user, blockId);
  }

  @Delete(':blockId')
  deleteScheduleBlock(
    @CurrentUser() user: RequestUser,
    @Param('blockId', ParseIntPipe) blockId: number,
  ) {
    return this.studentPortalService.deleteScheduleBlock(user, blockId);
  }
}
