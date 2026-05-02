import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from "class-validator";

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
  @ValidateIf((_, value) => value !== "")
  @IsString()
  @Matches(/^\d{10}$/, { message: "El celular debe tener 10 digitos." })
  adminPhone?: string;
}
