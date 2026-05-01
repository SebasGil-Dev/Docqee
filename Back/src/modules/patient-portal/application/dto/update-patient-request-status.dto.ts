import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdatePatientRequestStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['CERRADA', 'CANCELADA'])
  status!: 'CERRADA' | 'CANCELADA';
}
