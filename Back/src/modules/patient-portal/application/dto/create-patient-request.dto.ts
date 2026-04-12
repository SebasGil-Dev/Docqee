import { IsString } from 'class-validator';

export class CreatePatientRequestDto {
  @IsString()
  reason!: string;

  @IsString()
  studentId!: string;
}
