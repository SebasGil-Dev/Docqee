import { Module } from '@nestjs/common';
import { BulkUploadController } from './controller/bulk-upload.controller';

@Module({
  controllers: [BulkUploadController],
  providers: [],
  exports: [],
})
export class BulkUploadModule {}
