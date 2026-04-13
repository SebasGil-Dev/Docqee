import { IsArray, IsString } from 'class-validator';

export class UpdatePracticeSitesDto {
  @IsArray()
  @IsString({ each: true })
  siteIds!: string[];
}
