import { Module } from '@nestjs/common';
import { CredentialsController } from './controller/credentials.controller';
import { CredentialsService } from './credentials.service';

@Module({
  controllers: [CredentialsController],
  providers: [CredentialsService],
  exports: [CredentialsService],
})
export class CredentialsModule {}
