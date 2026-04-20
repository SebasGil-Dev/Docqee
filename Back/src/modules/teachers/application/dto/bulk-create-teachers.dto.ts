import { Type } from 'class-transformer';
import { IsArray, IsString, Matches, ValidateNested } from 'class-validator';

export class BulkTeacherRowDto {
  @IsString()
  nombres!: string;

  @IsString()
  apellidos!: string;

  @IsString()
  tipo_documento!: string;

  @IsString()
  @Matches(/^\d+$/, { message: 'El número de documento solo debe contener números.' })
  numero_documento!: string;
}

export class BulkCreateTeachersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkTeacherRowDto)
  rows!: BulkTeacherRowDto[];
}
