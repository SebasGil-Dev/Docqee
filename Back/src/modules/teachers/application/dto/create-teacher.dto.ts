import { IsEnum, IsString } from 'class-validator';

export class CreateTeacherDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEnum(['CC', 'CE', 'TI', 'PASSPORT'])
  documentType!: 'CC' | 'CE' | 'TI' | 'PASSPORT';

  @IsString()
  documentNumber!: string;
}
