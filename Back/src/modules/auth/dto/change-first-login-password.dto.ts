import { IsString, Matches, MinLength } from 'class-validator';

export class ChangeFirstLoginPasswordDto {
  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'La contrasena debe incluir al menos una letra mayuscula.' })
  @Matches(/[a-z]/, { message: 'La contrasena debe incluir al menos una letra minuscula.' })
  @Matches(/\d/, { message: 'La contrasena debe incluir al menos un numero.' })
  @Matches(/[^A-Za-z0-9]/, {
    message: 'La contrasena debe incluir al menos un caracter especial.',
  })
  password!: string;
}
