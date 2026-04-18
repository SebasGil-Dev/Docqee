import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const institutionalPartnershipInterestValues = [
  'VINCULAR_ESTUDIANTES_ODONTOLOGIA',
  'REALIZAR_CONVENIO_INSTITUCIONAL',
  'RECIBIR_MAS_INFORMACION',
  'OTRO',
] as const;

export type InstitutionalPartnershipInterestValue =
  (typeof institutionalPartnershipInterestValues)[number];

export class CreateInstitutionalPartnershipRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la universidad es obligatorio.' })
  @MaxLength(160, {
    message: 'El nombre de la universidad no puede superar los 160 caracteres.',
  })
  universityName!: string;

  @IsString()
  @IsNotEmpty({ message: 'La ciudad es obligatoria.' })
  @MaxLength(100, { message: 'La ciudad no puede superar los 100 caracteres.' })
  city!: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre del contacto es obligatorio.' })
  @MaxLength(160, {
    message: 'El nombre del contacto no puede superar los 160 caracteres.',
  })
  contactName!: string;

  @IsString()
  @IsNotEmpty({ message: 'El cargo del contacto es obligatorio.' })
  @MaxLength(120, { message: 'El cargo no puede superar los 120 caracteres.' })
  contactRole!: string;

  @IsEmail(
    {},
    { message: 'Ingresa un correo institucional valido.' },
  )
  @MaxLength(160, {
    message: 'El correo institucional no puede superar los 160 caracteres.',
  })
  institutionalEmail!: string;

  @IsString()
  @IsNotEmpty({ message: 'El telefono es obligatorio.' })
  @MaxLength(40, { message: 'El telefono no puede superar los 40 caracteres.' })
  phone!: string;

  @IsIn(institutionalPartnershipInterestValues, {
    message: 'Selecciona un tipo de interes valido.',
  })
  interestType!: InstitutionalPartnershipInterestValue;

  @IsOptional()
  @IsString()
  @MaxLength(2000, {
    message: 'El mensaje adicional no puede superar los 2000 caracteres.',
  })
  additionalMessage?: string;

  @IsBoolean({ message: 'Debes autorizar el tratamiento de datos personales.' })
  @Equals(true, { message: 'Debes autorizar el tratamiento de datos personales.' })
  authorizeDataProcessing!: boolean;
}
