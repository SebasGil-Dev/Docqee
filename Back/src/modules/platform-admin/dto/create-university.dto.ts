import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateUniversityDto {
  @IsString()
  name!: string;

  @IsString()
  cityId!: string;

  @IsString()
  mainLocalityId!: string;

  @IsString()
  adminFirstName!: string;

  @IsString()
  adminLastName!: string;

  @IsEmail()
  adminEmail!: string;

  @IsOptional()
  @IsString()
  adminPhone?: string;
}
