import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';

const STUDENT_PROFILE_LINK_TYPES = [
  'RED_PROFESIONAL',
  'PORTAFOLIO',
  'HOJA_DE_VIDA',
  'OTRO',
] as const;

export class UpdateStudentProfileLinkDto {
  @IsString()
  id!: string;

  @IsIn(STUDENT_PROFILE_LINK_TYPES)
  type!: (typeof STUDENT_PROFILE_LINK_TYPES)[number];

  @IsString()
  url!: string;
}

export class UpdateStudentProfileDto {
  @IsOptional()
  @IsString()
  avatarFileName!: string | null;

  @IsOptional()
  @IsString()
  avatarSrc!: string | null;

  @IsString()
  availabilityGeneral!: string;

  @IsString()
  biography!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateStudentProfileLinkDto)
  links!: UpdateStudentProfileLinkDto[];
}
