export class StudentScheduleBlockEntity {
  id!: number;
  accountId!: number;
  type!: 'ESPECIFICO' | 'RECURRENTE';
  specificDate!: Date | null;
  dayOfWeek!: number | null;
  startTime!: string;
  endTime!: string;
  recurrenceStartDate!: Date | null;
  recurrenceEndDate!: Date | null;
  reason!: string | null;
  status!: 'ACTIVE' | 'INACTIVE';
}
