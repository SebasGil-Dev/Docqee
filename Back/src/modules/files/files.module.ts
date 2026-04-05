import { Module } from '@nestjs/common';
import { FilesController } from './controller/files.controller';

@Module({
  controllers: [FilesController],
  providers: [],
  exports: [],
})
export class FilesModule {}
