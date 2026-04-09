import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';

export class BulkTeacherRowDto {
  @IsString()
  nombres!: string;

  @IsString()
  apellidos!: string;

  @IsString()
  tipo_documento!: string;

  @IsString()
  numero_documento!: string;
}

export class BulkCreateTeachersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkTeacherRowDto)
  rows!: BulkTeacherRowDto[];
}
