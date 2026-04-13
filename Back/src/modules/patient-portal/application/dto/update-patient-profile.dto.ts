import { IsOptional, IsString } from 'class-validator';

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
  phone!: string;
}
