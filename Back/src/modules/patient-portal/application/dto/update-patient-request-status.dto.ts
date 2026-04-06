export class UpdatePatientRequestStatusDto {
  status!: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'CERRADA' | 'CANCELADA';
}
