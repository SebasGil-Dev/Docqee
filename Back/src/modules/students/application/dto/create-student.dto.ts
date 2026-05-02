import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from "class-validator";

export class CreateStudentDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEnum(["CC", "CE", "TI", "PASSPORT"])
  documentType!: "CC" | "CE" | "TI" | "PASSPORT";

  @IsString()
  @Matches(/^\d+$/, {
    message: "El número de documento solo debe contener números.",
  })
  documentNumber!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: "El celular debe tener 10 digitos." })
  phone?: string;

  @IsInt()
  @Min(1)
  semester!: number;
}
