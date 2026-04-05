import { IsEnum, IsString } from 'class-validator';

export class ProcessBulkUploadDto {
  @IsEnum(['STUDENT', 'TEACHER'])
  entityType!: 'STUDENT' | 'TEACHER';

  @IsString()
  fileName!: string;
}
