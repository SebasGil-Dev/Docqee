import { Body, Controller, Post } from '@nestjs/common';

import { CreateInstitutionalPartnershipRequestDto } from '../dto/create-institutional-partnership-request.dto';
import { InstitutionalPartnershipsService } from '../institutional-partnerships.service';

@Controller('api/solicitudes-vinculacion')
export class InstitutionalPartnershipsController {
  constructor(
    private readonly institutionalPartnershipsService: InstitutionalPartnershipsService,
  ) {}

  @Post()
  submitRequest(@Body() body: CreateInstitutionalPartnershipRequestDto) {
    return this.institutionalPartnershipsService.submitRequest(body);
  }
}
