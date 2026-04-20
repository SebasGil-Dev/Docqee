import { IsEnum, IsString, Matches } from 'class-validator';

export class CreateTeacherDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEnum(['CC', 'CE', 'TI', 'PASSPORT'])
  documentType!: 'CC' | 'CE' | 'TI' | 'PASSPORT';

  @IsString()
  @Matches(/^\d+$/, { message: 'El número de documento solo debe contener números.' })
  documentNumber!: string;
}
