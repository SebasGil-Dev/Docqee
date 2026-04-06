export class UpsertStudentScheduleBlockDto {
  type!: 'ESPECIFICO' | 'RECURRENTE';
  specificDate!: string | null;
  dayOfWeek!: string;
  startTime!: string;
  endTime!: string;
  recurrenceStartDate!: string;
  recurrenceEndDate!: string;
  reason!: string;
}
