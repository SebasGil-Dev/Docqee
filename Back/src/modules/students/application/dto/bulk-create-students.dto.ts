import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsInt, IsString, Matches, Max, Min, ValidateNested } from 'class-validator';

export class BulkStudentRowDto {
  @IsString()
  nombres!: string;

  @IsString()
  apellidos!: string;

  @IsString()
  tipo_documento!: string;

  @IsString()
  @Matches(/^\d+$/, { message: 'El número de documento solo debe contener números.' })
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
