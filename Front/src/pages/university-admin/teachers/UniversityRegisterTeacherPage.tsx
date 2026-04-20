import { ArrowLeft, IdCard, UserRound } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminSelectField } from '@/components/admin/AdminSelectField';
import { AdminTextField } from '@/components/admin/AdminTextField';
import { Seo } from '@/components/ui/Seo';
import { ROUTES } from '@/constants/routes';
import { universityAdminContent } from '@/content/universityAdminContent';
import type {
  DocumentTypeOption,
  PatientRegisterCatalogDataSource,
  RegisterTeacherFormErrors,
  RegisterTeacherFormField,
  RegisterTeacherFormValues,
} from '@/content/types';
import { patientRegisterCatalogDataSource } from '@/lib/patientRegisterCatalogDataSource';
import {
  DOCUMENT_NUMBER_DIGITS_MESSAGE,
  isDigitsOnly,
  keepOnlyDigits,
} from '@/lib/documentNumber';
import { useUniversityAdminModuleStore } from '@/lib/universityAdminModuleStore';

type UniversityRegisterTeacherPageProps = {
  catalogDataSource?: PatientRegisterCatalogDataSource;
};

const initialValues: RegisterTeacherFormValues = {
  documentNumber: '',
  documentTypeId: '',
  firstName: '',
  lastName: '',
};

function resolveCatalogResult<T>(result: Promise<T[]> | T[]) {
  return Promise.resolve(result);
}

function validateField(
  field: RegisterTeacherFormField,
  value: string,
): string | undefined {
  if (!value.trim()) {
    switch (field) {
      case 'documentNumber':
        return 'El número de documento es obligatorio';
      case 'documentTypeId':
        return 'El tipo de documento es obligatorio';
      case 'firstName':
        return 'Los nombres son obligatorios';
      case 'lastName':
        return 'Los apellidos son obligatorios';
      default:
        return undefined;
    }
  }

  if (field === 'documentNumber' && !isDigitsOnly(value)) {
    return DOCUMENT_NUMBER_DIGITS_MESSAGE;
  }

  return undefined;
}

export function UniversityRegisterTeacherPage({
  catalogDataSource = patientRegisterCatalogDataSource,
}: UniversityRegisterTeacherPageProps) {
  const { errorMessage, isLoading, registerTeacher } = useUniversityAdminModuleStore({
    autoLoad: false,
  });
  const navigate = useNavigate();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<RegisterTeacherFormErrors>({});
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const documentTypeRef = useRef<HTMLSelectElement>(null);
  const documentNumberRef = useRef<HTMLInputElement>(null);

  const fieldRefs = useMemo(
    () =>
      ({
        documentNumber: documentNumberRef,
        documentTypeId: documentTypeRef,
        firstName: firstNameRef,
        lastName: lastNameRef,
      }) satisfies Record<
        RegisterTeacherFormField,
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

  const updateFieldValue = (field: RegisterTeacherFormField, nextValue: string) => {
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

  const handleFieldBlur = (field: RegisterTeacherFormField) => {
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

    const nextErrors: RegisterTeacherFormErrors = {};
    const fieldOrder: RegisterTeacherFormField[] = [
      'firstName',
      'lastName',
      'documentTypeId',
      'documentNumber',
    ];

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
      const result = await registerTeacher(values);

      if (!result) {
        setIsSubmitting(false);
        return;
      }

      navigate(ROUTES.universityTeachers, {
        state: {
          successNotice: universityAdminContent.registerTeacherPage.successMessage,
        },
      });
    })();
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden sm:gap-5">
      <Seo
        description={universityAdminContent.registerTeacherPage.meta.description}
        noIndex
        title={universityAdminContent.registerTeacherPage.meta.title}
      />
      <AdminPageHeader
        action={
          <Link
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-4 py-3 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
            to={ROUTES.universityTeachers}
          >
            <ArrowLeft aria-hidden="true" className="h-4.5 w-4.5" />
            <span>{universityAdminContent.registerTeacherPage.backLabel}</span>
          </Link>
        }
        actionClassName="self-end sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2"
        className="relative gap-2.5 sm:min-h-[4rem] sm:justify-center"
        description=""
        headingAlign="center"
        title={universityAdminContent.registerTeacherPage.title}
        titleClassName="text-center sm:-mt-1"
      />
      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
          {errorMessage}
        </div>
      ) : null}
      <AdminPanelCard panelClassName="h-auto bg-slate-50">
        <form className="flex flex-col" noValidate onSubmit={handleSubmit}>
          <div className="px-6 py-5 sm:px-7 sm:py-6">
            <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
              <AdminTextField
                error={errors.firstName}
                icon={UserRound}
                id="register-teacher-first-name"
                inputRef={firstNameRef}
                label="Nombres"
                name="firstName"
                placeholder="Ingresa los nombres"
                value={values.firstName}
                onBlur={() => handleFieldBlur('firstName')}
                onChange={(value) => updateFieldValue('firstName', value)}
              />
              <AdminTextField
                error={errors.lastName}
                icon={UserRound}
                id="register-teacher-last-name"
                inputRef={lastNameRef}
                label="Apellidos"
                name="lastName"
                placeholder="Ingresa los apellidos"
                value={values.lastName}
                onBlur={() => handleFieldBlur('lastName')}
                onChange={(value) => updateFieldValue('lastName', value)}
              />
              <AdminSelectField
                error={errors.documentTypeId}
                icon={IdCard}
                id="register-teacher-document-type"
                label="Tipo de documento"
                name="documentTypeId"
                options={documentTypes}
                placeholder="Selecciona un tipo"
                selectRef={documentTypeRef}
                value={values.documentTypeId}
                onBlur={() => handleFieldBlur('documentTypeId')}
                onChange={(value) => updateFieldValue('documentTypeId', value)}
              />
              <AdminTextField
                error={errors.documentNumber}
                icon={IdCard}
                id="register-teacher-document-number"
                inputMode="numeric"
                inputRef={documentNumberRef}
                label="Número de documento"
                name="documentNumber"
                placeholder="Ingresa el número de documento"
                value={values.documentNumber}
                onBlur={() => handleFieldBlur('documentNumber')}
                onChange={(value) => updateFieldValue('documentNumber', keepOnlyDigits(value))}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-200/80 bg-white px-6 py-4 sm:px-7">
            <button
              className="inline-flex items-center justify-center rounded-2xl bg-brand-gradient px-5 py-3 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting || isLoading}
              type="submit"
            >
              {isSubmitting ? 'Registrando...' : universityAdminContent.registerTeacherPage.submitLabel}
            </button>
          </div>
        </form>
      </AdminPanelCard>
    </div>
  );
}
