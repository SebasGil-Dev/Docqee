export class StudentAgendaAppointmentDto {
  additionalInfo!: string | null;
  appointmentType!: string;
  city!: string;
  createdAt!: string;
  endAt!: string;
  id!: string;
  patientName!: string;
  requestId!: string;
  respondedAt!: string | null;
  siteId!: string;
  siteName!: string;
  startAt!: string;
  status!: string;
  supervisorId!: string;
  supervisorName!: string;
  treatmentIds!: string[];
  treatmentNames!: string[];
}
