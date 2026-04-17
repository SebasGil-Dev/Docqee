import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';

export class UpsertStudentScheduleBlockDto {
  @IsIn(['ESPECIFICO', 'RECURRENTE'])
  type!: 'ESPECIFICO' | 'RECURRENTE';

  @ValidateIf((o) => o.type === 'ESPECIFICO')
  @IsDateString()
  @IsNotEmpty()
  specificDate!: string | null;

  @ValidateIf((o) => o.type === 'RECURRENTE')
  @IsString()
  @IsNotEmpty()
  dayOfWeek!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime debe tener formato HH:MM' })
  startTime!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime debe tener formato HH:MM' })
  endTime!: string;

  @ValidateIf((o) => o.type === 'RECURRENTE')
  @IsDateString()
  @IsNotEmpty()
  recurrenceStartDate!: string;

  @ValidateIf((o) => o.type === 'RECURRENTE')
  @IsDateString()
  @IsNotEmpty()
  recurrenceEndDate!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
