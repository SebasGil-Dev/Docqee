import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdatePatientAppointmentStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['PROPUESTA', 'ACEPTADA', 'RECHAZADA', 'CANCELADA', 'FINALIZADA'])
  status!: 'PROPUESTA' | 'ACEPTADA' | 'RECHAZADA' | 'CANCELADA' | 'FINALIZADA';
}
