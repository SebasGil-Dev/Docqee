import { IsIn } from 'class-validator';

export class UpdateStudentRequestStatusDto {
  @IsIn(['ACEPTADA', 'RECHAZADA', 'CERRADA'])
  status!: 'ACEPTADA' | 'RECHAZADA' | 'CERRADA';
}
