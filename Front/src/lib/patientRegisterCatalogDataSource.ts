import type {
  CityOption,
  DocumentTypeOption,
  LocalityOption,
  PatientRegisterCatalogDataSource,
} from '@/content/types';

type CatalogApiOption = {
  id: number;
  name: string;
};

function getEnvValue(key: string) {
  const envRecord: unknown = import.meta.env;

  if (typeof envRecord !== 'object' || envRecord === null) {
    return undefined;
  }

  const value = (envRecord as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

const API_BASE_URL = (getEnvValue('VITE_API_URL') ?? 'http://localhost:3000').replace(/\/+$/, '');
const IS_TEST_MODE = getEnvValue('MODE') === 'test';

const fallbackDocumentTypes: DocumentTypeOption[] = [
  {
    code: 'CC',
    id: 'document-cc',
    label: 'Cedula de ciudadania',
  },
  {
    code: 'TI',
    id: 'document-ti',
    label: 'Tarjeta de identidad',
  },
];

const fallbackCities: CityOption[] = [
  {
    id: 'city-bogota',
    label: 'Bogota',
  },
  {
    id: 'city-medellin',
    label: 'Medellin',
  },
  {
    id: 'city-cali',
    label: 'Cali',
  },
  {
    id: 'city-barranquilla',
    label: 'Barranquilla',
  },
  {
    id: 'city-pereira',
    label: 'Pereira',
  },
];

const fallbackLocalities: LocalityOption[] = [
  {
    cityId: 'city-bogota',
    id: 'locality-bogota-suba',
    label: 'Suba',
  },
  {
    cityId: 'city-bogota',
    id: 'locality-bogota-usaquen',
    label: 'Usaquen',
  },
  {
    cityId: 'city-bogota',
    id: 'locality-bogota-kennedy',
    label: 'Kennedy',
  },
  {
    cityId: 'city-medellin',
    id: 'locality-medellin-poblado',
    label: 'El Poblado',
  },
  {
    cityId: 'city-medellin',
    id: 'locality-medellin-laureles',
    label: 'Laureles',
  },
  {
    cityId: 'city-medellin',
    id: 'locality-medellin-belen',
    label: 'Belen',
  },
  {
    cityId: 'city-cali',
    id: 'locality-cali-comuna-2',
    label: 'Comuna 2',
  },
  {
    cityId: 'city-cali',
    id: 'locality-cali-comuna-17',
    label: 'Comuna 17',
  },
  {
    cityId: 'city-cali',
    id: 'locality-cali-comuna-22',
    label: 'Comuna 22',
  },
  {
    cityId: 'city-barranquilla',
    id: 'locality-barranquilla-riomar',
    label: 'Riomar',
  },
  {
    cityId: 'city-barranquilla',
    id: 'locality-barranquilla-norte-centro-historico',
    label: 'Norte-Centro Historico',
  },
  {
    cityId: 'city-barranquilla',
    id: 'locality-barranquilla-metropolitana',
    label: 'Metropolitana',
  },
  {
    cityId: 'city-pereira',
    id: 'locality-pereira-centro',
    label: 'Comuna Centro',
  },
  {
    cityId: 'city-pereira',
    id: 'locality-pereira-cuba',
    label: 'Cuba',
  },
  {
    cityId: 'city-pereira',
    id: 'locality-pereira-poblado',
    label: 'Poblado I',
  },
];

let citiesCache = [...fallbackCities];
let documentTypesCache = [...fallbackDocumentTypes];
const localitiesCache = new Map<string, LocalityOption[]>();
const backendCityIdByFrontendId = new Map<string, number>();
const cityLabelByFrontendId = new Map<string, string>();
let citiesRequestPromise: Promise<CityOption[]> | null = null;
let documentTypesRequestPromise: Promise<DocumentTypeOption[]> | null = null;
let areCitiesLoadedFromApi = false;
let areDocumentTypesLoadedFromApi = false;
const loadedLocalityCityIds = new Set<string>();
const localityRequestPromiseByCityId = new Map<string, Promise<LocalityOption[]>>();

function seedLocalitiesCache() {
  localitiesCache.clear();

  fallbackCities.forEach((city) => {
    localitiesCache.set(
      city.id,
      fallbackLocalities.filter((locality) => locality.cityId === city.id),
    );
  });
}

function refreshCityLabelCache(cities: CityOption[]) {
  cityLabelByFrontendId.clear();
  cities.forEach((city) => {
    cityLabelByFrontendId.set(city.id, city.label);
  });
}

seedLocalitiesCache();
refreshCityLabelCache(citiesCache);

function normalizeText(value: string) {
  return value.trim();
}

function toSlug(value: string) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildCityId(cityName: string) {
  return `city-${toSlug(cityName)}`;
}

function buildLocalityId(cityName: string, localityName: string) {
  return `locality-${toSlug(cityName)}-${toSlug(localityName)}`;
}

function buildDocumentTypeId(documentTypeCode: string) {
  return `document-${toSlug(documentTypeCode)}`;
}

function getFallbackLocalitiesByCity(cityId: string) {
  return fallbackLocalities.filter((locality) => locality.cityId === cityId);
}

function getCachedLocalitiesByCity(cityId: string) {
  return localitiesCache.get(cityId) ?? getFallbackLocalitiesByCity(cityId);
}

function isCatalogApiOption(value: unknown): value is CatalogApiOption {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<CatalogApiOption>;
  return typeof candidate.id === 'number' && typeof candidate.name === 'string';
}

async function fetchCatalogOptions(path: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Catalog request failed with status ${response.status}`);
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error('Catalog response is not an array');
  }

  return data.filter(isCatalogApiOption);
}

function cacheCities(options: CatalogApiOption[]) {
  backendCityIdByFrontendId.clear();

  const nextCities = options.map((option) => {
    const label = normalizeText(option.name);
    const id = buildCityId(label);

    backendCityIdByFrontendId.set(id, option.id);

    return {
      id,
      label,
    } satisfies CityOption;
  });

  citiesCache = nextCities.length > 0 ? nextCities : [...fallbackCities];
  refreshCityLabelCache(citiesCache);
}

function cacheDocumentTypes(options: CatalogApiOption[]) {
  const nextDocumentTypes = options.map((option) => {
    const [codePart, labelPart] = normalizeText(option.name).split('|');
    const code = normalizeText(codePart ?? option.name).toUpperCase();
    const label = normalizeText(labelPart ?? option.name);

    return {
      code,
      id: buildDocumentTypeId(code),
      label,
    } satisfies DocumentTypeOption;
  });

  documentTypesCache = nextDocumentTypes.length > 0 ? nextDocumentTypes : [...fallbackDocumentTypes];
}

function ensureCitiesLoaded() {
  if (areCitiesLoadedFromApi) {
    return Promise.resolve(getCities());
  }

  if (citiesRequestPromise) {
    return citiesRequestPromise;
  }

  citiesRequestPromise = fetchCatalogOptions('/catalogs/cities')
    .then((options) => {
      cacheCities(options);
      areCitiesLoadedFromApi = true;

      return getCities();
    })
    .catch(() => getCities())
    .finally(() => {
      citiesRequestPromise = null;
    });

  return citiesRequestPromise;
}

function ensureDocumentTypesLoaded() {
  if (areDocumentTypesLoadedFromApi) {
    return Promise.resolve(getDocumentTypes());
  }

  if (documentTypesRequestPromise) {
    return documentTypesRequestPromise;
  }

  documentTypesRequestPromise = fetchCatalogOptions('/catalogs/document-types')
    .then((options) => {
      cacheDocumentTypes(options);
      areDocumentTypesLoadedFromApi = true;

      return getDocumentTypes();
    })
    .catch(() => getDocumentTypes())
    .finally(() => {
      documentTypesRequestPromise = null;
    });

  return documentTypesRequestPromise;
}

async function resolveBackendCityId(cityId: string) {
  if (/^\d+$/.test(cityId)) {
    return Number(cityId);
  }

  const cachedCityId = backendCityIdByFrontendId.get(cityId);

  if (typeof cachedCityId === 'number') {
    return cachedCityId;
  }

  await loadCities();
  return backendCityIdByFrontendId.get(cityId) ?? null;
}

async function loadCities() {
  if (IS_TEST_MODE) {
    return getCities();
  }

  return ensureCitiesLoaded();
}

async function loadDocumentTypes() {
  if (IS_TEST_MODE) {
    return getDocumentTypes();
  }

  return ensureDocumentTypesLoaded();
}

async function loadLocalitiesByCity(cityId: string) {
  if (IS_TEST_MODE) {
    return getLocalitiesByCity(cityId);
  }

  if (loadedLocalityCityIds.has(cityId)) {
    return getCachedLocalitiesByCity(cityId);
  }

  const cachedRequestPromise = localityRequestPromiseByCityId.get(cityId);

  if (cachedRequestPromise) {
    return cachedRequestPromise;
  }

  const requestPromise = resolveBackendCityId(cityId)
    .then(async (backendCityId) => {
      if (backendCityId === null) {
        return getLocalitiesByCity(cityId);
      }

      const options = await fetchCatalogOptions(`/catalogs/localities/${backendCityId}`);
      const cityLabel = cityLabelByFrontendId.get(cityId) ?? '';
      const nextLocalities = options.map((option) => ({
        cityId,
        id: buildLocalityId(cityLabel, option.name),
        label: normalizeText(option.name),
      })) satisfies LocalityOption[];

      localitiesCache.set(
        cityId,
        nextLocalities.length > 0 ? nextLocalities : getFallbackLocalitiesByCity(cityId),
      );
      loadedLocalityCityIds.add(cityId);

      return getCachedLocalitiesByCity(cityId);
    })
    .catch(() => getLocalitiesByCity(cityId))
    .finally(() => {
      localityRequestPromiseByCityId.delete(cityId);
    });

  localityRequestPromiseByCityId.set(cityId, requestPromise);

  return requestPromise;
}

function getCities() {
  return citiesCache;
}

function getDocumentTypes() {
  return documentTypesCache;
}

function getLocalitiesByCity(cityId: string) {
  return getCachedLocalitiesByCity(cityId);
}

export const patientRegisterCatalogDataSource: PatientRegisterCatalogDataSource = {
  getCities,
  getDocumentTypes,
  getLocalitiesByCity,
  loadCities,
  loadDocumentTypes,
  loadLocalitiesByCity,
};
