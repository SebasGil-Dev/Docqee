export class StudentRequestDto {
  id!: string;
  patientName!: string;
  patientAge!: number;
  patientCity!: string;
  reason!: string | null;
  status!: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'CERRADA' | 'CANCELADA';
  sentAt!: string;
  responseAt!: string | null;
  conversationEnabled!: boolean;
  appointmentsCount!: number;
}
