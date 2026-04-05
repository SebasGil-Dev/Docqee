import { Module } from '@nestjs/common';

import { ListCitiesUseCase } from './application/use-cases/list-cities.use-case';
import { ListDocumentTypesUseCase } from './application/use-cases/list-document-types.use-case';
import { ListLocalitiesByCityUseCase } from './application/use-cases/list-localities-by-city.use-case';
import { CatalogsController } from './controller/catalogs.controller';

@Module({
  controllers: [CatalogsController],
  providers: [ListCitiesUseCase, ListDocumentTypesUseCase, ListLocalitiesByCityUseCase],
  exports: [ListCitiesUseCase, ListDocumentTypesUseCase, ListLocalitiesByCityUseCase],
})
export class CatalogsModule {}
