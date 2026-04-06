export class StudentScheduleBlockDto {
  id!: string;
  type!: 'ESPECIFICO' | 'RECURRENTE';
  specificDate!: string | null;
  dayOfWeek!: number | null;
  startTime!: string;
  endTime!: string;
  recurrenceStartDate!: string | null;
  recurrenceEndDate!: string | null;
  reason!: string | null;
  status!: 'active' | 'inactive';
}
