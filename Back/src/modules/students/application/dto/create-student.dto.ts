import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateStudentDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEnum(['CC', 'CE', 'TI', 'PASSPORT'])
  documentType!: 'CC' | 'CE' | 'TI' | 'PASSPORT';

  @IsString()
  documentNumber!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsInt()
  @Min(1)
  semester!: number;
}
