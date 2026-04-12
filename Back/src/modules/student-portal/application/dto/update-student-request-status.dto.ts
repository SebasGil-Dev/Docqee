import { IsIn } from 'class-validator';

export class UpdateStudentRequestStatusDto {
  @IsIn(['ACEPTADA', 'RECHAZADA'])
  status!: 'ACEPTADA' | 'RECHAZADA';
}
