import {
  ArrowLeft,
  Building2,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from 'lucide-react';
import type { FormEvent, Ref } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Seo } from '@/components/ui/Seo';
import { ROUTES } from '@/constants/routes';
import { adminContent } from '@/content/adminContent';
import type {
  AsyncCatalogState,
  CityOption,
  LocalityOption,
  PatientRegisterCatalogDataSource,
  RegisterUniversityFormErrors,
  RegisterUniversityFormField,
  RegisterUniversityFormValues,
} from '@/content/types';
import { classNames } from '@/lib/classNames';
import { useAdminModuleStore } from '@/lib/adminModuleStore';
import { patientRegisterCatalogDataSource } from '@/lib/patientRegisterCatalogDataSource';

type AdminRegisterUniversityPageProps = {
  catalogDataSource?: PatientRegisterCatalogDataSource;
};

const initialValues: RegisterUniversityFormValues = {
  adminEmail: '',
  adminFirstName: '',
  adminLastName: '',
  adminPhone: '',
  cityId: '',
  mainLocalityId: '',
  name: '',
};

const fieldOrder: RegisterUniversityFormField[] = [
  'name',
  'cityId',
  'mainLocalityId',
  'adminFirstName',
  'adminLastName',
  'adminEmail',
  'adminPhone',
];

const formFieldWrapperClassName = 'space-y-1';
const formFieldLabelClassName =
  'block text-[0.82rem] font-semibold text-ink sm:text-sm';
const formFieldIconClassName =
  'pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost';
const formFieldInputClassName =
  'w-full rounded-2xl border bg-surface py-2.5 pl-10 pr-3.5 text-sm leading-tight text-ink placeholder:text-ghost/80 transition duration-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:py-3';

function SelectField({
  disabled = false,
  error,
  helpText,
  icon,
  id,
  label,
  name,
  onBlur,
  onChange,
  options,
  placeholder,
  selectRef,
  value,
}: {
  disabled?: boolean;
  error?: string | undefined;
  helpText?: string | undefined;
  icon: typeof MapPin;
  id: string;
  label: string;
  name: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
  placeholder: string;
  selectRef?: Ref<HTMLSelectElement> | undefined;
  value: string;
}) {
  const Icon = icon;

  return (
    <div className={formFieldWrapperClassName}>
      <label className={formFieldLabelClassName} htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <Icon
          aria-hidden="true"
          className={formFieldIconClassName}
        />
        <select
          aria-describedby={
            error ? `${id}-error` : helpText ? `${id}-help` : undefined
          }
          aria-invalid={Boolean(error)}
          className={classNames(
            formFieldInputClassName,
            disabled ? 'cursor-not-allowed text-ghost' : '',
            error
              ? 'border-rose-300 focus-visible:border-rose-400 focus-visible:ring-rose-200/70'
              : 'border-slate-200 focus-visible:border-primary',
          )}
          disabled={disabled}
          id={id}
          name={name}
          ref={selectRef}
          value={value}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
        >
          <option disabled value="">
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <p className="text-sm text-rose-600" id={`${id}-error`}>
          {error}
        </p>
      ) : helpText ? (
        <p className="text-sm text-ink-muted" id={`${id}-help`}>
          {helpText}
        </p>
      ) : null}
    </div>
  );
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function resolveCatalogResult<T>(result: Promise<T[]> | T[]) {
  return Promise.resolve(result);
}

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

function getDependentFields(field: RegisterUniversityFormField) {
  switch (field) {
    case 'cityId':
      return ['mainLocalityId'] satisfies RegisterUniversityFormField[];
    default:
      return [] as RegisterUniversityFormField[];
  }
}

function validateField(
  field: RegisterUniversityFormField,
  value: string,
): string | undefined {
  const trimmedValue = value.trim();
  const copy = adminContent.registerPage.fields;

  if (field === 'adminPhone') {
    return undefined;
  }

  if (trimmedValue.length === 0) {
    switch (field) {
      case 'cityId':
        return copy.city.requiredMessage;
      case 'mainLocalityId':
        return copy.mainLocality.requiredMessage;
      default:
        return copy[field].requiredMessage;
    }
  }

  if (field === 'adminEmail' && !isValidEmail(trimmedValue)) {
    return copy.adminEmail.invalidMessage;
  }

  return undefined;
}

function validateForm(
  values: RegisterUniversityFormValues,
): RegisterUniversityFormErrors {
  const errors: RegisterUniversityFormErrors = {};

  fieldOrder.forEach((field) => {
    const nextError = validateField(field, values[field]);

    if (nextError) {
      errors[field] = nextError;
    }
  });

  return errors;
}

export function AdminRegisterUniversityPage({
  catalogDataSource = patientRegisterCatalogDataSource,
}: AdminRegisterUniversityPageProps) {
  const { errorMessage, isLoading, registerUniversity } = useAdminModuleStore({
    autoLoad: false,
  });
  const navigate = useNavigate();
  const nameRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLSelectElement>(null);
  const mainLocalityRef = useRef<HTMLSelectElement>(null);
  const adminFirstNameRef = useRef<HTMLInputElement>(null);
  const adminLastNameRef = useRef<HTMLInputElement>(null);
  const adminEmailRef = useRef<HTMLInputElement>(null);
  const adminPhoneRef = useRef<HTMLInputElement>(null);
  const fieldRefs = {
    adminEmail: adminEmailRef,
    adminFirstName: adminFirstNameRef,
    adminLastName: adminLastNameRef,
    adminPhone: adminPhoneRef,
    cityId: cityRef,
    mainLocalityId: mainLocalityRef,
    name: nameRef,
  } satisfies Record<
    RegisterUniversityFormField,
    { current: HTMLInputElement | HTMLSelectElement | null }
  >;
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<RegisterUniversityFormErrors>({});
  const [citiesState, setCitiesState] = useState<AsyncCatalogState<CityOption>>(
    () => createInitialCatalogState(catalogDataSource.getCities(), 'loading'),
  );
  const [localitiesState, setLocalitiesState] = useState<
    AsyncCatalogState<LocalityOption>
  >(createEmptyCatalogState('idle'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadCities() {
      setCitiesState(
        createInitialCatalogState(catalogDataSource.getCities(), 'loading'),
      );

      try {
        const cities = await resolveCatalogResult(
          catalogDataSource.loadCities
            ? catalogDataSource.loadCities()
            : catalogDataSource.getCities(),
        );

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
          error: adminContent.registerPage.fields.city.errorMessage,
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
          catalogDataSource.loadLocalitiesByCity
            ? catalogDataSource.loadLocalitiesByCity(values.cityId)
            : catalogDataSource.getLocalitiesByCity(values.cityId),
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
          error: adminContent.registerPage.fields.mainLocality.errorMessage,
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

  const updateFieldValue = (
    field: RegisterUniversityFormField,
    nextValue: string,
  ) => {
    setValues((currentValues) =>
      field === 'cityId'
        ? {
            ...currentValues,
            cityId: nextValue,
            mainLocalityId: '',
          }
        : {
            ...currentValues,
            [field]: nextValue,
          },
    );

    setErrors((currentErrors) => {
      const nextValues =
        field === 'cityId'
          ? {
              ...values,
              cityId: nextValue,
              mainLocalityId: '',
            }
          : {
              ...values,
              [field]: nextValue,
            };
      const nextErrors = { ...currentErrors };

      [field, ...getDependentFields(field)].forEach((fieldName) => {
        const nextFieldError = validateField(fieldName, nextValues[fieldName]);

        if (nextFieldError) {
          nextErrors[fieldName] = nextFieldError;
        } else {
          delete nextErrors[fieldName];
        }
      });

      return nextErrors;
    });
  };

  const handleFieldBlur = (field: RegisterUniversityFormField) => {
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };

      [field, ...getDependentFields(field)].forEach((fieldName) => {
        const nextFieldError = validateField(fieldName, values[fieldName]);

        if (nextFieldError) {
          nextErrors[fieldName] = nextFieldError;
        } else {
          delete nextErrors[fieldName];
        }
      });

      return nextErrors;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateForm(values);
    setErrors(nextErrors);

    const firstErrorField = fieldOrder.find((field) => nextErrors[field]);

    if (firstErrorField) {
      fieldRefs[firstErrorField].current?.focus();
      return;
    }

    void (async () => {
      setIsSubmitting(true);
      const result = await registerUniversity(values);

      if (!result) {
        setIsSubmitting(false);
        return;
      }

      navigate(ROUTES.adminUniversities, {
        state: {
          successNotice: adminContent.registerPage.successMessage,
        },
      });
    })();
  };

  const cityPlaceholder =
    citiesState.status === 'loading'
      ? adminContent.registerPage.fields.city.loadingMessage
      : citiesState.status === 'error'
        ? adminContent.registerPage.fields.city.errorMessage
        : citiesState.options.length === 0
          ? adminContent.registerPage.fields.city.emptyMessage
          : adminContent.registerPage.fields.city.placeholder;
  const cityHelpText =
    !errors.cityId && citiesState.status === 'error' && citiesState.error
      ? citiesState.error
      : undefined;
  const localityPlaceholder = !values.cityId
    ? adminContent.registerPage.fields.mainLocality.placeholderWithoutCity
    : localitiesState.status === 'loading'
      ? adminContent.registerPage.fields.mainLocality.loadingMessage
      : localitiesState.status === 'error'
        ? adminContent.registerPage.fields.mainLocality.errorMessage
        : localitiesState.options.length === 0
          ? adminContent.registerPage.fields.mainLocality.emptyMessage
          : adminContent.registerPage.fields.mainLocality.placeholder;
  const localityHelpText =
    !errors.mainLocalityId &&
    values.cityId &&
    localitiesState.status === 'error' &&
    localitiesState.error
      ? localitiesState.error
      : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5 overflow-hidden sm:gap-4">
      <Seo
        description={adminContent.registerPage.meta.description}
        noIndex
        title={adminContent.registerPage.meta.title}
      />
      <AdminPageHeader
        action={
          <Link
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-4 py-3 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
            to={ROUTES.adminUniversities}
          >
            <ArrowLeft aria-hidden="true" className="h-4.5 w-4.5" />
            <span>{adminContent.registerPage.backLabel}</span>
          </Link>
        }
        actionClassName="mx-auto sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2"
        className="relative items-center gap-2.5 sm:min-h-[3.5rem] sm:justify-center"
        description={adminContent.registerPage.description}
        headingAlign="center"
        titleClassName="mx-auto whitespace-nowrap text-center text-[clamp(1.25rem,6vw,1.85rem)] leading-none sm:text-center sm:text-[2.1rem]"
        title={adminContent.registerPage.title}
      />
      {errorMessage ? (
        <div
          className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}
      <AdminPanelCard
        className="flex min-h-0 flex-1 flex-col"
        panelClassName="bg-slate-50"
        shellPaddingClassName="p-[0.18rem] sm:p-[0.25rem]"
      >
        <form
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          noValidate
          onSubmit={handleSubmit}
        >
          <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-2.5 sm:px-5 sm:py-4 lg:px-6">
            <div className="space-y-4 pb-3 sm:space-y-5 sm:pb-4">
              <section className="space-y-4">
                <div>
                  <h3 className="text-center text-[0.72rem] font-bold uppercase tracking-[0.2em] text-primary sm:text-left">
                    {adminContent.registerPage.institutionSectionTitle}
                  </h3>
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className={formFieldWrapperClassName}>
                    <label
                      className={formFieldLabelClassName}
                      htmlFor="register-university-name"
                    >
                      {adminContent.registerPage.fields.name.label}
                    </label>
                    <div className="relative">
                      <Building2
                        aria-hidden="true"
                        className={formFieldIconClassName}
                      />
                      <input
                        ref={nameRef}
                        aria-describedby={
                          errors.name
                            ? 'register-university-name-error'
                            : undefined
                        }
                        aria-invalid={Boolean(errors.name)}
                        className={classNames(
                          formFieldInputClassName,
                          errors.name
                            ? 'border-rose-300 focus-visible:border-rose-400 focus-visible:ring-rose-200/70'
                            : 'border-slate-200 focus-visible:border-primary',
                        )}
                        id="register-university-name"
                        name="name"
                        placeholder={
                          adminContent.registerPage.fields.name.placeholder
                        }
                        type="text"
                        value={values.name}
                        onBlur={() => handleFieldBlur('name')}
                        onChange={(event) =>
                          updateFieldValue('name', event.target.value)
                        }
                      />
                    </div>
                    {errors.name ? (
                      <p
                        className="text-sm text-rose-600"
                        id="register-university-name-error"
                      >
                        {errors.name}
                      </p>
                    ) : null}
                  </div>
                  <SelectField
                    disabled={
                      citiesState.status !== 'ready' ||
                      citiesState.options.length === 0
                    }
                    error={errors.cityId}
                    helpText={cityHelpText}
                    icon={MapPin}
                    id="register-university-city"
                    label={adminContent.registerPage.fields.city.label}
                    name="cityId"
                    options={citiesState.options}
                    placeholder={cityPlaceholder}
                    selectRef={cityRef}
                    value={values.cityId}
                    onBlur={() => handleFieldBlur('cityId')}
                    onChange={(value) => updateFieldValue('cityId', value)}
                  />
                  <SelectField
                    disabled={
                      !values.cityId ||
                      localitiesState.status !== 'ready' ||
                      localitiesState.options.length === 0
                    }
                    error={errors.mainLocalityId}
                    helpText={localityHelpText}
                    icon={MapPin}
                    id="register-university-locality"
                    label={adminContent.registerPage.fields.mainLocality.label}
                    name="mainLocalityId"
                    options={localitiesState.options}
                    placeholder={localityPlaceholder}
                    selectRef={mainLocalityRef}
                    value={values.mainLocalityId}
                    onBlur={() => handleFieldBlur('mainLocalityId')}
                    onChange={(value) =>
                      updateFieldValue('mainLocalityId', value)
                    }
                  />
                </div>
              </section>
              <section className="space-y-4 border-t border-slate-200/80 pt-5">
                <div>
                  <h3 className="text-center text-[0.72rem] font-bold uppercase tracking-[0.2em] text-primary sm:text-left">
                    {adminContent.registerPage.administratorSectionTitle}
                  </h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className={formFieldWrapperClassName}>
                    <label
                      className={formFieldLabelClassName}
                      htmlFor="register-university-admin-first-name"
                    >
                      {adminContent.registerPage.fields.adminFirstName.label}
                    </label>
                    <div className="relative">
                      <UserRound
                        aria-hidden="true"
                        className={formFieldIconClassName}
                      />
                      <input
                        ref={adminFirstNameRef}
                        aria-describedby={
                          errors.adminFirstName
                            ? 'register-university-admin-first-name-error'
                            : undefined
                        }
                        aria-invalid={Boolean(errors.adminFirstName)}
                        className={classNames(
                          formFieldInputClassName,
                          errors.adminFirstName
                            ? 'border-rose-300 focus-visible:border-rose-400 focus-visible:ring-rose-200/70'
                            : 'border-slate-200 focus-visible:border-primary',
                        )}
                        id="register-university-admin-first-name"
                        name="adminFirstName"
                        placeholder={
                          adminContent.registerPage.fields.adminFirstName
                            .placeholder
                        }
                        type="text"
                        value={values.adminFirstName}
                        onBlur={() => handleFieldBlur('adminFirstName')}
                        onChange={(event) =>
                          updateFieldValue('adminFirstName', event.target.value)
                        }
                      />
                    </div>
                    {errors.adminFirstName ? (
                      <p
                        className="text-sm text-rose-600"
                        id="register-university-admin-first-name-error"
                      >
                        {errors.adminFirstName}
                      </p>
                    ) : null}
                  </div>
                  <div className={formFieldWrapperClassName}>
                    <label
                      className={formFieldLabelClassName}
                      htmlFor="register-university-admin-last-name"
                    >
                      {adminContent.registerPage.fields.adminLastName.label}
                    </label>
                    <div className="relative">
                      <UserRound
                        aria-hidden="true"
                        className={formFieldIconClassName}
                      />
                      <input
                        ref={adminLastNameRef}
                        aria-describedby={
                          errors.adminLastName
                            ? 'register-university-admin-last-name-error'
                            : undefined
                        }
                        aria-invalid={Boolean(errors.adminLastName)}
                        className={classNames(
                          formFieldInputClassName,
                          errors.adminLastName
                            ? 'border-rose-300 focus-visible:border-rose-400 focus-visible:ring-rose-200/70'
                            : 'border-slate-200 focus-visible:border-primary',
                        )}
                        id="register-university-admin-last-name"
                        name="adminLastName"
                        placeholder={
                          adminContent.registerPage.fields.adminLastName
                            .placeholder
                        }
                        type="text"
                        value={values.adminLastName}
                        onBlur={() => handleFieldBlur('adminLastName')}
                        onChange={(event) =>
                          updateFieldValue('adminLastName', event.target.value)
                        }
                      />
                    </div>
                    {errors.adminLastName ? (
                      <p
                        className="text-sm text-rose-600"
                        id="register-university-admin-last-name-error"
                      >
                        {errors.adminLastName}
                      </p>
                    ) : null}
                  </div>
                  <div className={formFieldWrapperClassName}>
                    <label
                      className={formFieldLabelClassName}
                      htmlFor="register-university-admin-email"
                    >
                      {adminContent.registerPage.fields.adminEmail.label}
                    </label>
                    <div className="relative">
                      <Mail
                        aria-hidden="true"
                        className={formFieldIconClassName}
                      />
                      <input
                        ref={adminEmailRef}
                        aria-describedby={
                          errors.adminEmail
                            ? 'register-university-admin-email-error'
                            : undefined
                        }
                        aria-invalid={Boolean(errors.adminEmail)}
                        className={classNames(
                          formFieldInputClassName,
                          errors.adminEmail
                            ? 'border-rose-300 focus-visible:border-rose-400 focus-visible:ring-rose-200/70'
                            : 'border-slate-200 focus-visible:border-primary',
                        )}
                        id="register-university-admin-email"
                        name="adminEmail"
                        placeholder={
                          adminContent.registerPage.fields.adminEmail
                            .placeholder
                        }
                        type="email"
                        value={values.adminEmail}
                        onBlur={() => handleFieldBlur('adminEmail')}
                        onChange={(event) =>
                          updateFieldValue('adminEmail', event.target.value)
                        }
                      />
                    </div>
                    {errors.adminEmail ? (
                      <p
                        className="text-sm text-rose-600"
                        id="register-university-admin-email-error"
                      >
                        {errors.adminEmail}
                      </p>
                    ) : null}
                  </div>
                  <div className={formFieldWrapperClassName}>
                    <label
                      className={formFieldLabelClassName}
                      htmlFor="register-university-admin-phone"
                    >
                      {adminContent.registerPage.fields.adminPhone.label}
                    </label>
                    <div className="relative">
                      <Phone
                        aria-hidden="true"
                        className={formFieldIconClassName}
                      />
                      <input
                        ref={adminPhoneRef}
                        aria-invalid={Boolean(errors.adminPhone)}
                        className={classNames(
                          formFieldInputClassName,
                          'border-slate-200 focus-visible:border-primary',
                        )}
                        id="register-university-admin-phone"
                        name="adminPhone"
                        placeholder={
                          adminContent.registerPage.fields.adminPhone
                            .placeholder
                        }
                        type="tel"
                        value={values.adminPhone}
                        onBlur={() => handleFieldBlur('adminPhone')}
                        onChange={(event) =>
                          updateFieldValue('adminPhone', event.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              </section>
              <div className="flex justify-center border-t border-slate-200/80 pt-4">
                <button
                  className="inline-flex items-center justify-center rounded-2xl bg-brand-gradient px-5 py-2.75 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSubmitting || isLoading}
                  type="submit"
                >
                  {isSubmitting
                    ? 'Registrando...'
                    : adminContent.registerPage.submitLabel}
                </button>
              </div>
            </div>
          </div>
        </form>
      </AdminPanelCard>
    </div>
  );
}
