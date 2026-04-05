import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateInstitutionProfileDto {
  @IsString()
  universityName!: string;

  @IsString()
  cityId!: string;

  @IsString()
  mainLocalityId!: string;

  @IsEmail()
  adminEmail!: string;

  @IsOptional()
  @IsString()
  adminPhone?: string;

  @IsOptional()
  @IsString()
  logoSrc?: string | null;
}
