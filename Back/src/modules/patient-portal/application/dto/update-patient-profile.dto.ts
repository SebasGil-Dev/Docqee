import { IsOptional, IsString, Matches } from "class-validator";

export class UpdatePatientProfileDto {
  @IsOptional()
  @IsString()
  avatarFileName!: string | null;

  @IsOptional()
  @IsString()
  avatarSrc!: string | null;

  @IsOptional()
  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  locality!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: "El celular debe tener 10 digitos." })
  phone!: string;
}
