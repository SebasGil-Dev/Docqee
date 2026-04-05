import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';

import { ListCitiesUseCase } from '../application/use-cases/list-cities.use-case';
import { ListDocumentTypesUseCase } from '../application/use-cases/list-document-types.use-case';
import { ListLocalitiesByCityUseCase } from '../application/use-cases/list-localities-by-city.use-case';

@Controller('catalogs')
export class CatalogsController {
  constructor(
    private readonly listCitiesUseCase: ListCitiesUseCase,
    private readonly listDocumentTypesUseCase: ListDocumentTypesUseCase,
    private readonly listLocalitiesByCityUseCase: ListLocalitiesByCityUseCase,
  ) {}

  @Get('cities')
  async listCities() {
    return this.listCitiesUseCase.execute();
  }

  @Get('document-types')
  async listDocumentTypes() {
    return this.listDocumentTypesUseCase.execute();
  }

  @Get('localities/:cityId')
  async listLocalitiesByCity(@Param('cityId', ParseIntPipe) cityId: number) {
    return this.listLocalitiesByCityUseCase.execute(cityId);
  }
}
