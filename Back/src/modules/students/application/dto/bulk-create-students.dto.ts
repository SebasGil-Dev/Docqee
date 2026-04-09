import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsInt, IsString, Max, Min, ValidateNested } from 'class-validator';

export class BulkStudentRowDto {
  @IsString()
  nombres!: string;

  @IsString()
  apellidos!: string;

  @IsString()
  tipo_documento!: string;

  @IsString()
  numero_documento!: string;

  @IsEmail()
  correo!: string;

  @IsString()
  celular!: string;

  @IsInt()
  @Min(1)
  @Max(10)
  semestre!: number;
}

export class BulkCreateStudentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkStudentRowDto)
  rows!: BulkStudentRowDto[];
}
