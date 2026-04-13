import { Body, Controller, NotFoundException, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import type { RequestUser } from '@/shared/types/request-user.type';
import { PatientPortalService } from '../patient-portal.service';

class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;
}

@Controller('patient-portal/conversations')
@UseGuards(JwtAuthGuard)
export class PatientConversationsController {
  constructor(private readonly patientPortalService: PatientPortalService) {}

  @Post(':id/messages')
  async sendMessage(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) conversationId: number,
    @Body() dto: SendMessageDto,
  ) {
    try {
      return await this.patientPortalService.sendConversationMessage(user, conversationId, dto.content);
    } catch {
      throw new NotFoundException('La conversacion no existe, no te pertenece o no esta activa.');
    }
  }
}
