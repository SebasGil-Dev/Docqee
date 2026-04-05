import { IsEmail } from 'class-validator';

export class EditStudentCredentialEmailDto {
  @IsEmail()
  email!: string;
}
