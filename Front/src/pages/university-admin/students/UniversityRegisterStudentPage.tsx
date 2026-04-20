import { ArrowLeft, GraduationCap, IdCard, Mail, Phone, UserRound } from 'lucide-react';
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminSelectField } from '@/components/admin/AdminSelectField';
import { AdminTextField } from '@/components/admin/AdminTextField';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { ROUTES } from '@/constants/routes';
import { universityAdminContent } from '@/content/universityAdminContent';
import type {
  DocumentTypeOption,
  PatientRegisterCatalogDataSource,
  RegisterStudentFormErrors,
  RegisterStudentFormField,
  RegisterStudentFormValues,
} from '@/content/types';
import { patientRegisterCatalogDataSource } from '@/lib/patientRegisterCatalogDataSource';
import { useUniversityAdminModuleStore } from '@/lib/universityAdminModuleStore';

type UniversityRegisterStudentPageProps = {
  catalogDataSource?: PatientRegisterCatalogDataSource;
};

const initialValues: RegisterStudentFormValues = {
  documentNumber: '',
  documentTypeId: '',
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  semester: '',
};

const semesterOptions = Array.from({ length: 10 }, (_, index) => ({
  id: `${index + 1}`,
  label: `Semestre ${index + 1}`,
}));

const fieldOrder: RegisterStudentFormField[] = [
  'firstName',
  'lastName',
  'documentTypeId',
  'documentNumber',
  'email',
  'phone',
  'semester',
];

function resolveCatalogResult<T>(result: Promise<T[]> | T[]) {
  return Promise.resolve(result);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateField(
  field: RegisterStudentFormField,
  value: string,
): string | undefined {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    switch (field) {
      case 'documentNumber':
        return 'El número de documento es obligatorio';
      case 'documentTypeId':
        return 'El tipo de documento es obligatorio';
      case 'email':
        return 'El correo electrónico es obligatorio';
      case 'firstName':
        return 'Los nombres son obligatorios';
      case 'lastName':
        return 'Los apellidos son obligatorios';
      case 'phone':
        return 'El celular es obligatorio';
      case 'semester':
        return 'El semestre es obligatorio';
      default:
        return undefined;
    }
  }

  if (field === 'email' && !isValidEmail(normalizedValue)) {
    return 'Ingresa un correo electrónico válido';
  }

  return undefined;
}

export function UniversityRegisterStudentPage({
  catalogDataSource = patientRegisterCatalogDataSource,
}: UniversityRegisterStudentPageProps) {
  const { errorMessage, isLoading, registerStudent } = useUniversityAdminModuleStore({
    autoLoad: false,
  });
  const navigate = useNavigate();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<RegisterStudentFormErrors>({});
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const documentTypeRef = useRef<HTMLSelectElement>(null);
  const documentNumberRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const semesterRef = useRef<HTMLSelectElement>(null);
  const continueSubmitButtonRef = useRef<HTMLButtonElement>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fieldRefs = useMemo(
    () =>
      ({
        documentNumber: documentNumberRef,
        documentTypeId: documentTypeRef,
        email: emailRef,
        firstName: firstNameRef,
        lastName: lastNameRef,
        phone: phoneRef,
        semester: semesterRef,
      }) satisfies Record<
        RegisterStudentFormField,
        { current: HTMLInputElement | HTMLSelectElement | null }
      >,
    [],
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadDocumentTypes() {
      const nextDocumentTypes = await resolveCatalogResult(
        catalogDataSource.loadDocumentTypes
          ? catalogDataSource.loadDocumentTypes()
          : catalogDataSource.getDocumentTypes(),
      );

      if (isCancelled) {
        return;
      }

      setDocumentTypes(nextDocumentTypes);
    }

    void loadDocumentTypes();

    return () => {
      isCancelled = true;
    };
  }, [catalogDataSource]);

  useEffect(() => {
    firstNameRef.current?.focus();
  }, []);

  const updateFieldValue = (field: RegisterStudentFormField, nextValue: string) => {
    if (successNotice) {
      setSuccessNotice(null);
    }

    setValues((currentValues) => ({
      ...currentValues,
      [field]: nextValue,
    }));

    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      const nextFieldError = validateField(field, nextValue);

      if (nextFieldError) {
        nextErrors[field] = nextFieldError;
      } else {
        delete nextErrors[field];
      }

      return nextErrors;
    });
  };

  const focusNextField = (field: RegisterStudentFormField) => {
    const currentFieldIndex = fieldOrder.indexOf(field);

    if (currentFieldIndex === -1) {
      return;
    }

    const nextField = fieldOrder[currentFieldIndex + 1];

    if (!nextField) {
      continueSubmitButtonRef.current?.focus();
      return;
    }

    fieldRefs[nextField].current?.focus();
  };

  const handleInputKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    field: RegisterStudentFormField,
  ) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();

    if (field === 'semester') {
      event.currentTarget.form?.requestSubmit(continueSubmitButtonRef.current ?? undefined);
      return;
    }

    focusNextField(field);
  };

  const handleFieldBlur = (field: RegisterStudentFormField) => {
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      const nextFieldError = validateField(field, values[field]);

      if (nextFieldError) {
        nextErrors[field] = nextFieldError;
      } else {
        delete nextErrors[field];
      }

      return nextErrors;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: RegisterStudentFormErrors = {};
    const submitEvent = event.nativeEvent as SubmitEvent;
    const submitter = submitEvent.submitter as HTMLButtonElement | null;
    const shouldContinue = submitter?.dataset.submitMode === 'continue';

    fieldOrder.forEach((field) => {
      const nextFieldError = validateField(field, values[field]);

      if (nextFieldError) {
        nextErrors[field] = nextFieldError;
      }
    });

    setErrors(nextErrors);

    const firstErrorField = fieldOrder.find((field) => nextErrors[field]);

    if (firstErrorField) {
      fieldRefs[firstErrorField].current?.focus();
      return;
    }

    void (async () => {
      setIsSubmitting(true);
      const result = await registerStudent(values);

      if (!result) {
        setIsSubmitting(false);
        return;
      }

      if (shouldContinue) {
        const preservedDocumentTypeId = values.documentTypeId;
        const preservedSemester = values.semester;

        setValues({
          ...initialValues,
          documentTypeId: preservedDocumentTypeId,
          semester: preservedSemester,
        });
        setErrors({});
        setSuccessNotice(
          universityAdminContent.registerStudentPage.continueSuccessMessage,
        );
        setIsSubmitting(false);

        window.requestAnimationFrame(() => {
          firstNameRef.current?.focus();
        });

        return;
      }

      navigate(ROUTES.universityStudents, {
        state: {
          successNotice: universityAdminContent.registerStudentPage.successMessage,
        },
      });
    })();
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden sm:gap-5 lg:h-auto lg:min-h-fit lg:gap-3 lg:overflow-visible lg:pr-2 xl:pr-3">
      <Seo
        description={universityAdminContent.registerStudentPage.meta.description}
        noIndex
        title={universityAdminContent.registerStudentPage.meta.title}
      />
      <AdminPageHeader
        action={
          <Link
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-surface-card px-4 py-3 text-sm font-semibold text-primary shadow-ambient transition duration-300 hover:bg-surface-low focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
            to={ROUTES.universityStudents}
          >
            <ArrowLeft aria-hidden="true" className="h-4.5 w-4.5" />
            <span>{universityAdminContent.registerStudentPage.backLabel}</span>
          </Link>
        }
        actionClassName="sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2"
        className="relative gap-2.5 sm:min-h-[4rem] sm:justify-center"
        description=""
        headingAlign="center"
        titleClassName="text-center sm:-mt-1"
        title={universityAdminContent.registerStudentPage.title}
      />
      {errorMessage ? (
        <SurfaceCard className="border border-rose-200 bg-rose-50/90 text-sm text-rose-800 shadow-none" paddingClassName="p-4">
          <p role="alert">{errorMessage}</p>
        </SurfaceCard>
      ) : null}
      {successNotice ? (
        <SurfaceCard
          className="border border-emerald-200 bg-emerald-50/90 text-sm text-emerald-800 shadow-none"
          paddingClassName="p-4"
        >
          <p role="status">{successNotice}</p>
        </SurfaceCard>
      ) : null}
      <AdminPanelCard
        className="flex-1 lg:-mt-1 lg:mr-2 lg:w-auto lg:flex-none lg:overflow-visible xl:mr-3"
        panelClassName="bg-slate-50 lg:h-auto lg:overflow-visible"
      >
        <form
          className="flex min-h-0 flex-1 flex-col overflow-hidden lg:min-h-fit lg:flex-none lg:overflow-visible"
          noValidate
          onSubmit={handleSubmit}
        >
          <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-7 sm:py-5 lg:min-h-fit lg:flex-none lg:overflow-visible lg:py-4">
            <div className="space-y-4 pb-4 sm:space-y-5 sm:pb-5 lg:pb-1">
              <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
                <AdminTextField
                  autoCapitalize="words"
                  autoComplete="given-name"
                  containerClassName="space-y-1"
                  error={errors.firstName}
                  icon={UserRound}
                  id="register-student-first-name"
                  inputClassName="py-2.5 sm:py-3"
                  inputRef={firstNameRef}
                  label="Nombres"
                  name="firstName"
                  placeholder="Ingresa los nombres"
                  value={values.firstName}
                  onKeyDown={(event) => handleInputKeyDown(event, 'firstName')}
                  onBlur={() => handleFieldBlur('firstName')}
                  onChange={(value) => updateFieldValue('firstName', value)}
                />
                <AdminTextField
                  autoCapitalize="words"
                  autoComplete="family-name"
                  containerClassName="space-y-1"
                  error={errors.lastName}
                  icon={UserRound}
                  id="register-student-last-name"
                  inputClassName="py-2.5 sm:py-3"
                  inputRef={lastNameRef}
                  label="Apellidos"
                  name="lastName"
                  placeholder="Ingresa los apellidos"
                  value={values.lastName}
                  onKeyDown={(event) => handleInputKeyDown(event, 'lastName')}
                  onBlur={() => handleFieldBlur('lastName')}
                  onChange={(value) => updateFieldValue('lastName', value)}
                />
                <AdminSelectField
                  containerClassName="space-y-1"
                  error={errors.documentTypeId}
                  icon={IdCard}
                  id="register-student-document-type"
                  label="Tipo de documento"
                  name="documentTypeId"
                  options={documentTypes}
                  placeholder="Selecciona un tipo"
                  selectClassName="py-2.5 sm:py-3"
                  selectRef={documentTypeRef}
                  value={values.documentTypeId}
                  onKeyDown={(event) => handleInputKeyDown(event, 'documentTypeId')}
                  onBlur={() => handleFieldBlur('documentTypeId')}
                  onChange={(value) => updateFieldValue('documentTypeId', value)}
                />
                <AdminTextField
                  autoComplete="off"
                  containerClassName="space-y-1"
                  error={errors.documentNumber}
                  icon={IdCard}
                  id="register-student-document-number"
                  inputClassName="py-2.5 sm:py-3"
                  inputMode="numeric"
                  inputRef={documentNumberRef}
                  label="Número de documento"
                  name="documentNumber"
                  placeholder="Ingresa el número de documento"
                  value={values.documentNumber}
                  onKeyDown={(event) => handleInputKeyDown(event, 'documentNumber')}
                  onBlur={() => handleFieldBlur('documentNumber')}
                  onChange={(value) => updateFieldValue('documentNumber', value.replace(/\D/g, ''))}
                />
                <AdminTextField
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  containerClassName="space-y-1"
                  error={errors.email}
                  icon={Mail}
                  id="register-student-email"
                  inputClassName="py-2.5 sm:py-3"
                  inputRef={emailRef}
                  label="Correo electrónico"
                  name="email"
                  placeholder="estudiante@universidad.edu.co"
                  type="email"
                  value={values.email}
                  onKeyDown={(event) => handleInputKeyDown(event, 'email')}
                  onBlur={() => handleFieldBlur('email')}
                  onChange={(value) => updateFieldValue('email', value)}
                />
                <AdminTextField
                  autoComplete="tel"
                  containerClassName="space-y-1"
                  error={errors.phone}
                  icon={Phone}
                  id="register-student-phone"
                  inputClassName="py-2.5 sm:py-3"
                  inputMode="numeric"
                  inputRef={phoneRef}
                  label="Celular"
                  name="phone"
                  placeholder="3001234567"
                  type="tel"
                  value={values.phone}
                  onKeyDown={(event) => handleInputKeyDown(event, 'phone')}
                  onBlur={() => handleFieldBlur('phone')}
                  onChange={(value) => updateFieldValue('phone', value.replace(/\D/g, ''))}
                />
                <div className="lg:col-span-2">
                  <AdminSelectField
                    containerClassName="space-y-1"
                    error={errors.semester}
                    icon={GraduationCap}
                    id="register-student-semester"
                    label="Semestre"
                    name="semester"
                    options={semesterOptions}
                    placeholder="Selecciona un semestre"
                    selectClassName="py-2.5 sm:py-3"
                    selectRef={semesterRef}
                    value={values.semester}
                    onKeyDown={(event) => handleInputKeyDown(event, 'semester')}
                    onBlur={() => handleFieldBlur('semester')}
                    onChange={(value) => updateFieldValue('semester', value)}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-200/80 bg-white px-5 py-3 sm:px-7 sm:py-3 lg:py-2.5">
            <button
              className="inline-flex items-center justify-center rounded-2xl bg-brand-gradient px-5 py-3 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70"
              data-submit-mode="continue"
              disabled={isSubmitting || isLoading}
              ref={continueSubmitButtonRef}
              type="submit"
            >
              {isSubmitting
                ? 'Registrando...'
                : universityAdminContent.registerStudentPage.continueLabel}
            </button>
            <button
              className="inline-flex items-center justify-center rounded-2xl bg-surface-card px-5 py-3 text-sm font-semibold text-primary shadow-ambient transition duration-300 hover:bg-surface-low focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting || isLoading}
              type="submit"
            >
              {isSubmitting ? 'Registrando...' : universityAdminContent.registerStudentPage.submitLabel}
            </button>
          </div>
        </form>
      </AdminPanelCard>
    </div>
  );
}
