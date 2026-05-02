import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

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
  @Matches(/^\d+$/, {
    message: "El número de documento solo debe contener números.",
  })
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
  @Matches(/^\d{10}$/, { message: "El celular debe tener 10 digitos." })
  phone!: string;

  @IsEnum(["FEMENINO", "MASCULINO", "OTRO"])
  sex!: "FEMENINO" | "MASCULINO" | "OTRO";
}

class TutorPayloadDto {
  @IsString()
  @Matches(/^\d+$/, {
    message: "El número de documento del tutor solo debe contener números.",
  })
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
  @Matches(/^\d{10}$/, {
    message: "El celular del tutor debe tener 10 digitos.",
  })
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
