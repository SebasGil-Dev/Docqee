import { Type } from "class-transformer";
import {
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
} from "class-validator";

export class UpdateCampusDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsString()
  address!: string;

  @IsString()
  cityId!: string;

  @IsString()
  localityId!: string;

  @IsIn(["active", "inactive"])
  status!: "active" | "inactive";
}

export class UpdateInstitutionProfileDto {
  @IsString()
  universityName!: string;

  @IsString()
  cityId!: string;

  @IsString()
  mainLocalityId!: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  adminFirstName!: string;

  @IsString()
  adminLastName!: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== "")
  @IsString()
  @Matches(/^\d{10}$/, { message: "El celular debe tener 10 digitos." })
  adminPhone?: string;

  @IsOptional()
  @IsString()
  logoSrc?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateCampusDto)
  campuses?: UpdateCampusDto[];
}
