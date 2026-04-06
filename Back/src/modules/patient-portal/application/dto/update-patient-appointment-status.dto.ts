export class UpdatePatientAppointmentStatusDto {
  status!: 'PROPUESTA' | 'ACEPTADA' | 'RECHAZADA' | 'CANCELADA' | 'FINALIZADA';
}
