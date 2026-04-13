import { IsArray, IsString } from 'class-validator';

export class UpdateStudentTreatmentsDto {
  @IsArray()
  @IsString({ each: true })
  treatmentTypeIds!: string[];
}
