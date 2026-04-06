import {
  Building2,
  ImagePlus,
  KeyRound,
  Mail,
  MapPin,
  PencilLine,
  Phone,
  Plus,
  Power,
  RotateCcw,
  Save,
  UserRound,
} from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminSelectField } from '@/components/admin/AdminSelectField';
import { AdminTextField } from '@/components/admin/AdminTextField';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { universityAdminContent } from '@/content/universityAdminContent';
import type {
  AsyncCatalogState,
  CityOption,
  LocalityOption,
  PatientRegisterCatalogDataSource,
  UniversityCampus,
  UniversityInstitutionFormErrors,
  UniversityInstitutionFormField,
  UniversityInstitutionFormValues,
  UniversityPasswordFormErrors,
  UniversityPasswordFormField,
  UniversityPasswordFormValues,
} from '@/content/types';
import { patientRegisterCatalogDataSource } from '@/lib/patientRegisterCatalogDataSource';
import { useUniversityAdminModuleStore } from '@/lib/universityAdminModuleStore';

type UniversityInstitutionPageProps = {
  catalogDataSource?: PatientRegisterCatalogDataSource;
};

const passwordInitialValues: UniversityPasswordFormValues = {
  confirmPassword: '',
  currentPassword: '',
  newPassword: '',
};

type CampusFormValues = {
  address: string;
  cityId: string;
  localityId: string;
  name: string;
  status: UniversityCampus['status'];
};

type CampusFormField = keyof CampusFormValues;

type CampusFormErrors = Partial<Record<CampusFormField, string>>;

const campusInitialValues: CampusFormValues = {
  address: '',
  cityId: '',
  localityId: '',
  name: '',
  status: 'active',
};

function createEmptyCatalogState<T>(
  status: AsyncCatalogState<T>['status'],
): AsyncCatalogState<T> {
  return {
    error: null,
    options: [],
    status,
  };
}

function createInitialCatalogState<T>(
  result: Promise<T[]> | T[],
  emptyStatus: AsyncCatalogState<T>['status'],
): AsyncCatalogState<T> {
  if (Array.isArray(result) && result.length > 0) {
    return {
      error: null,
      options: result,
      status: 'ready',
    };
  }

  return createEmptyCatalogState(emptyStatus);
}

function resolveCatalogResult<T>(result: Promise<T[]> | T[]) {
  return Promise.resolve(result);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getInstitutionInitialValues(
  institutionProfile: ReturnType<typeof useUniversityAdminModuleStore>['institutionProfile'],
): UniversityInstitutionFormValues {
  return {
    adminEmail: institutionProfile.adminEmail,
    adminFirstName: institutionProfile.adminFirstName,
    adminLastName: institutionProfile.adminLastName,
    adminPhone: institutionProfile.adminPhone,
    campuses: institutionProfile.campuses.map((campus) => ({ ...campus })),
    cityId: institutionProfile.mainCityId,
    logoFileName: institutionProfile.logoFileName,
    logoSrc: institutionProfile.logoSrc,
    mainLocalityId: institutionProfile.mainLocalityId,
    name: institutionProfile.name,
  };
}

function validateInstitutionField(
  field: UniversityInstitutionFormField,
  value: string | null,
): string | undefined {
  const normalizedValue = typeof value === 'string' ? value.trim() : value;

  if (field === 'logoFileName' || field === 'logoSrc') {
    return undefined;
  }

  if (field === 'campuses') {
    return undefined;
  }

  if (!normalizedValue) {
    switch (field) {
      case 'adminEmail':
        return 'El correo del administrador es obligatorio';
      case 'adminFirstName':
        return 'El nombre del administrador es obligatorio';
      case 'adminLastName':
        return 'El apellido del administrador es obligatorio';
      case 'adminPhone':
        return 'El celular del administrador es obligatorio';
      case 'cityId':
        return 'La ciudad principal es obligatoria';
      case 'mainLocalityId':
        return 'La localidad principal es obligatoria';
      case 'name':
        return 'El nombre de la universidad es obligatorio';
      default:
        return undefined;
    }
  }

  if (field === 'adminEmail' && !isValidEmail(normalizedValue)) {
    return 'Ingresa un correo electronico valido';
  }

  return undefined;
}

function validateCampusField(
  field: CampusFormField,
  value: string,
): string | undefined {
  const normalizedValue = value.trim();

  if (field === 'status') {
    return undefined;
  }

  if (!normalizedValue) {
    switch (field) {
      case 'address':
        return 'La direccion de la sede es obligatoria';
      case 'cityId':
        return 'La ciudad de la sede es obligatoria';
      case 'localityId':
        return 'La localidad de la sede es obligatoria';
      case 'name':
        return 'El nombre de la sede es obligatorio';
      default:
        return undefined;
    }
  }

  return undefined;
}

function validatePasswordField(
  field: UniversityPasswordFormField,
  values: UniversityPasswordFormValues,
): string | undefined {
  const value = values[field].trim();

  if (!value) {
    switch (field) {
      case 'confirmPassword':
        return 'Confirma la nueva contrasena';
      case 'currentPassword':
        return 'Ingresa la contrasena actual';
      case 'newPassword':
        return 'Ingresa la nueva contrasena';
      default:
        return undefined;
    }
  }

  if (field === 'newPassword' && value.length < 8) {
    return 'La nueva contrasena debe tener al menos 8 caracteres';
  }

  if (
    field === 'confirmPassword' &&
    values.confirmPassword.trim() &&
    values.confirmPassword !== values.newPassword
  ) {
    return 'La confirmacion no coincide con la nueva contrasena';
  }

  return undefined;
}

export function UniversityInstitutionPage({
  catalogDataSource = patientRegisterCatalogDataSource,
}: UniversityInstitutionPageProps) {
  const { changePassword, errorMessage, institutionProfile, isLoading, updateInstitutionProfile } =
    useUniversityAdminModuleStore();
  const [values, setValues] = useState(() => getInstitutionInitialValues(institutionProfile));
  const [errors, setErrors] = useState<UniversityInstitutionFormErrors>({});
  const [citiesState, setCitiesState] = useState<AsyncCatalogState<CityOption>>(
    () => createInitialCatalogState(catalogDataSource.getCities(), 'loading'),
  );
  const [localitiesState, setLocalitiesState] = useState<AsyncCatalogState<LocalityOption>>(
    createEmptyCatalogState('idle'),
  );
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isPasswordPanelOpen, setIsPasswordPanelOpen] = useState(false);
  const [passwordValues, setPasswordValues] = useState(passwordInitialValues);
  const [passwordErrors, setPasswordErrors] = useState<UniversityPasswordFormErrors>({});
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [campusDraft, setCampusDraft] = useState(campusInitialValues);
  const [campusErrors, setCampusErrors] = useState<CampusFormErrors>({});
  const [editingCampusId, setEditingCampusId] = useState<string | null>(null);
  const [campusLocalitiesState, setCampusLocalitiesState] = useState<AsyncCatalogState<LocalityOption>>(
    createEmptyCatalogState('idle'),
  );
  const adminFirstNameRef = useRef<HTMLInputElement>(null);
  const adminLastNameRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLSelectElement>(null);
  const localityRef = useRef<HTMLSelectElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  const institutionFieldRefs = useMemo(
    () =>
      ({
        adminEmail: emailRef,
        adminFirstName: adminFirstNameRef,
        adminLastName: adminLastNameRef,
        adminPhone: phoneRef,
        campuses: { current: null },
        cityId: cityRef,
        logoFileName: { current: null },
        logoSrc: { current: null },
        mainLocalityId: localityRef,
        name: nameRef,
      }) satisfies Record<
        UniversityInstitutionFormField,
        { current: HTMLInputElement | HTMLSelectElement | null }
      >,
    [],
  );

  useEffect(() => {
    setValues(getInstitutionInitialValues(institutionProfile));
    setCampusDraft(campusInitialValues);
    setCampusErrors({});
    setEditingCampusId(null);
  }, [institutionProfile]);

  useEffect(() => {
    let isCancelled = false;

    async function loadCities() {
      setCitiesState(createInitialCatalogState(catalogDataSource.getCities(), 'loading'));

      try {
        const cities = await resolveCatalogResult(catalogDataSource.loadCities ? catalogDataSource.loadCities() : catalogDataSource.getCities());

        if (isCancelled) {
          return;
        }

        setCitiesState({
          error: null,
          options: cities,
          status: 'ready',
        });
      } catch {
        if (isCancelled) {
          return;
        }

        setCitiesState({
          error: 'No pudimos cargar las ciudades',
          options: [],
          status: 'error',
        });
      }
    }

    void loadCities();

    return () => {
      isCancelled = true;
    };
  }, [catalogDataSource]);

  useEffect(() => {
    if (!values.cityId) {
      setLocalitiesState(createEmptyCatalogState('idle'));
      return;
    }

    let isCancelled = false;

    async function loadLocalities() {
      setLocalitiesState(createEmptyCatalogState('loading'));

      try {
        const localities = await resolveCatalogResult(
          catalogDataSource.loadLocalitiesByCity ? catalogDataSource.loadLocalitiesByCity(values.cityId) : catalogDataSource.getLocalitiesByCity(values.cityId),
        );

        if (isCancelled) {
          return;
        }

        setLocalitiesState({
          error: null,
          options: localities,
          status: 'ready',
        });
      } catch {
        if (isCancelled) {
          return;
        }

        setLocalitiesState({
          error: 'No pudimos cargar las localidades',
          options: [],
          status: 'error',
        });
      }
    }

    void loadLocalities();

    return () => {
      isCancelled = true;
    };
  }, [catalogDataSource, values.cityId]);

  useEffect(() => {
    if (!campusDraft.cityId) {
      setCampusLocalitiesState(createEmptyCatalogState('idle'));
      return;
    }

    let isCancelled = false;

    async function loadCampusLocalities() {
      setCampusLocalitiesState(createEmptyCatalogState('loading'));

      try {
        const localities = await resolveCatalogResult(
          catalogDataSource.loadLocalitiesByCity
            ? catalogDataSource.loadLocalitiesByCity(campusDraft.cityId)
            : catalogDataSource.getLocalitiesByCity(campusDraft.cityId),
        );

        if (isCancelled) {
          return;
        }

        setCampusLocalitiesState({
          error: null,
          options: localities,
          status: 'ready',
        });
      } catch {
        if (isCancelled) {
          return;
        }

        setCampusLocalitiesState({
          error: 'No pudimos cargar las localidades de la sede',
          options: [],
          status: 'error',
        });
      }
    }

    void loadCampusLocalities();

    return () => {
      isCancelled = true;
    };
  }, [campusDraft.cityId, catalogDataSource]);

  const handleInstitutionFieldChange = (
    field: UniversityInstitutionFormField,
    nextValue: string | null,
  ) => {
    setValues((currentValues) =>
      field === 'cityId'
        ? {
            ...currentValues,
            cityId: nextValue ?? '',
            mainLocalityId: '',
          }
        : {
            ...currentValues,
            [field]: nextValue,
          },
    );

    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      const nextFieldError = validateInstitutionField(field, nextValue);

      if (nextFieldError) {
        nextErrors[field] = nextFieldError;
      } else {
        delete nextErrors[field];
      }

      if (field === 'cityId') {
        delete nextErrors.mainLocalityId;
      }

      return nextErrors;
    });

    setSaveMessage(null);
  };

  const handleInstitutionFieldBlur = (field: UniversityInstitutionFormField) => {
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      const rawValue = values[field];
      const nextFieldError = validateInstitutionField(
        field,
        typeof rawValue === 'string' || rawValue === null ? rawValue : null,
      );

      if (nextFieldError) {
        nextErrors[field] = nextFieldError;
      } else {
        delete nextErrors[field];
      }

      return nextErrors;
    });
  };

  const handleLogoSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return;
      }

      handleInstitutionFieldChange('logoFileName', file.name);
      handleInstitutionFieldChange('logoSrc', reader.result);
    };

    reader.readAsDataURL(file);
  };

  const handleInstitutionSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const nextErrors: UniversityInstitutionFormErrors = {};
    const fieldOrder: UniversityInstitutionFormField[] = [
      'name',
      'cityId',
      'mainLocalityId',
      'adminFirstName',
      'adminLastName',
      'adminEmail',
      'adminPhone',
    ];

    fieldOrder.forEach((field) => {
      const rawValue = values[field];
      const nextFieldError = validateInstitutionField(
        field,
        typeof rawValue === 'string' || rawValue === null ? rawValue : null,
      );

      if (nextFieldError) {
        nextErrors[field] = nextFieldError;
      }
    });

    setErrors(nextErrors);

    const firstErrorField = fieldOrder.find((field) => nextErrors[field]);

    if (firstErrorField) {
      institutionFieldRefs[firstErrorField].current?.focus();
      return;
    }

    void (async () => {
      const updated = await updateInstitutionProfile(values);

      if (!updated) {
        return;
      }

      setSaveMessage(universityAdminContent.institutionPage.successMessage);
    })();
  };

  const handleReset = () => {
    setValues(getInstitutionInitialValues(institutionProfile));
    setCampusDraft(campusInitialValues);
    setCampusErrors({});
    setEditingCampusId(null);
    setErrors({});
    setPasswordErrors({});
    setPasswordValues(passwordInitialValues);
    setPasswordMessage(null);
    setSaveMessage(null);
  };

  const handleCampusFieldChange = (
    field: CampusFormField,
    nextValue: string,
  ) => {
    setCampusDraft((currentValues) =>
      field === 'cityId'
        ? {
            ...currentValues,
            cityId: nextValue,
            localityId: '',
          }
        : {
            ...currentValues,
            [field]: nextValue,
          },
    );

    setCampusErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      const nextFieldError = validateCampusField(field, nextValue);

      if (nextFieldError) {
        nextErrors[field] = nextFieldError;
      } else {
        delete nextErrors[field];
      }

      if (field === 'cityId') {
        delete nextErrors.localityId;
      }

      return nextErrors;
    });
  };

  const handleCampusFieldBlur = (field: CampusFormField) => {
    setCampusErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      const nextFieldError = validateCampusField(field, campusDraft[field]);

      if (nextFieldError) {
        nextErrors[field] = nextFieldError;
      } else {
        delete nextErrors[field];
      }

      return nextErrors;
    });
  };

  const handleCampusEdit = (campus: UniversityCampus) => {
    setEditingCampusId(campus.id);
    setCampusDraft({
      address: campus.address,
      cityId: campus.cityId,
      localityId: campus.localityId,
      name: campus.name,
      status: campus.status,
    });
    setCampusErrors({});
  };

  const handleCampusReset = () => {
    setEditingCampusId(null);
    setCampusDraft(campusInitialValues);
    setCampusErrors({});
  };

  const handleCampusSubmit = () => {
    const nextErrors: CampusFormErrors = {};
    const fieldOrder: CampusFormField[] = ['name', 'cityId', 'localityId', 'address'];

    fieldOrder.forEach((field) => {
      const nextFieldError = validateCampusField(field, campusDraft[field]);

      if (nextFieldError) {
        nextErrors[field] = nextFieldError;
      }
    });

    setCampusErrors(nextErrors);

    if (fieldOrder.some((field) => nextErrors[field])) {
      return;
    }

    const selectedCity = citiesState.options.find((city) => city.id === campusDraft.cityId);
    const selectedLocality = campusLocalitiesState.options.find(
      (locality) => locality.id === campusDraft.localityId,
    );

    const nextCampus: UniversityCampus = {
      address: campusDraft.address.trim(),
      city: selectedCity?.label ?? '',
      cityId: campusDraft.cityId,
      id: editingCampusId ?? `campus-${Date.now()}`,
      locality: selectedLocality?.label ?? '',
      localityId: campusDraft.localityId,
      name: campusDraft.name.trim(),
      status: editingCampusId ? campusDraft.status : 'active',
    };

    setValues((currentValues) => ({
      ...currentValues,
      campuses: editingCampusId
        ? currentValues.campuses.map((campus) =>
            campus.id === editingCampusId ? nextCampus : campus,
          )
        : [nextCampus, ...currentValues.campuses],
    }));
    setSaveMessage(null);
    handleCampusReset();
  };

  const handlePasswordFieldChange = (
    field: UniversityPasswordFormField,
    nextValue: string,
  ) => {
    setPasswordValues((currentValues) => ({
      ...currentValues,
      [field]: nextValue,
    }));

    setPasswordErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      const nextValues = {
        ...passwordValues,
        [field]: nextValue,
      };
      const nextFieldError = validatePasswordField(field, nextValues);

      if (nextFieldError) {
        nextErrors[field] = nextFieldError;
      } else {
        delete nextErrors[field];
      }

      if (field === 'newPassword' || field === 'confirmPassword') {
        const confirmError = validatePasswordField('confirmPassword', nextValues);

        if (confirmError) {
          nextErrors.confirmPassword = confirmError;
        } else {
          delete nextErrors.confirmPassword;
        }
      }

      return nextErrors;
    });

    setPasswordMessage(null);
  };

  const handlePasswordSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: UniversityPasswordFormErrors = {};
    const fieldOrder: UniversityPasswordFormField[] = [
      'currentPassword',
      'newPassword',
      'confirmPassword',
    ];

    fieldOrder.forEach((field) => {
      const nextFieldError = validatePasswordField(field, passwordValues);

      if (nextFieldError) {
        nextErrors[field] = nextFieldError;
      }
    });

    setPasswordErrors(nextErrors);

    if (fieldOrder.some((field) => nextErrors[field])) {
      return;
    }

    void (async () => {
      const updated = await changePassword(passwordValues);

      if (!updated) {
        return;
      }

      setPasswordValues(passwordInitialValues);
      setPasswordMessage(universityAdminContent.institutionPage.passwordSuccessMessage);
    })();
  };

  const cityPlaceholder =
    citiesState.status === 'loading'
      ? 'Cargando ciudades...'
      : citiesState.status === 'error'
        ? 'No pudimos cargar las ciudades'
        : 'Selecciona una ciudad';
  const localityPlaceholder = !values.cityId
    ? 'Selecciona una ciudad primero'
    : localitiesState.status === 'loading'
      ? 'Cargando localidades...'
      : localitiesState.status === 'error'
        ? 'No pudimos cargar las localidades'
        : 'Selecciona una localidad';
  const campusLocalityPlaceholder = !campusDraft.cityId
    ? 'Selecciona una ciudad primero'
    : campusLocalitiesState.status === 'loading'
      ? 'Cargando localidades...'
      : campusLocalitiesState.status === 'error'
        ? 'No pudimos cargar las localidades'
        : 'Selecciona una localidad';
  const logoInitials = values.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token.charAt(0))
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
      <Seo
        description={universityAdminContent.institutionPage.meta.description}
        noIndex
        title={universityAdminContent.institutionPage.meta.title}
      />
      <AdminPageHeader
        description={universityAdminContent.institutionPage.description}
        title={universityAdminContent.institutionPage.title}
      />
      {saveMessage ? (
        <SurfaceCard
          className="border border-emerald-200 bg-emerald-50/90 text-sm font-medium text-emerald-800"
          paddingClassName="p-3.5"
        >
          <p role="status">{saveMessage}</p>
        </SurfaceCard>
      ) : null}
      {errorMessage ? (
        <SurfaceCard
          className="border border-rose-200 bg-rose-50/90 text-sm font-medium text-rose-800"
          paddingClassName="p-3.5"
        >
          <p role="alert">{errorMessage}</p>
        </SurfaceCard>
      ) : null}
      <AdminPanelCard className="flex-1" panelClassName="bg-slate-50">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-7">
            <div className="space-y-6 pb-6">
              <SurfaceCard
                className="overflow-hidden bg-white shadow-none"
                paddingClassName="p-0"
              >
                <div className="space-y-6">
                  <div className="space-y-5 rounded-[1.75rem] border border-slate-200/80 bg-white p-5 sm:p-6">
                    <div>
                      <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink">
                        {universityAdminContent.institutionPage.sectionTitles.institution}
                      </h2>
                    </div>
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(15rem,17rem)] xl:items-start">
                      <div className="grid gap-5 lg:grid-cols-2">
                        <div className="lg:col-span-2">
                          <AdminTextField
                            error={errors.name}
                            icon={Building2}
                            id="university-institution-name"
                            inputRef={nameRef}
                            label="Nombre de la universidad"
                            name="name"
                            placeholder="Ingresa el nombre oficial"
                            value={values.name}
                            onBlur={() => handleInstitutionFieldBlur('name')}
                            onChange={(value) => handleInstitutionFieldChange('name', value)}
                          />
                        </div>
                        <AdminSelectField
                          disabled={citiesState.status !== 'ready' || citiesState.options.length === 0}
                          error={errors.cityId}
                          helpText={
                            !errors.cityId && citiesState.status === 'error'
                              ? citiesState.error ?? undefined
                              : undefined
                          }
                          icon={MapPin}
                          id="university-institution-city"
                          label="Ciudad principal"
                          name="cityId"
                          options={citiesState.options}
                          placeholder={cityPlaceholder}
                          selectRef={cityRef}
                          value={values.cityId}
                          onBlur={() => handleInstitutionFieldBlur('cityId')}
                          onChange={(value) => handleInstitutionFieldChange('cityId', value)}
                        />
                        <AdminSelectField
                          disabled={
                            !values.cityId ||
                            localitiesState.status !== 'ready' ||
                            localitiesState.options.length === 0
                          }
                          error={errors.mainLocalityId}
                          helpText={
                            !errors.mainLocalityId && localitiesState.status === 'error'
                              ? localitiesState.error ?? undefined
                              : undefined
                          }
                          icon={MapPin}
                          id="university-institution-locality"
                          label="Localidad principal"
                          name="mainLocalityId"
                          options={localitiesState.options}
                          placeholder={localityPlaceholder}
                          selectRef={localityRef}
                          value={values.mainLocalityId}
                          onBlur={() => handleInstitutionFieldBlur('mainLocalityId')}
                          onChange={(value) => handleInstitutionFieldChange('mainLocalityId', value)}
                        />
                      </div>
                      <div className="space-y-3 self-start rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-center xl:-mt-16">
                        <div className="space-y-1">
                          <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
                            Logo institucional
                          </p>
                          <p className="text-sm leading-6 text-ink-muted">
                            {universityAdminContent.institutionPage.logoHelper}
                          </p>
                        </div>
                        <div className="flex flex-col items-center gap-4">
                          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[1.5rem] bg-white ring-1 ring-slate-200">
                            {values.logoSrc ? (
                              <img
                                alt={institutionProfile.logoAlt}
                                className="h-full w-full object-cover"
                                src={values.logoSrc}
                              />
                            ) : (
                              <span className="font-headline text-3xl font-extrabold tracking-tight text-primary">
                                {logoInitials || 'UC'}
                              </span>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label
                              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110"
                              htmlFor="institution-logo-input"
                            >
                              <ImagePlus aria-hidden="true" className="h-4 w-4" />
                              <span>{universityAdminContent.institutionPage.actionLabels.uploadLogo}</span>
                            </label>
                            <input
                              accept=".jpg,.jpeg,.png"
                              className="sr-only"
                              id="institution-logo-input"
                              type="file"
                              onChange={handleLogoSelection}
                            />
                            <p className="text-xs text-ink-muted">
                              {values.logoFileName ?? 'Aun no has seleccionado un archivo'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-4 sm:p-5">
                      <div className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="font-headline text-lg font-extrabold tracking-tight text-ink">
                              Sedes de la universidad
                            </h3>
                            <p className="text-sm leading-6 text-ink-muted">
                              Agrega sedes y actualiza su estado desde este modulo.
                            </p>
                          </div>
                          <span className="inline-flex items-center justify-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-muted ring-1 ring-slate-200">
                            {values.campuses.length} registradas
                          </span>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2">
                          <AdminTextField
                            error={campusErrors.name}
                            icon={Building2}
                            id="university-campus-name"
                            label="Nombre de la sede"
                            name="campusName"
                            placeholder="Ej. Sede Norte"
                            value={campusDraft.name}
                            onBlur={() => handleCampusFieldBlur('name')}
                            onChange={(value) => handleCampusFieldChange('name', value)}
                          />
                          <AdminTextField
                            error={campusErrors.address}
                            icon={MapPin}
                            id="university-campus-address"
                            label="Direccion"
                            name="campusAddress"
                            placeholder="Ingresa la direccion"
                            value={campusDraft.address}
                            onBlur={() => handleCampusFieldBlur('address')}
                            onChange={(value) => handleCampusFieldChange('address', value)}
                          />
                          <AdminSelectField
                            disabled={citiesState.status !== 'ready' || citiesState.options.length === 0}
                            error={campusErrors.cityId}
                            helpText={
                              !campusErrors.cityId && citiesState.status === 'error'
                                ? citiesState.error ?? undefined
                                : undefined
                            }
                            icon={MapPin}
                            id="university-campus-city"
                            label="Ciudad"
                            name="campusCityId"
                            options={citiesState.options}
                            placeholder={cityPlaceholder}
                            value={campusDraft.cityId}
                            onBlur={() => handleCampusFieldBlur('cityId')}
                            onChange={(value) => handleCampusFieldChange('cityId', value)}
                          />
                          <AdminSelectField
                            disabled={
                              !campusDraft.cityId ||
                              campusLocalitiesState.status !== 'ready' ||
                              campusLocalitiesState.options.length === 0
                            }
                            error={campusErrors.localityId}
                            helpText={
                              !campusErrors.localityId && campusLocalitiesState.status === 'error'
                                ? campusLocalitiesState.error ?? undefined
                                : undefined
                            }
                            icon={MapPin}
                            id="university-campus-locality"
                            label="Localidad"
                            name="campusLocalityId"
                            options={campusLocalitiesState.options}
                            placeholder={campusLocalityPlaceholder}
                            value={campusDraft.localityId}
                            onBlur={() => handleCampusFieldBlur('localityId')}
                            onChange={(value) => handleCampusFieldChange('localityId', value)}
                          />
                          {editingCampusId ? (
                            <AdminSelectField
                              error={campusErrors.status}
                              icon={Power}
                              id="university-campus-status"
                              label="Estado"
                              name="campusStatus"
                              options={[
                                { id: 'active', label: 'Activa' },
                                { id: 'inactive', label: 'Inactiva' },
                              ]}
                              placeholder="Selecciona un estado"
                              value={campusDraft.status}
                              onBlur={() => handleCampusFieldBlur('status')}
                              onChange={(value) => handleCampusFieldChange('status', value)}
                            />
                          ) : (
                            <div className="space-y-1.5">
                              <span className="block text-sm font-semibold text-ink">Estado inicial</span>
                              <div className="inline-flex min-h-[3rem] items-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-slate-200">
                                Activa
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                          {editingCampusId ? (
                            <button
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink transition duration-300 hover:bg-slate-100"
                              type="button"
                              onClick={handleCampusReset}
                            >
                              <RotateCcw aria-hidden="true" className="h-4 w-4" />
                              <span>Cancelar edicion</span>
                            </button>
                          ) : null}
                          <button
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-4 py-3 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110"
                            type="button"
                            onClick={handleCampusSubmit}
                          >
                            {editingCampusId ? (
                              <Save aria-hidden="true" className="h-4 w-4" />
                            ) : (
                              <Plus aria-hidden="true" className="h-4 w-4" />
                            )}
                            <span>{editingCampusId ? 'Guardar sede' : 'Agregar sede'}</span>
                          </button>
                        </div>
                        <div className="grid gap-3">
                          {values.campuses.map((campus) => (
                            <div
                              key={campus.id}
                              className="flex flex-col gap-3 rounded-[1.35rem] border border-slate-200/80 bg-white p-4 sm:flex-row sm:items-start sm:justify-between"
                            >
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-sm font-semibold text-ink">{campus.name}</h4>
                                  <span
                                    className={
                                      campus.status === 'active'
                                        ? 'inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[0.7rem] font-semibold text-emerald-700 ring-1 ring-emerald-200'
                                        : 'inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[0.7rem] font-semibold text-slate-600 ring-1 ring-slate-200'
                                    }
                                  >
                                    {campus.status === 'active' ? 'Activa' : 'Inactiva'}
                                  </span>
                                </div>
                                <p className="text-sm text-ink-muted">{campus.address}</p>
                                <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
                                  {campus.city} · {campus.locality}
                                </p>
                              </div>
                              <button
                                className="inline-flex items-center justify-center gap-2 self-start rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-primary transition duration-300 hover:bg-slate-100"
                                type="button"
                                onClick={() => handleCampusEdit(campus)}
                              >
                                <PencilLine aria-hidden="true" className="h-4 w-4" />
                                <span>Editar</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 rounded-[1.75rem] border border-slate-200/80 bg-white p-5 sm:p-6">
                    <div>
                      <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink">
                        {universityAdminContent.institutionPage.sectionTitles.administrator}
                      </h2>
                    </div>
                    <div className="grid gap-5 lg:grid-cols-2">
                      <AdminTextField
                        error={errors.adminFirstName}
                        icon={UserRound}
                        id="university-institution-admin-first-name"
                        inputRef={adminFirstNameRef}
                        label="Nombres"
                        name="adminFirstName"
                        placeholder="Ingresa los nombres"
                        value={values.adminFirstName}
                        onBlur={() => handleInstitutionFieldBlur('adminFirstName')}
                        onChange={(value) => handleInstitutionFieldChange('adminFirstName', value)}
                      />
                      <AdminTextField
                        error={errors.adminLastName}
                        icon={UserRound}
                        id="university-institution-admin-last-name"
                        inputRef={adminLastNameRef}
                        label="Apellidos"
                        name="adminLastName"
                        placeholder="Ingresa los apellidos"
                        value={values.adminLastName}
                        onBlur={() => handleInstitutionFieldBlur('adminLastName')}
                        onChange={(value) => handleInstitutionFieldChange('adminLastName', value)}
                      />
                      <div className="lg:col-span-2">
                        <AdminTextField
                          error={errors.adminEmail}
                          icon={Mail}
                          id="university-institution-admin-email"
                          inputRef={emailRef}
                          label="Correo electronico"
                          name="adminEmail"
                          placeholder="admin@universidad.edu.co"
                          type="email"
                          value={values.adminEmail}
                          onBlur={() => handleInstitutionFieldBlur('adminEmail')}
                          onChange={(value) => handleInstitutionFieldChange('adminEmail', value)}
                        />
                      </div>
                      <AdminTextField
                        error={errors.adminPhone}
                        icon={Phone}
                        id="university-institution-admin-phone"
                        inputRef={phoneRef}
                        label="Celular"
                        name="adminPhone"
                        placeholder="3001234567"
                        type="tel"
                        value={values.adminPhone}
                        onBlur={() => handleInstitutionFieldBlur('adminPhone')}
                        onChange={(value) => handleInstitutionFieldChange('adminPhone', value)}
                      />
                      <div className="flex items-end lg:col-span-2">
                        <button
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-primary transition duration-300 hover:bg-slate-100"
                          type="button"
                          onClick={() => setIsPasswordPanelOpen((currentValue) => !currentValue)}
                        >
                          <KeyRound aria-hidden="true" className="h-4 w-4" />
                          <span>{universityAdminContent.institutionPage.actionLabels.changePassword}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {isPasswordPanelOpen ? (
                    <SurfaceCard
                      className="border border-slate-200/80 bg-white shadow-none"
                      paddingClassName="p-5 sm:p-6"
                    >
                        <form className="space-y-5" noValidate onSubmit={handlePasswordSubmit}>
                          <div className="space-y-1">
                            <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink">
                              {universityAdminContent.institutionPage.passwordPanelTitle}
                            </h2>
                            <p className="text-sm leading-6 text-ink-muted">
                              {universityAdminContent.institutionPage.passwordPanelDescription}
                            </p>
                          </div>
                          {passwordMessage ? (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                              {passwordMessage}
                            </div>
                          ) : null}
                          <div className="grid gap-5 lg:grid-cols-3">
                            <AdminTextField
                              error={passwordErrors.currentPassword}
                              icon={KeyRound}
                              id="university-password-current"
                              label="Contrasena actual"
                              name="currentPassword"
                              placeholder="Ingresa la contrasena actual"
                              type="password"
                              value={passwordValues.currentPassword}
                              onBlur={() => {
                                setPasswordErrors((currentErrors) => {
                                  const nextErrors = { ...currentErrors };
                                  const nextFieldError = validatePasswordField(
                                    'currentPassword',
                                    passwordValues,
                                  );

                                  if (nextFieldError) {
                                    nextErrors.currentPassword = nextFieldError;
                                  } else {
                                    delete nextErrors.currentPassword;
                                  }

                                  return nextErrors;
                                });
                              }}
                              onChange={(value) => handlePasswordFieldChange('currentPassword', value)}
                            />
                            <AdminTextField
                              error={passwordErrors.newPassword}
                              icon={KeyRound}
                              id="university-password-new"
                              label="Nueva contrasena"
                              name="newPassword"
                              placeholder="Minimo 8 caracteres"
                              type="password"
                              value={passwordValues.newPassword}
                              onBlur={() => {
                                setPasswordErrors((currentErrors) => {
                                  const nextErrors = { ...currentErrors };
                                  const nextFieldError = validatePasswordField(
                                    'newPassword',
                                    passwordValues,
                                  );

                                  if (nextFieldError) {
                                    nextErrors.newPassword = nextFieldError;
                                  } else {
                                    delete nextErrors.newPassword;
                                  }

                                  return nextErrors;
                                });
                              }}
                              onChange={(value) => handlePasswordFieldChange('newPassword', value)}
                            />
                            <AdminTextField
                              error={passwordErrors.confirmPassword}
                              icon={KeyRound}
                              id="university-password-confirm"
                              label="Confirmar contrasena"
                              name="confirmPassword"
                              placeholder="Repite la nueva contrasena"
                              type="password"
                              value={passwordValues.confirmPassword}
                              onBlur={() => {
                                setPasswordErrors((currentErrors) => {
                                  const nextErrors = { ...currentErrors };
                                  const nextFieldError = validatePasswordField(
                                    'confirmPassword',
                                    passwordValues,
                                  );

                                  if (nextFieldError) {
                                    nextErrors.confirmPassword = nextFieldError;
                                  } else {
                                    delete nextErrors.confirmPassword;
                                  }

                                  return nextErrors;
                                });
                              }}
                              onChange={(value) => handlePasswordFieldChange('confirmPassword', value)}
                            />
                          </div>
                          <div className="flex justify-end">
                            <button
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-5 py-3 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110"
                              disabled={isLoading}
                              type="submit"
                            >
                              <Save aria-hidden="true" className="h-4 w-4" />
                              <span>{universityAdminContent.institutionPage.actionLabels.savePassword}</span>
                            </button>
                          </div>
                        </form>
                    </SurfaceCard>
                  ) : null}
                </div>
              </SurfaceCard>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-200/80 bg-white px-6 py-4 sm:px-7">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-ink transition duration-300 hover:bg-slate-100"
              disabled={isLoading}
              type="button"
              onClick={handleReset}
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              <span>{universityAdminContent.institutionPage.actionLabels.reset}</span>
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-5 py-3 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110"
              disabled={isLoading}
              type="button"
              onClick={() => handleInstitutionSubmit()}
            >
              <Save aria-hidden="true" className="h-4 w-4" />
              <span>{universityAdminContent.institutionPage.actionLabels.save}</span>
            </button>
          </div>
        </div>
      </AdminPanelCard>
    </div>
  );
}
