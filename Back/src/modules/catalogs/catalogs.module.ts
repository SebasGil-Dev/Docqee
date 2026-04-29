import { Module } from '@nestjs/common';

import { ListCitiesUseCase } from './application/use-cases/list-cities.use-case';
import { ListDocumentTypesUseCase } from './application/use-cases/list-document-types.use-case';
import { ListLocalitiesByCityUseCase } from './application/use-cases/list-localities-by-city.use-case';
import { ListRegisterCatalogUseCase } from './application/use-cases/list-register-catalog.use-case';
import { CatalogsController } from './controller/catalogs.controller';

@Module({
  controllers: [CatalogsController],
  providers: [
    ListCitiesUseCase,
    ListDocumentTypesUseCase,
    ListLocalitiesByCityUseCase,
    ListRegisterCatalogUseCase,
  ],
  exports: [
    ListCitiesUseCase,
    ListDocumentTypesUseCase,
    ListLocalitiesByCityUseCase,
    ListRegisterCatalogUseCase,
  ],
})
export class CatalogsModule {}
