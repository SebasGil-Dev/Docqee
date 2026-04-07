import { ArrowLeft, ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AuthCard } from '@/components/auth/AuthCard';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordField } from '@/components/auth/PasswordField';
import { Seo } from '@/components/ui/Seo';
import { ROUTES } from '@/constants/routes';
import { authContent } from '@/content/authContent';
import type {
  AsyncCatalogState,
  CityOption,
  DocumentTypeOption,
  LocalityOption,
  NormalizedPatientRegisterPayload,
  PatientRegisterCatalogDataSource,
  PatientSex,
  RegisterFormErrors,
  RegisterFormField,
  RegisterFormState,
  RegisterFormValues,
  RegisterPasswordRuleKey,
} from '@/content/types';
import { classNames } from '@/lib/classNames';
import { IS_TEST_MODE } from '@/lib/apiClient';
import { registerPatient as registerPatientRequest } from '@/lib/authApi';
import { patientRegisterCatalogDataSource } from '@/lib/patientRegisterCatalogDataSource';
import {
  persistPendingVerificationEmail,
  persistVerifyEmailDebugCode,
} from '@/lib/verifyEmailService';

type RegisterPageProps = {
  catalogDataSource?: PatientRegisterCatalogDataSource;
  today?: Date;
};

type FieldBaseProps = {
  disabled?: boolean;
  error?: string | undefined;
  helpText?: string | undefined;
  id: string;
  label: string;
  onBlur?: (() => void) | undefined;
};

const initialValues: RegisterFormValues = {
  acceptPrivacyPolicy: false,
  acceptTerms: false,
  birthDate: '',
  cityId: '',
  confirmPassword: '',
  documentNumber: '',
  documentTypeId: '',
  email: '',
  firstName: '',
  lastName: '',
  localityId: '',
  password: '',
  phone: '',
  sex: '',
  tutorDocumentNumber: '',
  tutorDocumentTypeId: '',
  tutorEmail: '',
  tutorFirstName: '',
  tutorLastName: '',
  tutorPhone: '',
};

const tutorFieldNames: RegisterFormField[] = [
  'tutorFirstName',
  'tutorLastName',
  'tutorDocumentTypeId',
  'tutorDocumentNumber',
  'tutorEmail',
  'tutorPhone',
];

const fieldIds: Record<RegisterFormField, string> = {
  acceptPrivacyPolicy: 'register-accept-privacy-policy',
  acceptTerms: 'register-accept-terms',
  birthDate: 'register-birth-date',
  cityId: 'register-city',
  confirmPassword: 'register-confirm-password',
  documentNumber: 'register-document-number',
  documentTypeId: 'register-document-type',
  email: 'register-email',
  firstName: 'register-first-name',
  lastName: 'register-last-name',
  localityId: 'register-locality',
  password: 'register-password',
  phone: 'register-phone',
  sex: 'register-sex',
  tutorDocumentNumber: 'register-tutor-document-number',
  tutorDocumentTypeId: 'register-tutor-document-type',
  tutorEmail: 'register-tutor-email',
  tutorFirstName: 'register-tutor-first-name',
  tutorLastName: 'register-tutor-last-name',
  tutorPhone: 'register-tutor-phone',
};

const passwordRuleOrder: RegisterPasswordRuleKey[] = [
  'minLength',
  'uppercase',
  'lowercase',
  'number',
  'special',
];

const MOBILE_REGISTER_BREAKPOINT = 768;

type MobileRegisterStepId = 'personal' | 'profile-location' | 'tutor' | 'account';

type MobileRegisterStepConfig = {
  description?: string | undefined;
  fields: RegisterFormField[];
  id: MobileRegisterStepId;
  shortLabel: string;
  title: string;
};

function getIsMobileRegisterView(breakpoint: number) {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.innerWidth < breakpoint;
}

function useIsMobileRegisterView(breakpoint = MOBILE_REGISTER_BREAKPOINT) {
  const [isMobileView, setIsMobileView] = useState(() => getIsMobileRegisterView(breakpoint));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleViewportChange = () => {
      setIsMobileView(getIsMobileRegisterView(breakpoint));
    };

    handleViewportChange();
    window.addEventListener('resize', handleViewportChange);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [breakpoint]);

  return isMobileView;
}

function TextField({
  autoComplete,
  disabled = false,
  error,
  helpText,
  id,
  inputMode,
  label,
  name,
  onBlur,
  onChange,
  placeholder,
  type = 'text',
  value,
}: FieldBaseProps & {
  autoComplete?: string;
  inputMode?:
    | 'decimal'
    | 'email'
    | 'none'
    | 'numeric'
    | 'search'
    | 'tel'
    | 'text'
    | 'url';
  name: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: 'date' | 'email' | 'tel' | 'text';
  value: string;
}) {
  const message = error ?? helpText;
  const messageId = message ? `${id}-message` : undefined;

  return (
    <div className="space-y-1.5">
      <label
        className="block px-1 text-[11px] font-bold uppercase tracking-[0.22em] text-ink-muted"
        htmlFor={id}
      >
        {label}
      </label>
      <input
        aria-describedby={messageId}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        className={classNames(
          'w-full rounded-xl border border-slate-200/80 bg-surface-high px-4 py-3 text-sm text-ink placeholder:text-ghost/75 transition-all duration-300',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/12',
          disabled
            ? 'cursor-not-allowed bg-slate-100 text-ghost'
            : 'focus-visible:border-primary/35 focus-visible:bg-surface-card',
          error ? 'border-rose-300 ring-2 ring-rose-500/15 focus-visible:ring-rose-500/25' : '',
        )}
        disabled={disabled}
        id={id}
        inputMode={inputMode}
        name={name}
        placeholder={placeholder}
        type={type}
        value={value}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
      />
      {message ? (
        <p
          className={classNames(
            'px-1 text-[11px] font-medium sm:text-xs',
            error ? 'text-rose-700' : 'text-ink-muted',
          )}
          id={messageId}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

function SelectField({
  disabled = false,
  error,
  helpText,
  id,
  label,
  name,
  onBlur,
  onChange,
  options,
  placeholder,
  value,
}: FieldBaseProps & {
  name: string;
  onChange: (value: string) => void;
  options: {
    id: string;
    label: string;
  }[];
  placeholder: string;
  value: string;
}) {
  const message = error ?? helpText;
  const messageId = message ? `${id}-message` : undefined;

  return (
    <div className="space-y-1.5">
      <label
        className="block px-1 text-[11px] font-bold uppercase tracking-[0.22em] text-ink-muted"
        htmlFor={id}
      >
        {label}
      </label>
      <select
        aria-describedby={messageId}
        aria-invalid={Boolean(error)}
        className={classNames(
          'w-full rounded-xl border border-slate-200/80 bg-surface-high px-4 py-3.5 text-base leading-6 text-ink transition-all duration-300 sm:py-3 sm:text-sm',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/12',
          disabled
            ? 'cursor-not-allowed bg-slate-100 text-ghost'
            : 'focus-visible:border-primary/35 focus-visible:bg-surface-card',
          error ? 'border-rose-300 ring-2 ring-rose-500/15 focus-visible:ring-rose-500/25' : '',
        )}
        disabled={disabled}
        id={id}
        name={name}
        value={value}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
      >
        <option disabled value="">
          {placeholder}
        </option>
        {options.map((option) => (
          <option
            className="text-base"
            key={option.id}
            value={option.id}
          >
            {option.label}
          </option>
        ))}
      </select>
      {message ? (
        <p
          className={classNames(
            'px-1 text-[11px] font-medium sm:text-xs',
            error ? 'text-rose-700' : 'text-ink-muted',
          )}
          id={messageId}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

function CheckboxField({
  checked,
  error,
  id,
  label,
  onBlur,
  onChange,
}: {
  checked: boolean;
  error?: string | undefined;
  id: string;
  label: string;
  onBlur?: (() => void) | undefined;
  onChange: (value: boolean) => void;
}) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="space-y-2">
      <label
        className={classNames(
          'flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-[13px] transition-colors duration-300 sm:text-sm',
          error
            ? 'border-rose-300 bg-rose-50/80 text-rose-900'
            : 'border-slate-200/80 bg-white/75 text-ink hover:border-primary/25',
        )}
        htmlFor={id}
      >
        <input
          aria-describedby={errorId}
          aria-invalid={Boolean(error)}
          checked={checked}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
          id={id}
          type="checkbox"
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="leading-5">{label}</span>
      </label>
      {error ? (
        <p
          className="px-1 text-[11px] font-medium text-rose-700 sm:text-xs"
          id={errorId}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SectionHeader({
  description,
  title,
}: {
  description?: string | undefined;
  title: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-primary">{title}</p>
      {description ? <p className="text-sm leading-6 text-ink-muted">{description}</p> : null}
    </div>
  );
}

function PasswordRequirementsList({
  password,
}: {
  password: string;
}) {
  const requirements = authContent.register.password.requirements;
  const requirementStatus = getPasswordRequirementStatus(password);

  return (
    <ul
      aria-label="Requisitos de contrase\u00F1a"
      className="grid gap-2 rounded-2xl border border-slate-200/80 bg-white/75 p-4 text-sm sm:grid-cols-2"
    >
      {requirements.map((requirement) => {
        const isMet = requirementStatus[requirement.key];

        return (
          <li
            key={requirement.key}
            className={classNames(
              'flex items-start gap-2.5 leading-6',
              isMet ? 'text-emerald-700' : 'text-ink-muted',
            )}
          >
            {isMet ? (
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0"
              />
            ) : (
              <Circle
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0"
              />
            )}
            <span>{requirement.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

function resolveCatalogResult<T>(result: Promise<T[]> | T[]) {
  return Promise.resolve(result);
}

function parseDateParts(value: string) {
  const [yearString, monthString, dayString] = value.split('-');
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return { day, month, year };
}

function isFutureBirthDate(value: string, today: Date) {
  const parts = parseDateParts(value);

  if (!parts) {
    return false;
  }

  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  if (parts.year !== todayYear) {
    return parts.year > todayYear;
  }

  if (parts.month !== todayMonth) {
    return parts.month > todayMonth;
  }

  return parts.day > todayDay;
}

function getAgeFromBirthDate(value: string, today: Date) {
  const parts = parseDateParts(value);

  if (!parts) {
    return null;
  }

  let age = today.getFullYear() - parts.year;
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  if (todayMonth < parts.month || (todayMonth === parts.month && todayDay < parts.day)) {
    age -= 1;
  }

  return age;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function shouldShowTutorSection(birthDate: string, today: Date) {
  const age = getAgeFromBirthDate(birthDate, today);
  return age !== null && age < 18;
}

function getPasswordRequirementStatus(password: string): Record<RegisterPasswordRuleKey, boolean> {
  return {
    lowercase: /[a-z]/.test(password),
    minLength: password.length >= 8,
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    uppercase: /[A-Z]/.test(password),
  };
}

function meetsAllPasswordRequirements(password: string) {
  const status = getPasswordRequirementStatus(password);
  return passwordRuleOrder.every((ruleKey) => status[ruleKey]);
}

function validateRequiredText(value: string, message: string) {
  return value.trim().length === 0 ? message : undefined;
}

function validateRequiredSelection(value: string, message: string) {
  return value.trim().length === 0 ? message : undefined;
}

function validateEmail(value: string, requiredMessage: string, invalidMessage: string) {
  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return requiredMessage;
  }

  if (!isValidEmail(trimmedValue)) {
    return invalidMessage;
  }

  return undefined;
}

function validatePassword(value: string) {
  const content = authContent.register.password;

  if (value.length === 0) {
    return content.requiredMessage;
  }

  if (!meetsAllPasswordRequirements(value)) {
    return content.requirementsMessage;
  }

  return undefined;
}

function validateRegisterForm(values: RegisterFormValues, today: Date): RegisterFormErrors {
  const content = authContent.register;
  const errors: RegisterFormErrors = {};
  const showTutorSection = shouldShowTutorSection(values.birthDate, today);

  const firstNameError = validateRequiredText(
    values.firstName,
    content.patientFields.firstName.requiredMessage,
  );
  const lastNameError = validateRequiredText(
    values.lastName,
    content.patientFields.lastName.requiredMessage,
  );
  const documentTypeError = validateRequiredSelection(
    values.documentTypeId,
    content.patientFields.documentType.requiredMessage,
  );
  const documentNumberError = validateRequiredText(
    values.documentNumber,
    content.patientFields.documentNumber.requiredMessage,
  );
  const birthDateError = (() => {
    if (values.birthDate.length === 0) {
      return content.patientFields.birthDate.requiredMessage;
    }

    if (isFutureBirthDate(values.birthDate, today)) {
      return content.patientFields.birthDate.futureDateMessage;
    }

    return undefined;
  })();
  const cityError = validateRequiredSelection(values.cityId, content.patientFields.city.requiredMessage);
  const localityError = validateRequiredSelection(
    values.localityId,
    content.patientFields.locality.requiredMessage,
  );
  const emailError = validateEmail(
    values.email,
    content.patientFields.email.requiredMessage,
    content.patientFields.email.invalidMessage,
  );
  const phoneError = validateRequiredText(values.phone, content.patientFields.phone.requiredMessage);
  const passwordError = validatePassword(values.password);
  const confirmPasswordError = (() => {
    if (values.confirmPassword.length === 0) {
      return content.password.confirmRequiredMessage;
    }

    if (values.confirmPassword !== values.password) {
      return content.password.confirmMismatchMessage;
    }

    return undefined;
  })();

  if (firstNameError) {
    errors.firstName = firstNameError;
  }

  if (lastNameError) {
    errors.lastName = lastNameError;
  }

  if (documentTypeError) {
    errors.documentTypeId = documentTypeError;
  }

  if (documentNumberError) {
    errors.documentNumber = documentNumberError;
  }

  if (!values.sex) {
    errors.sex = content.patientFields.sex.requiredMessage;
  }

  if (birthDateError) {
    errors.birthDate = birthDateError;
  }

  if (cityError) {
    errors.cityId = cityError;
  }

  if (localityError) {
    errors.localityId = localityError;
  }

  if (emailError) {
    errors.email = emailError;
  }

  if (phoneError) {
    errors.phone = phoneError;
  }

  if (passwordError) {
    errors.password = passwordError;
  }

  if (confirmPasswordError) {
    errors.confirmPassword = confirmPasswordError;
  }

  if (!values.acceptTerms) {
    errors.acceptTerms = content.termsConsent.requiredMessage;
  }

  if (!values.acceptPrivacyPolicy) {
    errors.acceptPrivacyPolicy = content.privacyConsent.requiredMessage;
  }

  if (showTutorSection) {
    const tutorFirstNameError = validateRequiredText(
      values.tutorFirstName,
      content.tutorFields.firstName.requiredMessage,
    );
    const tutorLastNameError = validateRequiredText(
      values.tutorLastName,
      content.tutorFields.lastName.requiredMessage,
    );
    const tutorDocumentTypeError = validateRequiredSelection(
      values.tutorDocumentTypeId,
      content.tutorFields.documentType.requiredMessage,
    );
    const tutorDocumentNumberError = validateRequiredText(
      values.tutorDocumentNumber,
      content.tutorFields.documentNumber.requiredMessage,
    );
    const tutorEmailError = validateEmail(
      values.tutorEmail,
      content.tutorFields.email.requiredMessage,
      content.tutorFields.email.invalidMessage,
    );
    const tutorPhoneError = validateRequiredText(
      values.tutorPhone,
      content.tutorFields.phone.requiredMessage,
    );

    if (tutorFirstNameError) {
      errors.tutorFirstName = tutorFirstNameError;
    }

    if (tutorLastNameError) {
      errors.tutorLastName = tutorLastNameError;
    }

    if (tutorDocumentTypeError) {
      errors.tutorDocumentTypeId = tutorDocumentTypeError;
    }

    if (tutorDocumentNumberError) {
      errors.tutorDocumentNumber = tutorDocumentNumberError;
    }

    if (tutorEmailError) {
      errors.tutorEmail = tutorEmailError;
    }

    if (tutorPhoneError) {
      errors.tutorPhone = tutorPhoneError;
    }
  }

  return errors;
}

function normalizeRegisterPayload(
  values: RegisterFormValues,
  includeTutor: boolean,
): NormalizedPatientRegisterPayload {
  return {
    consents: {
      acceptPrivacyPolicy: values.acceptPrivacyPolicy,
      acceptTerms: values.acceptTerms,
    },
    patient: {
      birthDate: values.birthDate,
      cityId: values.cityId,
      documentNumber: values.documentNumber.trim(),
      documentTypeId: values.documentTypeId,
      email: values.email.trim(),
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      localityId: values.localityId,
      password: values.password,
      phone: values.phone.trim(),
      sex: values.sex as PatientSex,
    },
    tutor: includeTutor
      ? {
          documentNumber: values.tutorDocumentNumber.trim(),
          documentTypeId: values.tutorDocumentTypeId,
          email: values.tutorEmail.trim(),
          firstName: values.tutorFirstName.trim(),
          lastName: values.tutorLastName.trim(),
          phone: values.tutorPhone.trim(),
        }
      : null,
  };
}

function createEmptyCatalogState<T>(status: AsyncCatalogState<T>['status']): AsyncCatalogState<T> {
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

function getDependentFields(field: RegisterFormField) {
  switch (field) {
    case 'cityId':
      return ['localityId'] satisfies RegisterFormField[];
    case 'password':
      return ['confirmPassword'] satisfies RegisterFormField[];
    default:
      return [] as RegisterFormField[];
  }
}

export function RegisterPage({
  catalogDataSource = patientRegisterCatalogDataSource,
  today = new Date(),
}: RegisterPageProps) {
  const currentDate = useRef(today).current;
  const [formState, setFormState] = useState<RegisterFormState>({
    errors: {},
    values: initialValues,
  });
  const [documentTypesState, setDocumentTypesState] = useState<AsyncCatalogState<DocumentTypeOption>>(
    () => createInitialCatalogState(catalogDataSource.getDocumentTypes(), 'loading'),
  );
  const [citiesState, setCitiesState] = useState<AsyncCatalogState<CityOption>>(
    () => createInitialCatalogState(catalogDataSource.getCities(), 'loading'),
  );
  const [localitiesState, setLocalitiesState] = useState<AsyncCatalogState<LocalityOption>>(
    createEmptyCatalogState('idle'),
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentMobileStepIndex, setCurrentMobileStepIndex] = useState(0);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const content = authContent.register;
  const isMobileView = useIsMobileRegisterView();
  const showTutor = shouldShowTutorSection(formState.values.birthDate, currentDate);

  useEffect(() => {
    let isCancelled = false;

    async function loadInitialCatalogs() {
      setDocumentTypesState(createInitialCatalogState(catalogDataSource.getDocumentTypes(), 'loading'));
      setCitiesState(createInitialCatalogState(catalogDataSource.getCities(), 'loading'));

      try {
        const [documentTypes, cities] = await Promise.all([
          resolveCatalogResult(
            catalogDataSource.loadDocumentTypes
              ? catalogDataSource.loadDocumentTypes()
              : catalogDataSource.getDocumentTypes(),
          ),
          resolveCatalogResult(catalogDataSource.loadCities ? catalogDataSource.loadCities() : catalogDataSource.getCities()),
        ]);

        if (isCancelled) {
          return;
        }

        setDocumentTypesState({
          error: null,
          options: documentTypes,
          status: 'ready',
        });
        setCitiesState({
          error: null,
          options: cities,
          status: 'ready',
        });
      } catch {
        if (isCancelled) {
          return;
        }

        setDocumentTypesState({
          error: content.patientFields.documentType.errorMessage,
          options: [],
          status: 'error',
        });
        setCitiesState({
          error: content.patientFields.city.errorMessage,
          options: [],
          status: 'error',
        });
      }
    }

    void loadInitialCatalogs();

    return () => {
      isCancelled = true;
    };
  }, [
    catalogDataSource,
    content.patientFields.city.errorMessage,
    content.patientFields.documentType.errorMessage,
  ]);

  useEffect(() => {
    if (!formState.values.cityId) {
      setLocalitiesState(createEmptyCatalogState('idle'));
      return;
    }

    let isCancelled = false;

    async function loadLocalities() {
      setLocalitiesState(createEmptyCatalogState('loading'));

      try {
        const localities = await resolveCatalogResult(
          catalogDataSource.loadLocalitiesByCity ? catalogDataSource.loadLocalitiesByCity(formState.values.cityId) : catalogDataSource.getLocalitiesByCity(formState.values.cityId),
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
          error: content.patientFields.locality.errorMessage,
          options: [],
          status: 'error',
        });
      }
    }

    void loadLocalities();

    return () => {
      isCancelled = true;
    };
  }, [
    catalogDataSource,
    content.patientFields.locality.errorMessage,
    formState.values.cityId,
  ]);

  const updateFieldValue = <K extends RegisterFormField>(
    field: K,
    value: RegisterFormValues[K],
  ) => {
    setFormState((currentState) => {
      const nextValues: RegisterFormValues =
        field === 'cityId'
          ? {
              ...currentState.values,
              cityId: value as RegisterFormValues['cityId'],
              localityId: '',
            }
          : {
              ...currentState.values,
              [field]: value,
            };
      const nextErrors = { ...currentState.errors };
      const validationErrors = validateRegisterForm(nextValues, currentDate);
      const fieldsToRefresh = [field, ...getDependentFields(field)];

      fieldsToRefresh.forEach((fieldName) => {
        if (validationErrors[fieldName]) {
          nextErrors[fieldName] = validationErrors[fieldName];
        } else {
          delete nextErrors[fieldName];
        }
      });

      if (field === 'birthDate' && !shouldShowTutorSection(nextValues.birthDate, currentDate)) {
        tutorFieldNames.forEach((fieldName) => {
          delete nextErrors[fieldName];
        });
      }

      return {
        errors: nextErrors,
        values: nextValues,
      };
    });

    setSubmissionError(null);
  };

  const handleFieldBlur = (field: RegisterFormField) => {
    setFormState((currentState) => {
      const nextErrors = { ...currentState.errors };
      const validationErrors = validateRegisterForm(currentState.values, currentDate);
      const fieldsToRefresh = [field, ...getDependentFields(field)];

      fieldsToRefresh.forEach((fieldName) => {
        if (validationErrors[fieldName]) {
          nextErrors[fieldName] = validationErrors[fieldName];
        } else {
          delete nextErrors[fieldName];
        }
      });

      if (
        field === 'birthDate' &&
        !shouldShowTutorSection(currentState.values.birthDate, currentDate)
      ) {
        tutorFieldNames.forEach((fieldName) => {
          delete nextErrors[fieldName];
        });
      }

      return {
        ...currentState,
        errors: nextErrors,
      };
    });

    setSubmissionError(null);
  };

  const focusField = (field: RegisterFormField) => {
    if (field === 'password') {
      passwordInputRef.current?.focus();
      return;
    }

    if (field === 'confirmPassword') {
      confirmPasswordInputRef.current?.focus();
      return;
    }

    const target = document.getElementById(fieldIds[field]);

    if (target instanceof HTMLElement) {
      target.focus();
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    void (async () => {
      const validationErrors = validateRegisterForm(formState.values, currentDate);

      setFormState((currentState) => ({
        ...currentState,
        errors: validationErrors,
      }));
      setSubmissionError(null);

      const fieldOrder: RegisterFormField[] = [
        'firstName',
        'lastName',
        'documentTypeId',
        'documentNumber',
        'sex',
        'birthDate',
        'cityId',
        'localityId',
        'email',
        'phone',
        'password',
        'confirmPassword',
        ...(showTutor ? tutorFieldNames : []),
        'acceptTerms',
        'acceptPrivacyPolicy',
      ];

      const firstInvalidField = fieldOrder.find((fieldName) => Boolean(validationErrors[fieldName]));

      if (firstInvalidField) {
        focusField(firstInvalidField);
        return;
      }

      const normalizedPayload = normalizeRegisterPayload(formState.values, showTutor);

      if (IS_TEST_MODE) {
        persistPendingVerificationEmail(normalizedPayload.patient.email);
        navigate(ROUTES.verifyEmail, {
          state: { email: normalizedPayload.patient.email },
        });
        return;
      }

      setIsSubmitting(true);

      try {
        const result = await registerPatientRequest(normalizedPayload);
        const nextEmail = result.email ?? normalizedPayload.patient.email;

        persistPendingVerificationEmail(nextEmail);
        if (typeof result.debugCode === 'string') {
          persistVerifyEmailDebugCode(result.debugCode);
        }

        navigate(ROUTES.verifyEmail, {
          state: { email: nextEmail },
        });
      } catch (error) {
        setSubmissionError(
          error instanceof Error ? error.message : 'No pudimos completar el registro.',
        );
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const documentTypePlaceholder =
    documentTypesState.status === 'loading'
      ? content.patientFields.documentType.loadingMessage
      : documentTypesState.status === 'error'
        ? content.patientFields.documentType.errorMessage
        : documentTypesState.options.length === 0
          ? content.patientFields.documentType.emptyMessage
          : content.patientFields.documentType.placeholder;
  const documentTypeHelpText =
    !formState.errors.documentTypeId &&
    documentTypesState.status === 'error' &&
    documentTypesState.error
      ? documentTypesState.error
      : undefined;
  const tutorDocumentTypeOptions = documentTypesState.options.filter((option) => option.code === 'CC');
  const tutorDocumentTypePlaceholder =
    documentTypesState.status === 'loading'
      ? content.tutorFields.documentType.loadingMessage
      : documentTypesState.status === 'error'
        ? content.tutorFields.documentType.errorMessage
        : tutorDocumentTypeOptions.length === 0
          ? content.tutorFields.documentType.emptyMessage
          : content.tutorFields.documentType.placeholder;
  const tutorDocumentTypeHelpText =
    !formState.errors.tutorDocumentTypeId &&
    documentTypesState.status === 'error' &&
    documentTypesState.error
      ? documentTypesState.error
      : undefined;
  const cityPlaceholder =
    citiesState.status === 'loading'
      ? content.patientFields.city.loadingMessage
      : citiesState.status === 'error'
        ? content.patientFields.city.errorMessage
        : citiesState.options.length === 0
          ? content.patientFields.city.emptyMessage
          : content.patientFields.city.placeholder;
  const cityHelpText =
    !formState.errors.cityId && citiesState.status === 'error' && citiesState.error
      ? citiesState.error
      : undefined;
  const localityPlaceholder = !formState.values.cityId
    ? content.patientFields.locality.placeholderWithoutCity
    : localitiesState.status === 'loading'
      ? content.patientFields.locality.loadingMessage
      : localitiesState.status === 'error'
        ? content.patientFields.locality.errorMessage
        : localitiesState.options.length === 0
          ? content.patientFields.locality.emptyMessage
          : content.patientFields.locality.placeholder;
  const localityHelpText =
    !formState.errors.localityId &&
    formState.values.cityId &&
    localitiesState.status === 'error' &&
    localitiesState.error
      ? localitiesState.error
      : undefined;

  const identityFields = (
    <div className="grid gap-4 md:grid-cols-2">
      <TextField
        autoComplete="given-name"
        error={formState.errors.firstName}
        id={fieldIds.firstName}
        label={content.patientFields.firstName.label}
        name="firstName"
        placeholder={content.patientFields.firstName.placeholder}
        value={formState.values.firstName}
        onBlur={() => handleFieldBlur('firstName')}
        onChange={(value) => updateFieldValue('firstName', value)}
      />
      <TextField
        autoComplete="family-name"
        error={formState.errors.lastName}
        id={fieldIds.lastName}
        label={content.patientFields.lastName.label}
        name="lastName"
        placeholder={content.patientFields.lastName.placeholder}
        value={formState.values.lastName}
        onBlur={() => handleFieldBlur('lastName')}
        onChange={(value) => updateFieldValue('lastName', value)}
      />
      <SelectField
        disabled={
          documentTypesState.status !== 'ready' || documentTypesState.options.length === 0
        }
        error={formState.errors.documentTypeId}
        helpText={documentTypeHelpText}
        id={fieldIds.documentTypeId}
        label={content.patientFields.documentType.label}
        name="documentTypeId"
        options={documentTypesState.options}
        placeholder={documentTypePlaceholder}
        value={formState.values.documentTypeId}
        onBlur={() => handleFieldBlur('documentTypeId')}
        onChange={(value) => updateFieldValue('documentTypeId', value)}
      />
      <TextField
        autoComplete="off"
        error={formState.errors.documentNumber}
        id={fieldIds.documentNumber}
        inputMode="numeric"
        label={content.patientFields.documentNumber.label}
        name="documentNumber"
        placeholder={content.patientFields.documentNumber.placeholder}
        value={formState.values.documentNumber}
        onBlur={() => handleFieldBlur('documentNumber')}
        onChange={(value) => updateFieldValue('documentNumber', value)}
      />
    </div>
  );

  const profileFields = (
    <div className="grid gap-4 md:grid-cols-2">
      <SelectField
        error={formState.errors.sex}
        id={fieldIds.sex}
        label={content.patientFields.sex.label}
        name="sex"
        options={content.patientFields.sex.options.map((option) => ({
          id: option,
          label: option,
        }))}
        placeholder="Selecciona una opción"
        value={formState.values.sex}
        onBlur={() => handleFieldBlur('sex')}
        onChange={(value) => updateFieldValue('sex', value as PatientSex)}
      />
      <TextField
        error={formState.errors.birthDate}
        id={fieldIds.birthDate}
        label={content.patientFields.birthDate.label}
        name="birthDate"
        placeholder={content.patientFields.birthDate.placeholder}
        type="date"
        value={formState.values.birthDate}
        onBlur={() => handleFieldBlur('birthDate')}
        onChange={(value) => updateFieldValue('birthDate', value)}
      />
    </div>
  );

  const locationFields = (
    <div className="grid gap-4 md:grid-cols-2">
      <SelectField
        disabled={citiesState.status !== 'ready' || citiesState.options.length === 0}
        error={formState.errors.cityId}
        helpText={cityHelpText}
        id={fieldIds.cityId}
        label={content.patientFields.city.label}
        name="cityId"
        options={citiesState.options}
        placeholder={cityPlaceholder}
        value={formState.values.cityId}
        onBlur={() => handleFieldBlur('cityId')}
        onChange={(value) => updateFieldValue('cityId', value)}
      />
      <SelectField
        disabled={
          !formState.values.cityId ||
          localitiesState.status !== 'ready' ||
          localitiesState.options.length === 0
        }
        error={formState.errors.localityId}
        helpText={localityHelpText}
        id={fieldIds.localityId}
        label={content.patientFields.locality.label}
        name="localityId"
        options={localitiesState.options}
        placeholder={localityPlaceholder}
        value={formState.values.localityId}
        onBlur={() => handleFieldBlur('localityId')}
        onChange={(value) => updateFieldValue('localityId', value)}
      />
    </div>
  );

  const accountFields = (
    <div className="grid gap-4 md:grid-cols-2">
      <TextField
        autoComplete="email"
        error={formState.errors.email}
        id={fieldIds.email}
        label={content.patientFields.email.label}
        name="email"
        placeholder={content.patientFields.email.placeholder}
        type="email"
        value={formState.values.email}
        onBlur={() => handleFieldBlur('email')}
        onChange={(value) => updateFieldValue('email', value)}
      />
      <TextField
        autoComplete="tel"
        error={formState.errors.phone}
        id={fieldIds.phone}
        inputMode="tel"
        label={content.patientFields.phone.label}
        name="phone"
        placeholder={content.patientFields.phone.placeholder}
        type="tel"
        value={formState.values.phone}
        onBlur={() => handleFieldBlur('phone')}
        onChange={(value) => updateFieldValue('phone', value)}
      />
      <div className="space-y-4 md:col-span-2">
        <PasswordField
          autoComplete="new-password"
          error={formState.errors.password}
          hidePasswordLabel={content.password.hidePasswordLabel}
          id={fieldIds.password}
          inputRef={passwordInputRef}
          label={content.password.label}
          name="password"
          placeholder={content.password.placeholder}
          showPassword={showPassword}
          showPasswordLabel={content.password.showPasswordLabel}
          value={formState.values.password}
          onBlur={() => handleFieldBlur('password')}
          onChange={(value) => updateFieldValue('password', value)}
          onToggleVisibility={() => setShowPassword((currentState) => !currentState)}
        />
        <PasswordRequirementsList password={formState.values.password} />
      </div>
      <div className="md:col-span-2">
        <PasswordField
          autoComplete="new-password"
          error={formState.errors.confirmPassword}
          hidePasswordLabel={content.password.hidePasswordLabel}
          id={fieldIds.confirmPassword}
          inputRef={confirmPasswordInputRef}
          label={content.password.confirmLabel}
          name="confirmPassword"
          placeholder={content.password.confirmPlaceholder}
          showPassword={showConfirmPassword}
          showPasswordLabel={content.password.showPasswordLabel}
          value={formState.values.confirmPassword}
          onBlur={() => handleFieldBlur('confirmPassword')}
          onChange={(value) => updateFieldValue('confirmPassword', value)}
          onToggleVisibility={() => setShowConfirmPassword((currentState) => !currentState)}
        />
      </div>
    </div>
  );

  const tutorFields = (
    <div className="grid gap-4 md:grid-cols-2">
      <TextField
        autoComplete="given-name"
        error={formState.errors.tutorFirstName}
        id={fieldIds.tutorFirstName}
        label={content.tutorFields.firstName.label}
        name="tutorFirstName"
        placeholder={content.tutorFields.firstName.placeholder}
        value={formState.values.tutorFirstName}
        onBlur={() => handleFieldBlur('tutorFirstName')}
        onChange={(value) => updateFieldValue('tutorFirstName', value)}
      />
      <TextField
        autoComplete="family-name"
        error={formState.errors.tutorLastName}
        id={fieldIds.tutorLastName}
        label={content.tutorFields.lastName.label}
        name="tutorLastName"
        placeholder={content.tutorFields.lastName.placeholder}
        value={formState.values.tutorLastName}
        onBlur={() => handleFieldBlur('tutorLastName')}
        onChange={(value) => updateFieldValue('tutorLastName', value)}
      />
      <SelectField
        disabled={
          documentTypesState.status !== 'ready' || tutorDocumentTypeOptions.length === 0
        }
        error={formState.errors.tutorDocumentTypeId}
        helpText={tutorDocumentTypeHelpText}
        id={fieldIds.tutorDocumentTypeId}
        label={content.tutorFields.documentType.label}
        name="tutorDocumentTypeId"
        options={tutorDocumentTypeOptions}
        placeholder={tutorDocumentTypePlaceholder}
        value={formState.values.tutorDocumentTypeId}
        onBlur={() => handleFieldBlur('tutorDocumentTypeId')}
        onChange={(value) => updateFieldValue('tutorDocumentTypeId', value)}
      />
      <TextField
        autoComplete="off"
        error={formState.errors.tutorDocumentNumber}
        id={fieldIds.tutorDocumentNumber}
        inputMode="numeric"
        label={content.tutorFields.documentNumber.label}
        name="tutorDocumentNumber"
        placeholder={content.tutorFields.documentNumber.placeholder}
        value={formState.values.tutorDocumentNumber}
        onBlur={() => handleFieldBlur('tutorDocumentNumber')}
        onChange={(value) => updateFieldValue('tutorDocumentNumber', value)}
      />
      <TextField
        autoComplete="email"
        error={formState.errors.tutorEmail}
        id={fieldIds.tutorEmail}
        label={content.tutorFields.email.label}
        name="tutorEmail"
        placeholder={content.tutorFields.email.placeholder}
        type="email"
        value={formState.values.tutorEmail}
        onBlur={() => handleFieldBlur('tutorEmail')}
        onChange={(value) => updateFieldValue('tutorEmail', value)}
      />
      <TextField
        autoComplete="tel"
        error={formState.errors.tutorPhone}
        id={fieldIds.tutorPhone}
        inputMode="tel"
        label={content.tutorFields.phone.label}
        name="tutorPhone"
        placeholder={content.tutorFields.phone.placeholder}
        type="tel"
        value={formState.values.tutorPhone}
        onBlur={() => handleFieldBlur('tutorPhone')}
        onChange={(value) => updateFieldValue('tutorPhone', value)}
      />
    </div>
  );

  const consentFields = (
    <div className="space-y-3">
      <CheckboxField
        checked={formState.values.acceptTerms}
        error={formState.errors.acceptTerms}
        id={fieldIds.acceptTerms}
        label={content.termsConsent.label}
        onBlur={() => handleFieldBlur('acceptTerms')}
        onChange={(value) => updateFieldValue('acceptTerms', value)}
      />
      <CheckboxField
        checked={formState.values.acceptPrivacyPolicy}
        error={formState.errors.acceptPrivacyPolicy}
        id={fieldIds.acceptPrivacyPolicy}
        label={content.privacyConsent.label}
        onBlur={() => handleFieldBlur('acceptPrivacyPolicy')}
        onChange={(value) => updateFieldValue('acceptPrivacyPolicy', value)}
      />
    </div>
  );

  const mobileSteps: MobileRegisterStepConfig[] = showTutor
    ? [
        {
          description: content.personalSection.description,
          fields: ['firstName', 'lastName', 'documentTypeId', 'documentNumber'],
          id: 'personal',
          shortLabel: 'Personal',
          title: content.personalSection.title,
        },
        {
          description: 'Completa tu sexo, fecha de nacimiento y ubicación principal.',
          fields: ['sex', 'birthDate', 'cityId', 'localityId'],
          id: 'profile-location',
          shortLabel: 'Perfil',
          title: 'Perfil y ubicación',
        },
        {
          description: content.tutorSection.description,
          fields: tutorFieldNames,
          id: 'tutor',
          shortLabel: 'Tutor',
          title: content.tutorSection.title,
        },
        {
          description: content.accountSection.description,
          fields: ['email', 'phone', 'password', 'confirmPassword', 'acceptTerms', 'acceptPrivacyPolicy'],
          id: 'account',
          shortLabel: 'Acceso',
          title: content.accountSection.title,
        },
      ]
    : [
        {
          description: content.personalSection.description,
          fields: ['firstName', 'lastName', 'documentTypeId', 'documentNumber'],
          id: 'personal',
          shortLabel: 'Personal',
          title: content.personalSection.title,
        },
        {
          description: 'Completa tu sexo, fecha de nacimiento y ubicación principal.',
          fields: ['sex', 'birthDate', 'cityId', 'localityId'],
          id: 'profile-location',
          shortLabel: 'Perfil',
          title: 'Perfil y ubicación',
        },
        {
          description: content.accountSection.description,
          fields: ['email', 'phone', 'password', 'confirmPassword', 'acceptTerms', 'acceptPrivacyPolicy'],
          id: 'account',
          shortLabel: 'Acceso',
          title: content.accountSection.title,
        },
      ];
  const currentMobileStep =
    mobileSteps[Math.min(currentMobileStepIndex, mobileSteps.length - 1)]!;

  useEffect(() => {
    setCurrentMobileStepIndex((currentIndex) =>
      Math.min(currentIndex, Math.max(mobileSteps.length - 1, 0)),
    );
  }, [mobileSteps.length]);

  const handleNextMobileStep = () => {
    const validationErrors = validateRegisterForm(formState.values, currentDate);
    const firstInvalidField = currentMobileStep.fields.find((fieldName) => Boolean(validationErrors[fieldName]));

    setFormState((currentState) => ({
      ...currentState,
      errors: validationErrors,
    }));
    setSubmissionError(null);

    if (firstInvalidField) {
      focusField(firstInvalidField);
      return;
    }

    setCurrentMobileStepIndex((currentIndex) => Math.min(currentIndex + 1, mobileSteps.length - 1));
  };

  const handlePreviousMobileStep = () => {
    setCurrentMobileStepIndex((currentIndex) => Math.max(currentIndex - 1, 0));
    setSubmissionError(null);
  };

  const mobileStepBody = (() => {
    switch (currentMobileStep.id) {
      case 'personal':
        return identityFields;
      case 'profile-location':
        return (
          <div className="space-y-5">
            {profileFields}
            <div className="space-y-3">
              <p className="px-1 text-[11px] font-black uppercase tracking-[0.28em] text-primary">
                {content.locationSection.title}
              </p>
              {locationFields}
            </div>
          </div>
        );
      case 'tutor':
        return tutorFields;
      case 'account':
        return (
          <div className="space-y-5">
            {accountFields}
            <div className="space-y-3">
              <p className="px-1 text-[11px] font-black uppercase tracking-[0.28em] text-primary">
                Consentimientos
              </p>
              {consentFields}
            </div>
          </div>
        );
      default:
        return null;
    }
  })();

  return (
    <AuthShell mainClassName="items-start px-2.5 py-4 sm:px-6 sm:py-7 lg:px-8">
      <Seo
        description={content.meta.description}
        noIndex
        title={content.meta.title}
      />
      <AuthCard className="w-full max-w-[min(64rem,calc(100vw-1rem))] rounded-[1.8rem] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="space-y-8">
          <div className="space-y-3 text-center lg:text-left">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-primary">
              Docqee
            </p>
            <h1 className="font-headline text-[2rem] font-extrabold tracking-tight text-ink sm:text-[2.35rem]">
              {content.title}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-ink-muted sm:text-base">
              {content.subtitle}
            </p>
          </div>

          <form
            className="space-y-6"
            noValidate
            onSubmit={handleSubmit}
          >
            {isMobileView ? (
              <div className="space-y-5">
                <div className="rounded-[1.7rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(233,238,245,0.78)_0%,rgba(255,255,255,0.96)_100%)] p-4 shadow-float">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-primary">
                          Paso {currentMobileStepIndex + 1}/{mobileSteps.length}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-ink-muted">
                          {currentMobileStep.shortLabel}
                        </p>
                      </div>
                      <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-primary shadow-[0_10px_24px_-18px_rgba(15,23,42,0.38)]">
                        Registro móvil
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200/80">
                      <div
                        className="h-full rounded-full bg-brand-gradient transition-all duration-300"
                        style={{
                          width: `${((currentMobileStepIndex + 1) / mobileSteps.length) * 100}%`,
                        }}
                      />
                    </div>
                    <div
                      className="grid gap-2"
                      style={{
                        gridTemplateColumns: `repeat(${mobileSteps.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {mobileSteps.map((step, index) => {
                        const isCurrent = index === currentMobileStepIndex;
                        const isComplete = index < currentMobileStepIndex;

                        return (
                          <div
                            className={classNames(
                              'rounded-[1.1rem] border px-2.5 py-2 text-center text-[11px] font-bold uppercase tracking-[0.18em] transition-all duration-300',
                              isCurrent
                                ? 'border-primary/25 bg-primary/[0.1] text-primary'
                                : isComplete
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-slate-200/80 bg-white/70 text-ink-muted',
                            )}
                            key={step.id}
                          >
                            {step.shortLabel}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <section className="rounded-[1.7rem] border border-slate-200/80 bg-white/80 p-4 shadow-float">
                  <div className="space-y-4">
                    <SectionHeader
                      description={currentMobileStep.description}
                      title={currentMobileStep.title}
                    />
                    {mobileStepBody}
                  </div>
                </section>

                <div className="space-y-4 border-t border-slate-200/70 pt-1">
                  {submissionError ? (
                    <div
                      aria-live="polite"
                      className="w-full rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
                      role="alert"
                    >
                      {submissionError}
                    </div>
                  ) : null}
                  <div className="flex items-center gap-3">
                    {currentMobileStepIndex > 0 ? (
                      <button
                        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-ink shadow-[0_12px_30px_-22px_rgba(15,23,42,0.4)] transition-all duration-300 hover:border-primary/25 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/12"
                        type="button"
                        onClick={handlePreviousMobileStep}
                      >
                        <ArrowLeft aria-hidden="true" className="h-4.5 w-4.5" />
                      </button>
                    ) : null}
                    {currentMobileStepIndex < mobileSteps.length - 1 ? (
                      <button
                        className="inline-flex min-h-[3rem] flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-5 py-3 font-headline text-[15px] font-extrabold text-white shadow-ambient transition-all duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                        type="button"
                        onClick={handleNextMobileStep}
                      >
                        <span>Siguiente paso</span>
                        <ArrowRight aria-hidden="true" className="h-4.5 w-4.5" />
                      </button>
                    ) : (
                      <button
                        className="inline-flex min-h-[3rem] flex-1 items-center justify-center rounded-2xl bg-brand-gradient px-5 py-3 font-headline text-[15px] font-extrabold text-white shadow-ambient transition-all duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                        disabled={isSubmitting}
                        type="submit"
                      >
                        {content.submitLabel}
                      </button>
                    )}
                  </div>
                  {currentMobileStepIndex === mobileSteps.length - 1 ? (
                    <p className="text-center text-sm text-ink-muted">
                      {content.loginPrompt}{' '}
                      <Link
                        className="font-semibold text-primary transition-colors duration-300 hover:text-primary-strong hover:underline"
                        to={content.loginCta.kind === 'internal' ? content.loginCta.to : ROUTES.login}
                      >
                        {content.loginCta.label}
                      </Link>
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <>
            <section className="rounded-[1.6rem] border border-slate-200/80 bg-white/70 p-5 shadow-float sm:p-6">
              <SectionHeader
                description={content.personalSection.description}
                title={content.personalSection.title}
              />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <TextField
                  autoComplete="given-name"
                  error={formState.errors.firstName}
                  id={fieldIds.firstName}
                  label={content.patientFields.firstName.label}
                  name="firstName"
                  placeholder={content.patientFields.firstName.placeholder}
                  value={formState.values.firstName}
                  onBlur={() => handleFieldBlur('firstName')}
                  onChange={(value) => updateFieldValue('firstName', value)}
                />
                <TextField
                  autoComplete="family-name"
                  error={formState.errors.lastName}
                  id={fieldIds.lastName}
                  label={content.patientFields.lastName.label}
                  name="lastName"
                  placeholder={content.patientFields.lastName.placeholder}
                  value={formState.values.lastName}
                  onBlur={() => handleFieldBlur('lastName')}
                  onChange={(value) => updateFieldValue('lastName', value)}
                />
                <SelectField
                  disabled={
                    documentTypesState.status !== 'ready' || documentTypesState.options.length === 0
                  }
                  error={formState.errors.documentTypeId}
                  helpText={documentTypeHelpText}
                  id={fieldIds.documentTypeId}
                  label={content.patientFields.documentType.label}
                  name="documentTypeId"
                  options={documentTypesState.options}
                  placeholder={documentTypePlaceholder}
                  value={formState.values.documentTypeId}
                  onBlur={() => handleFieldBlur('documentTypeId')}
                  onChange={(value) => updateFieldValue('documentTypeId', value)}
                />
                <TextField
                  autoComplete="off"
                  error={formState.errors.documentNumber}
                  id={fieldIds.documentNumber}
                  inputMode="numeric"
                  label={content.patientFields.documentNumber.label}
                  name="documentNumber"
                  placeholder={content.patientFields.documentNumber.placeholder}
                  value={formState.values.documentNumber}
                  onBlur={() => handleFieldBlur('documentNumber')}
                  onChange={(value) => updateFieldValue('documentNumber', value)}
                />
                <SelectField
                  error={formState.errors.sex}
                  id={fieldIds.sex}
                  label={content.patientFields.sex.label}
                  name="sex"
                  options={content.patientFields.sex.options.map((option) => ({
                    id: option,
                    label: option,
                  }))}
                  placeholder="Selecciona una opciÃ³n"
                  value={formState.values.sex}
                  onBlur={() => handleFieldBlur('sex')}
                  onChange={(value) => updateFieldValue('sex', value as PatientSex)}
                />
                <TextField
                  error={formState.errors.birthDate}
                  id={fieldIds.birthDate}
                  label={content.patientFields.birthDate.label}
                  name="birthDate"
                  placeholder={content.patientFields.birthDate.placeholder}
                  type="date"
                  value={formState.values.birthDate}
                  onBlur={() => handleFieldBlur('birthDate')}
                  onChange={(value) => updateFieldValue('birthDate', value)}
                />
              </div>
            </section>

            <section className="rounded-[1.6rem] border border-slate-200/80 bg-white/70 p-5 shadow-float sm:p-6">
              <SectionHeader
                description={content.locationSection.description}
                title={content.locationSection.title}
              />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <SelectField
                  disabled={citiesState.status !== 'ready' || citiesState.options.length === 0}
                  error={formState.errors.cityId}
                  helpText={cityHelpText}
                  id={fieldIds.cityId}
                  label={content.patientFields.city.label}
                  name="cityId"
                  options={citiesState.options}
                  placeholder={cityPlaceholder}
                  value={formState.values.cityId}
                  onBlur={() => handleFieldBlur('cityId')}
                  onChange={(value) => updateFieldValue('cityId', value)}
                />
                <SelectField
                  disabled={
                    !formState.values.cityId ||
                    localitiesState.status !== 'ready' ||
                    localitiesState.options.length === 0
                  }
                  error={formState.errors.localityId}
                  helpText={localityHelpText}
                  id={fieldIds.localityId}
                  label={content.patientFields.locality.label}
                  name="localityId"
                  options={localitiesState.options}
                  placeholder={localityPlaceholder}
                  value={formState.values.localityId}
                  onBlur={() => handleFieldBlur('localityId')}
                  onChange={(value) => updateFieldValue('localityId', value)}
                />
              </div>
            </section>

            <section className="rounded-[1.6rem] border border-slate-200/80 bg-white/70 p-5 shadow-float sm:p-6">
              <SectionHeader
                description={content.accountSection.description}
                title={content.accountSection.title}
              />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <TextField
                  autoComplete="email"
                  error={formState.errors.email}
                  id={fieldIds.email}
                  label={content.patientFields.email.label}
                  name="email"
                  placeholder={content.patientFields.email.placeholder}
                  type="email"
                  value={formState.values.email}
                  onBlur={() => handleFieldBlur('email')}
                  onChange={(value) => updateFieldValue('email', value)}
                />
                <TextField
                  autoComplete="tel"
                  error={formState.errors.phone}
                  id={fieldIds.phone}
                  inputMode="tel"
                  label={content.patientFields.phone.label}
                  name="phone"
                  placeholder={content.patientFields.phone.placeholder}
                  type="tel"
                  value={formState.values.phone}
                  onBlur={() => handleFieldBlur('phone')}
                  onChange={(value) => updateFieldValue('phone', value)}
                />
                <div className="space-y-4 md:col-span-2">
                  <PasswordField
                    autoComplete="new-password"
                    error={formState.errors.password}
                    hidePasswordLabel={content.password.hidePasswordLabel}
                    id={fieldIds.password}
                    inputRef={passwordInputRef}
                    label={content.password.label}
                    name="password"
                    placeholder={content.password.placeholder}
                    showPassword={showPassword}
                    showPasswordLabel={content.password.showPasswordLabel}
                    value={formState.values.password}
                    onBlur={() => handleFieldBlur('password')}
                    onChange={(value) => updateFieldValue('password', value)}
                    onToggleVisibility={() => setShowPassword((currentState) => !currentState)}
                  />
                  <PasswordRequirementsList password={formState.values.password} />
                </div>
                <div className="md:col-span-2">
                  <PasswordField
                    autoComplete="new-password"
                    error={formState.errors.confirmPassword}
                    hidePasswordLabel={content.password.hidePasswordLabel}
                    id={fieldIds.confirmPassword}
                    inputRef={confirmPasswordInputRef}
                    label={content.password.confirmLabel}
                    name="confirmPassword"
                    placeholder={content.password.confirmPlaceholder}
                    showPassword={showConfirmPassword}
                    showPasswordLabel={content.password.showPasswordLabel}
                    value={formState.values.confirmPassword}
                    onBlur={() => handleFieldBlur('confirmPassword')}
                    onChange={(value) => updateFieldValue('confirmPassword', value)}
                    onToggleVisibility={() =>
                      setShowConfirmPassword((currentState) => !currentState)
                    }
                  />
                </div>
              </div>
            </section>

            {showTutor ? (
              <section className="rounded-[1.6rem] border border-slate-200/80 bg-white/70 p-5 shadow-float sm:p-6">
                <SectionHeader
                  description={content.tutorSection.description}
                  title={content.tutorSection.title}
                />
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <TextField
                    autoComplete="given-name"
                    error={formState.errors.tutorFirstName}
                    id={fieldIds.tutorFirstName}
                    label={content.tutorFields.firstName.label}
                    name="tutorFirstName"
                    placeholder={content.tutorFields.firstName.placeholder}
                    value={formState.values.tutorFirstName}
                    onBlur={() => handleFieldBlur('tutorFirstName')}
                    onChange={(value) => updateFieldValue('tutorFirstName', value)}
                  />
                  <TextField
                    autoComplete="family-name"
                    error={formState.errors.tutorLastName}
                    id={fieldIds.tutorLastName}
                    label={content.tutorFields.lastName.label}
                    name="tutorLastName"
                    placeholder={content.tutorFields.lastName.placeholder}
                    value={formState.values.tutorLastName}
                    onBlur={() => handleFieldBlur('tutorLastName')}
                    onChange={(value) => updateFieldValue('tutorLastName', value)}
                  />
                  <SelectField
                    disabled={
                      documentTypesState.status !== 'ready' || tutorDocumentTypeOptions.length === 0
                    }
                    error={formState.errors.tutorDocumentTypeId}
                    helpText={tutorDocumentTypeHelpText}
                    id={fieldIds.tutorDocumentTypeId}
                    label={content.tutorFields.documentType.label}
                    name="tutorDocumentTypeId"
                    options={tutorDocumentTypeOptions}
                    placeholder={tutorDocumentTypePlaceholder}
                    value={formState.values.tutorDocumentTypeId}
                    onBlur={() => handleFieldBlur('tutorDocumentTypeId')}
                    onChange={(value) => updateFieldValue('tutorDocumentTypeId', value)}
                  />
                  <TextField
                    autoComplete="off"
                    error={formState.errors.tutorDocumentNumber}
                    id={fieldIds.tutorDocumentNumber}
                    inputMode="numeric"
                    label={content.tutorFields.documentNumber.label}
                    name="tutorDocumentNumber"
                    placeholder={content.tutorFields.documentNumber.placeholder}
                    value={formState.values.tutorDocumentNumber}
                    onBlur={() => handleFieldBlur('tutorDocumentNumber')}
                    onChange={(value) => updateFieldValue('tutorDocumentNumber', value)}
                  />
                  <TextField
                    autoComplete="email"
                    error={formState.errors.tutorEmail}
                    id={fieldIds.tutorEmail}
                    label={content.tutorFields.email.label}
                    name="tutorEmail"
                    placeholder={content.tutorFields.email.placeholder}
                    type="email"
                    value={formState.values.tutorEmail}
                    onBlur={() => handleFieldBlur('tutorEmail')}
                    onChange={(value) => updateFieldValue('tutorEmail', value)}
                  />
                  <TextField
                    autoComplete="tel"
                    error={formState.errors.tutorPhone}
                    id={fieldIds.tutorPhone}
                    inputMode="tel"
                    label={content.tutorFields.phone.label}
                    name="tutorPhone"
                    placeholder={content.tutorFields.phone.placeholder}
                    type="tel"
                    value={formState.values.tutorPhone}
                    onBlur={() => handleFieldBlur('tutorPhone')}
                    onChange={(value) => updateFieldValue('tutorPhone', value)}
                  />
                </div>
              </section>
            ) : null}

            <section className="rounded-[1.6rem] border border-slate-200/80 bg-white/70 p-5 shadow-float sm:p-6">
              <SectionHeader title="Consentimientos" />
              <div className="mt-5 space-y-3">
                <CheckboxField
                  checked={formState.values.acceptTerms}
                  error={formState.errors.acceptTerms}
                  id={fieldIds.acceptTerms}
                  label={content.termsConsent.label}
                  onBlur={() => handleFieldBlur('acceptTerms')}
                  onChange={(value) => updateFieldValue('acceptTerms', value)}
                />
                <CheckboxField
                  checked={formState.values.acceptPrivacyPolicy}
                  error={formState.errors.acceptPrivacyPolicy}
                  id={fieldIds.acceptPrivacyPolicy}
                  label={content.privacyConsent.label}
                  onBlur={() => handleFieldBlur('acceptPrivacyPolicy')}
                  onChange={(value) => updateFieldValue('acceptPrivacyPolicy', value)}
                />
              </div>
            </section>

            <div className="flex flex-col items-center gap-4 border-t border-slate-200/70 pt-2 text-center">
              {submissionError ? (
                <div
                  aria-live="polite"
                  className="w-full rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
                  role="alert"
                >
                  {submissionError}
                </div>
              ) : null}
              <button
                className="inline-flex min-w-[14rem] items-center justify-center rounded-xl bg-brand-gradient px-6 py-3 font-headline text-[15px] font-extrabold text-white shadow-ambient transition-all duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 sm:text-base"
                disabled={isSubmitting}
                type="submit"
              >
                {content.submitLabel}
              </button>
              <p className="text-sm text-ink-muted">
                {content.loginPrompt}{' '}
                <Link
                  className="font-semibold text-primary transition-colors duration-300 hover:text-primary-strong hover:underline"
                  to={content.loginCta.kind === 'internal' ? content.loginCta.to : ROUTES.login}
                >
                  {content.loginCta.label}
                </Link>
              </p>
            </div>
              </>
            )}
          </form>
        </div>
      </AuthCard>
    </AuthShell>
  );
}
