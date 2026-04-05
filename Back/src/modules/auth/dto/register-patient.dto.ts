import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PatientConsentsDto {
  @IsBoolean()
  acceptPrivacyPolicy!: boolean;

  @IsBoolean()
  acceptTerms!: boolean;
}

class PatientPayloadDto {
  @IsDateString()
  birthDate!: string;

  @IsString()
  cityId!: string;

  @IsString()
  documentNumber!: string;

  @IsString()
  documentTypeCode!: string;

  @IsEmail()
  email!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  localityId!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  phone!: string;

  @IsEnum(['FEMENINO', 'MASCULINO', 'OTRO'])
  sex!: 'FEMENINO' | 'MASCULINO' | 'OTRO';
}

class TutorPayloadDto {
  @IsString()
  documentNumber!: string;

  @IsString()
  documentTypeCode!: string;

  @IsEmail()
  email!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  phone!: string;
}

export class RegisterPatientDto {
  @ValidateNested()
  @Type(() => PatientConsentsDto)
  consents!: PatientConsentsDto;

  @ValidateNested()
  @Type(() => PatientPayloadDto)
  patient!: PatientPayloadDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TutorPayloadDto)
  tutor?: TutorPayloadDto | null;
}
