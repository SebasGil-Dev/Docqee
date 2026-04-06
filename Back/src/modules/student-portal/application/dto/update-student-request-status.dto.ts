export class UpdateStudentRequestStatusDto {
  status!: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'CERRADA' | 'CANCELADA';
}
