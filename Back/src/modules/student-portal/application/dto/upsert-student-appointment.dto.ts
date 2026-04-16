import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertStudentAppointmentDto {
  @IsOptional()
  @IsString()
  additionalInfo?: string | null;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime debe tener formato HH:MM' })
  endTime!: string;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  requestId!: number;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  siteId!: number;

  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime debe tener formato HH:MM' })
  startTime!: string;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  supervisorId!: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'Selecciona al menos un tratamiento.' })
  @IsInt({ each: true })
  @IsPositive({ each: true })
  @Type(() => Number)
  treatmentIds!: number[];
}
