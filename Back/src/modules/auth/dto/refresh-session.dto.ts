import { IsString, MinLength } from 'class-validator';

export class RefreshSessionDto {
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
