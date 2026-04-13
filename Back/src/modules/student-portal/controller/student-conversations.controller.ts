import { Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import type { RequestUser } from '@/shared/types/request-user.type';
import { StudentPortalService } from '../student-portal.service';

class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;
}

@Controller('student-portal/conversations')
@UseGuards(JwtAuthGuard)
export class StudentConversationsController {
  constructor(private readonly studentPortalService: StudentPortalService) {}

  @Get()
  getConversations(@CurrentUser() user: RequestUser) {
    return this.studentPortalService.getConversations(user);
  }

  @Get(':id')
  async getConversation(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) conversationId: number,
  ) {
    const conversation = await this.studentPortalService.getConversation(user, conversationId);
    if (!conversation) {
      throw new NotFoundException('La conversacion no existe o no te pertenece.');
    }
    return conversation;
  }

  @Post(':id/messages')
  async sendMessage(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) conversationId: number,
    @Body() dto: SendMessageDto,
  ) {
    try {
      return await this.studentPortalService.sendConversationMessage(user, conversationId, dto.content);
    } catch {
      throw new NotFoundException('La conversacion no existe, no te pertenece o no esta activa.');
    }
  }
}
