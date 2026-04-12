import {
  Building2,
  CheckCircle2,
  Circle,
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
  X,
} from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AdminPasswordField } from '@/components/admin/AdminPasswordField';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminSelectField } from '@/components/admin/AdminSelectField';
import { AdminTextField } from '@/components/admin/AdminTextField';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { authContent } from '@/content/authContent';
import { universityAdminContent } from '@/content/universityAdminContent';
import type {
  AsyncCatalogState,
  CityOption,
  LocalityOption,
  PatientRegisterCatalogDataSource,
  UniversityCampus,
  UniversityInstitutionFormErrors,
  UniversityInstitutionFormField,
  UniversityInstitutionProfile,
  UniversityInstitutionFormValues,
  UniversityPasswordFormErrors,
  UniversityPasswordFormField,
  UniversityPasswordFormValues,
} from '@/content/types';
import { formatDisplayName } from '@/lib/formatDisplayName';
import { getOptimizedLogoUrl } from '@/lib/imageOptimization';
import { patientRegisterCatalogDataSource } from '@/lib/patientRegisterCatalogDataSource';
import { uploadUniversityAdminLogo } from '@/lib/universityAdminApi';
import { useUniversityAdminProfileStore } from '@/lib/universityAdminProfileStore';

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
type LogoUploadStatus = 'idle' | 'uploading' | 'ready' | 'error';

const campusInitialValues: CampusFormValues = {
  address: '',
  cityId: '',
  localityId: '',
  name: '',
  status: 'active',
};

const passwordRuleOrder = [
  'minLength',
  'uppercase',
  'lowercase',
  'number',
  'special',
] as const;

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
  institutionProfile: UniversityInstitutionProfile,
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
    return 'Ingresa un correo electrónico válido';
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
        return 'La dirección de la sede es obligatoria';
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

function getPasswordRequirementStatus(password: string) {
  return {
    lowercase: /[a-z]/.test(password),
    minLength: password.length >= 8,
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    uppercase: /[A-Z]/.test(password),
  };
}

function meetsAllPasswordRequirements(password: string) {
  const requirementStatus = getPasswordRequirementStatus(password);
  return passwordRuleOrder.every((ruleKey) => requirementStatus[ruleKey]);
}

function validatePasswordField(
  field: UniversityPasswordFormField,
  values: UniversityPasswordFormValues,
): string | undefined {
  const value = values[field].trim();

  if (!value) {
    switch (field) {
      case 'confirmPassword':
        return 'Confirma la nueva contraseña';
      case 'currentPassword':
        return 'Ingresa la contraseña actual';
      case 'newPassword':
        return 'Ingresa la nueva contraseña';
      default:
        return undefined;
    }
  }

  if (field === 'newPassword' && !meetsAllPasswordRequirements(value)) {
    return authContent.register.password.requirementsMessage;
  }

  if (
    field === 'confirmPassword' &&
    values.confirmPassword.trim() &&
    values.confirmPassword !== values.newPassword
  ) {
    return 'La confirmación no coincide con la nueva contraseña';
  }

  return undefined;
}

function getUploadErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'No pudimos subir el logo institucional.';
}

export function UniversityInstitutionPage({
  catalogDataSource = patientRegisterCatalogDataSource,
}: UniversityInstitutionPageProps) {
  const { changePassword, errorMessage, institutionProfile, isLoading, updateInstitutionProfile } =
    useUniversityAdminProfileStore();
  const [values, setValues] = useState(() => getInstitutionInitialValues(institutionProfile));
  const [errors, setErrors] = useState<UniversityInstitutionFormErrors>({});
  const [citiesState, setCitiesState] = useState<AsyncCatalogState<CityOption>>(
    () => createInitialCatalogState(catalogDataSource.getCities(), 'loading'),
  );
  const [localitiesState, setLocalitiesState] = useState<AsyncCatalogState<LocalityOption>>(
    () => {
      const initialValues = getInstitutionInitialValues(institutionProfile);

      if (!initialValues.cityId) {
        return createEmptyCatalogState('idle');
      }

      return createInitialCatalogState(
        catalogDataSource.getLocalitiesByCity(initialValues.cityId),
        'loading',
      );
    },
  );
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isPasswordPanelOpen, setIsPasswordPanelOpen] = useState(false);
  const [passwordValues, setPasswordValues] = useState(passwordInitialValues);
  const [passwordErrors, setPasswordErrors] = useState<UniversityPasswordFormErrors>({});
  const [passwordWarningMessage, setPasswordWarningMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [campusDraft, setCampusDraft] = useState(campusInitialValues);
  const [campusErrors, setCampusErrors] = useState<CampusFormErrors>({});
  const [editingCampusId, setEditingCampusId] = useState<string | null>(null);
  const [logoUploadStatus, setLogoUploadStatus] = useState<LogoUploadStatus>('idle');
  const [logoUploadMessage, setLogoUploadMessage] = useState<string | null>(null);
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
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const logoPreviewUrlRef = useRef<string | null>(null);
  const logoUploadPromiseRef = useRef<Promise<string | null> | null>(null);
  const logoUploadSequenceRef = useRef(0);
  const [showPasswords, setShowPasswords] = useState({
    confirmPassword: false,
    currentPassword: false,
    newPassword: false,
  });

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
  const passwordFieldRefs = useMemo(
    () =>
      ({
        confirmPassword: confirmPasswordRef,
        currentPassword: currentPasswordRef,
        newPassword: newPasswordRef,
      }) satisfies Record<
        UniversityPasswordFormField,
        { current: HTMLInputElement | null }
      >,
    [],
  );
  const passwordRequirementStatus = useMemo(
    () => getPasswordRequirementStatus(passwordValues.newPassword),
    [passwordValues.newPassword],
  );

  useEffect(() => {
    if (logoPreviewUrlRef.current) {
      URL.revokeObjectURL(logoPreviewUrlRef.current);
      logoPreviewUrlRef.current = null;
    }
    logoUploadSequenceRef.current += 1;
    logoUploadPromiseRef.current = null;
    setValues(getInstitutionInitialValues(institutionProfile));
    setLocalitiesState(
      institutionProfile.mainCityId
        ? createInitialCatalogState(
            catalogDataSource.getLocalitiesByCity(institutionProfile.mainCityId),
            'loading',
          )
        : createEmptyCatalogState('idle'),
    );
    setCampusDraft(campusInitialValues);
    setCampusErrors({});
    setEditingCampusId(null);
    setLogoUploadStatus('idle');
    setLogoUploadMessage(null);
  }, [catalogDataSource, institutionProfile]);

  useEffect(
    () => () => {
      if (logoPreviewUrlRef.current) {
        URL.revokeObjectURL(logoPreviewUrlRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!saveMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSaveMessage(null);
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [saveMessage]);

  useEffect(() => {
    if (!isPasswordPanelOpen) {
      return undefined;
    }

    currentPasswordRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsPasswordPanelOpen(false);
        setPasswordErrors({});
        setPasswordValues(passwordInitialValues);
        setPasswordWarningMessage(null);
        setPasswordMessage(null);
        setShowPasswords({
          confirmPassword: false,
          currentPassword: false,
          newPassword: false,
        });
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPasswordPanelOpen]);

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

    const uploadSequence = logoUploadSequenceRef.current + 1;
    logoUploadSequenceRef.current = uploadSequence;

    if (logoPreviewUrlRef.current) {
      URL.revokeObjectURL(logoPreviewUrlRef.current);
    }

    const previewUrl = URL.createObjectURL(file);
    logoPreviewUrlRef.current = previewUrl;
    handleInstitutionFieldChange('logoFileName', file.name);
    handleInstitutionFieldChange('logoSrc', previewUrl);
    setLogoUploadStatus('uploading');
    setLogoUploadMessage('Subiendo logo...');
    event.target.value = '';

    const uploadPromise = uploadUniversityAdminLogo(file)
      .then((result) => {
        if (logoUploadSequenceRef.current !== uploadSequence) {
          return null;
        }

        if (logoPreviewUrlRef.current) {
          URL.revokeObjectURL(logoPreviewUrlRef.current);
          logoPreviewUrlRef.current = null;
        }

        handleInstitutionFieldChange('logoFileName', result.logoFileName || file.name);
        handleInstitutionFieldChange('logoSrc', result.logoSrc);
        setLogoUploadStatus('ready');
        setLogoUploadMessage('Logo cargado. Ya puedes guardar los cambios.');
        return result.logoSrc;
      })
      .catch((error: unknown) => {
        if (logoUploadSequenceRef.current !== uploadSequence) {
          return null;
        }

        setLogoUploadStatus('error');
        setLogoUploadMessage(getUploadErrorMessage(error));
        return null;
      })
      .finally(() => {
        if (logoUploadSequenceRef.current === uploadSequence) {
          logoUploadPromiseRef.current = null;
        }
      });

    logoUploadPromiseRef.current = uploadPromise;
  };

  const validateInstitutionValues = (nextValues: UniversityInstitutionFormValues) => {
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
      const rawValue = nextValues[field];
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
      return false;
    }

    return true;
  };

  const persistInstitutionValues = async (
    nextValues: UniversityInstitutionFormValues,
    successMessage: string = universityAdminContent.institutionPage.successMessage,
  ) => {
    if (!validateInstitutionValues(nextValues)) {
      return false;
    }

    if (logoUploadStatus === 'error') {
      setSaveMessage(null);
      return false;
    }

    let submissionValues = nextValues;

    if (logoUploadPromiseRef.current) {
      setLogoUploadMessage('Terminando de subir el logo...');
      const uploadedLogoSrc = await logoUploadPromiseRef.current;

      if (!uploadedLogoSrc) {
        setSaveMessage(null);
        return false;
      }

      submissionValues = {
        ...nextValues,
        logoSrc: uploadedLogoSrc,
      };
    }

    const updated = await updateInstitutionProfile(submissionValues);

    if (!updated) {
      return false;
    }

    setSaveMessage(successMessage);
    return true;
  };

  const handleInstitutionSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    void persistInstitutionValues(values);
  };

  const handleReset = () => {
    if (logoPreviewUrlRef.current) {
      URL.revokeObjectURL(logoPreviewUrlRef.current);
      logoPreviewUrlRef.current = null;
    }
    logoUploadSequenceRef.current += 1;
    logoUploadPromiseRef.current = null;
    setValues(getInstitutionInitialValues(institutionProfile));
    setCampusDraft(campusInitialValues);
    setCampusErrors({});
    setEditingCampusId(null);
    setErrors({});
    setPasswordErrors({});
    setPasswordValues(passwordInitialValues);
    setPasswordWarningMessage(null);
    setPasswordMessage(null);
    setLogoUploadStatus('idle');
    setLogoUploadMessage(null);
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

  const openPasswordPanel = () => {
    setPasswordErrors({});
    setPasswordValues(passwordInitialValues);
    setPasswordWarningMessage(null);
    setPasswordMessage(null);
    setShowPasswords({
      confirmPassword: false,
      currentPassword: false,
      newPassword: false,
    });
    setIsPasswordPanelOpen(true);
  };

  const closePasswordPanel = () => {
    setIsPasswordPanelOpen(false);
    setPasswordErrors({});
    setPasswordValues(passwordInitialValues);
    setPasswordWarningMessage(null);
    setPasswordMessage(null);
    setShowPasswords({
      confirmPassword: false,
      currentPassword: false,
      newPassword: false,
    });
  };

  const handleCampusSubmit = () => {
    if (isLoading) {
      return;
    }

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
    const nextValues: UniversityInstitutionFormValues = {
      ...values,
      campuses: editingCampusId
        ? values.campuses.map((campus) =>
            campus.id === editingCampusId ? nextCampus : campus,
          )
        : [nextCampus, ...values.campuses],
    };

    if (!validateInstitutionValues(nextValues)) {
      return;
    }

    if (logoUploadStatus === 'error') {
      setSaveMessage(null);
      return;
    }

    const previousValues = values;

    setValues(nextValues);
    setSaveMessage(null);

    void (async () => {
      const updated = await persistInstitutionValues(
        nextValues,
        editingCampusId
          ? 'La sede se actualizo correctamente.'
          : 'La sede se registro correctamente.',
      );

      if (!updated) {
        setValues(previousValues);
        return;
      }

      handleCampusReset();
    })();
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

  const handlePasswordFieldBlur = (field: UniversityPasswordFormField) => {
    setPasswordErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      const nextFieldError = validatePasswordField(field, passwordValues);

      if (nextFieldError) {
        nextErrors[field] = nextFieldError;
      } else {
        delete nextErrors[field];
      }

      if (field === 'newPassword' || field === 'confirmPassword') {
        const confirmError = validatePasswordField('confirmPassword', passwordValues);

        if (confirmError) {
          nextErrors.confirmPassword = confirmError;
        } else {
          delete nextErrors.confirmPassword;
        }
      }

      return nextErrors;
    });
  };

  const togglePasswordVisibility = (field: UniversityPasswordFormField) => {
    setShowPasswords((currentValues) => ({
      ...currentValues,
      [field]: !currentValues[field],
    }));
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
    setPasswordWarningMessage(null);
    setPasswordMessage(null);

    const firstErrorField = fieldOrder.find((field) => nextErrors[field]);

    if (firstErrorField) {
      passwordFieldRefs[firstErrorField].current?.focus();
      return;
    }

    void (async () => {
      const result = await changePassword(passwordValues);

      if (!result.ok) {
        setPasswordWarningMessage(
          result.errorMessage ?? 'No pudimos actualizar la contraseña.',
        );
        return;
      }

      setPasswordValues(passwordInitialValues);
      setPasswordErrors({});
      setPasswordWarningMessage(null);
      setPasswordMessage(null);
      setShowPasswords({
        confirmPassword: false,
        currentPassword: false,
        newPassword: false,
      });
      setIsPasswordPanelOpen(false);
      setSaveMessage(universityAdminContent.institutionPage.passwordSuccessMessage);
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
  const isLogoUploading = logoUploadStatus === 'uploading';
  const isLogoUploadBlocked = isLogoUploading || logoUploadStatus === 'error';
  const logoUploadMessageClassName =
    logoUploadStatus === 'error'
      ? 'text-[0.68rem] font-medium text-rose-600'
      : logoUploadStatus === 'ready'
        ? 'text-[0.68rem] font-medium text-emerald-700'
        : 'text-[0.68rem] font-medium text-primary';

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <Seo
        description={universityAdminContent.institutionPage.meta.description}
        noIndex
        title={universityAdminContent.institutionPage.meta.title}
      />
      <AdminPageHeader
        description={universityAdminContent.institutionPage.description}
        headingAlign="center"
        title={universityAdminContent.institutionPage.title}
        titleClassName="text-center text-[1.7rem] sm:text-[2rem]"
      />
      {saveMessage ? (
        <SurfaceCard
          className="border border-emerald-200 bg-emerald-50/90 text-sm font-medium text-emerald-800"
          paddingClassName="p-3.5"
        >
          <p role="status">{saveMessage}</p>
        </SurfaceCard>
      ) : null}
      {errorMessage && !isPasswordPanelOpen ? (
        <SurfaceCard
          className="border border-rose-200 bg-rose-50/90 text-sm font-medium text-rose-800"
          paddingClassName="p-3.5"
        >
          <p role="alert">{errorMessage}</p>
        </SurfaceCard>
      ) : null}
      <AdminPanelCard className="flex-1" panelClassName="bg-slate-50">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-5">
            <div className="space-y-4 pb-5">
              <SurfaceCard
                className="overflow-hidden bg-white shadow-none"
                paddingClassName="p-0"
              >
                <div className="space-y-4">
                  <div className="space-y-4 rounded-[1.6rem] border border-slate-200/80 bg-slate-50/80 p-4 sm:p-5">
                    <div>
                      <h2 className="text-center font-headline text-[1.15rem] font-extrabold tracking-tight text-ink">
                        {universityAdminContent.institutionPage.sectionTitles.institution}
                      </h2>
                    </div>
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(13.5rem,15rem)] xl:items-start">
                      <div className="grid gap-4 lg:grid-cols-2">
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
                      <div className="space-y-2 self-start rounded-[1.2rem] border border-dashed border-slate-300 bg-slate-50 p-3 text-center xl:-mt-10">
                        <div className="space-y-0.5">
                          <p className="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-primary">
                            Logo institucional
                          </p>
                        </div>
                        <div className="flex flex-col items-center gap-2.5">
                          <div
                            aria-busy={isLogoUploading}
                            className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-[1.15rem] bg-white ring-1 ring-slate-200"
                          >
                            {values.logoSrc ? (
                              <img
                                alt={institutionProfile.logoAlt}
                                className="h-full w-full object-contain"
                                decoding="async"
                                src={getOptimizedLogoUrl(values.logoSrc, 720, 720)}
                              />
                            ) : (
                              <span className="font-headline text-[1.35rem] font-extrabold tracking-tight text-primary">
                                {logoInitials || 'UC'}
                              </span>
                            )}
                            {isLogoUploading ? (
                              <span className="absolute inset-x-0 bottom-0 bg-primary/90 px-2 py-1 text-[0.62rem] font-semibold text-white">
                                Subiendo
                              </span>
                            ) : null}
                          </div>
                          <div className="space-y-1">
                            <label
                              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-brand-gradient px-3 py-1.5 text-[0.72rem] font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110"
                              htmlFor="institution-logo-input"
                            >
                              <ImagePlus aria-hidden="true" className="h-3.5 w-3.5" />
                              <span>{universityAdminContent.institutionPage.actionLabels.uploadLogo}</span>
                            </label>
                            <input
                              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                              className="sr-only"
                              id="institution-logo-input"
                              type="file"
                              onChange={handleLogoSelection}
                            />
                            {logoUploadMessage ? (
                              <p
                                className={logoUploadMessageClassName}
                                role={logoUploadStatus === 'error' ? 'alert' : 'status'}
                              >
                                {logoUploadMessage}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-[1.6rem] border border-slate-200/80 bg-slate-50/80 p-4 sm:p-5">
                        <div className="text-center">
                          <div className="w-full">
                            <h3 className="text-center font-headline text-[1rem] font-extrabold tracking-tight text-ink">
                              Sedes de la universidad
                            </h3>
                          </div>
                        </div>
                        <div className="grid gap-3 lg:grid-cols-2">
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
                            label="Dirección"
                            name="campusAddress"
                            placeholder="Ingresa la dirección"
                            value={campusDraft.address}
                            onBlur={() => handleCampusFieldBlur('address')}
                            onChange={(value) => handleCampusFieldChange('address', value)}
                          />
                          <div className="grid gap-3 lg:col-span-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(8rem,0.45fr)] md:items-start">
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
                              <div className="space-y-1">
                                <span className="block text-[0.83rem] font-semibold text-ink">Estado</span>
                                <div className="inline-flex min-h-[2.75rem] w-full items-center rounded-2xl border border-slate-200 bg-surface px-3.5 py-2.5 text-[0.83rem] font-semibold text-ink">
                                  Activa
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div
                          className="flex flex-wrap items-center justify-center gap-3"
                          style={{ marginTop: 30 }}
                        >
                          {editingCampusId ? (
                            <button
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[0.82rem] font-semibold text-ink transition duration-300 hover:bg-slate-100"
                              type="button"
                              onClick={handleCampusReset}
                            >
                              <RotateCcw aria-hidden="true" className="h-4 w-4" />
                              <span>Cancelar edicion</span>
                            </button>
                          ) : null}
                          <button
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-gradient px-3.5 py-2.5 text-[0.82rem] font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110"
                            disabled={isLoading || isLogoUploadBlocked}
                            type="button"
                            onClick={handleCampusSubmit}
                          >
                            {editingCampusId ? (
                              <Save aria-hidden="true" className="h-4 w-4" />
                            ) : (
                              <Plus aria-hidden="true" className="h-4 w-4" />
                            )}
                            <span>
                              {isLoading
                                ? 'Guardando...'
                                : editingCampusId
                                  ? 'Guardar sede'
                                  : 'Agregar sede'}
                            </span>
                          </button>
                        </div>
                        <div
                          className="mt-[30px] grid gap-2.5"
                          style={{ marginTop: 30 }}
                        >
                          {values.campuses.length > 0 ? (
                            <div className="hidden gap-2.5 px-3 text-[0.66rem] font-extrabold uppercase tracking-[0.14em] text-ink md:grid md:grid-cols-[minmax(7rem,1fr)_minmax(8rem,1.15fr)_minmax(7rem,0.85fr)_minmax(7rem,0.85fr)_minmax(5.5rem,0.55fr)_minmax(6.5rem,0.55fr)] md:items-center">
                              <span>Nombre</span>
                              <span>Dirección</span>
                              <span>Ciudad</span>
                              <span>Localidad</span>
                              <span>Estado</span>
                              <span className="justify-self-end">Acción</span>
                            </div>
                          ) : null}
                          {values.campuses.map((campus) => (
                            <div
                              key={campus.id}
                              className="grid gap-2.5 rounded-[1.15rem] border border-slate-200/80 bg-white p-3 md:grid-cols-[minmax(7rem,1fr)_minmax(8rem,1.15fr)_minmax(7rem,0.85fr)_minmax(7rem,0.85fr)_minmax(5.5rem,0.55fr)_minmax(6.5rem,0.55fr)] md:items-center"
                            >
                              <h4 className="min-w-0 truncate text-[0.83rem] font-semibold text-ink">
                                {formatDisplayName(campus.name)}
                              </h4>
                              <p className="min-w-0 truncate text-[0.82rem] text-ink-muted">
                                {campus.address}
                              </p>
                              <p className="min-w-0 truncate text-[0.78rem] font-semibold text-ink-muted">
                                {campus.city}
                              </p>
                              <p className="min-w-0 truncate text-[0.78rem] font-semibold text-ink-muted">
                                {campus.locality}
                              </p>
                              <span
                                className={
                                  campus.status === 'active'
                                    ? 'inline-flex w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-[0.66rem] font-semibold text-emerald-700 ring-1 ring-emerald-200'
                                    : 'inline-flex w-fit rounded-full bg-white px-2.5 py-1 text-[0.66rem] font-semibold text-slate-600 ring-1 ring-slate-200'
                                }
                              >
                                {campus.status === 'active' ? 'Activa' : 'Inactiva'}
                              </span>
                              <button
                                className="inline-flex items-center justify-center gap-2 justify-self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-[0.8rem] font-semibold text-primary transition duration-300 hover:bg-slate-100 md:justify-self-end"
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

                  <div className="space-y-4 rounded-[1.6rem] border border-slate-200/80 bg-slate-50/80 p-4 sm:p-5">
                    <div>
                      <h2 className="text-center font-headline text-[1.15rem] font-extrabold tracking-tight text-ink">
                        {universityAdminContent.institutionPage.sectionTitles.administrator}
                      </h2>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
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
                      <div className="grid gap-4 md:grid-cols-2 lg:col-span-2">
                        <AdminTextField
                          error={errors.adminEmail}
                          icon={Mail}
                          id="university-institution-admin-email"
                          inputRef={emailRef}
                          label="Correo electrónico"
                          name="adminEmail"
                          placeholder="admin@universidad.edu.co"
                          type="email"
                          value={values.adminEmail}
                          onBlur={() => handleInstitutionFieldBlur('adminEmail')}
                          onChange={(value) => handleInstitutionFieldChange('adminEmail', value)}
                        />
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
                      </div>
                      <div className="flex justify-center lg:col-span-2">
                        <button
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[0.82rem] font-semibold text-primary transition duration-300 hover:bg-slate-100"
                          type="button"
                          onClick={openPasswordPanel}
                        >
                          <KeyRound aria-hidden="true" className="h-4 w-4" />
                          <span>{universityAdminContent.institutionPage.actionLabels.changePassword}</span>
                        </button>
                      </div>
                    </div>
                  </div>
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
              disabled={isLoading || isLogoUploadBlocked}
              type="button"
              onClick={() => handleInstitutionSubmit()}
            >
              <Save aria-hidden="true" className="h-4 w-4" />
              <span>{universityAdminContent.institutionPage.actionLabels.save}</span>
            </button>
          </div>
        </div>
      </AdminPanelCard>
      {isPasswordPanelOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
          role="dialog"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closePasswordPanel();
            }
          }}
        >
          <SurfaceCard
            className="w-full max-w-[44rem] overflow-hidden border border-slate-200/80 bg-white shadow-[0_30px_80px_-35px_rgba(15,23,42,0.38)]"
            paddingClassName="p-0"
          >
            <div className="border-b border-slate-200/80 bg-slate-50/85 px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[0.68rem] font-black uppercase tracking-[0.26em] text-primary">
                    Seguridad de acceso
                  </p>
                  <h2
                    className="font-headline text-[1.45rem] font-extrabold tracking-tight text-ink"
                    id="university-password-dialog-title"
                  >
                    {universityAdminContent.institutionPage.passwordPanelTitle}
                  </h2>
                  {universityAdminContent.institutionPage.passwordPanelDescription ? (
                    <p className="max-w-[34rem] text-sm leading-6 text-ink-muted">
                      {universityAdminContent.institutionPage.passwordPanelDescription}
                    </p>
                  ) : null}
                </div>
                <button
                  aria-label="Cerrar diálogo de cambio de contraseña"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-ink-muted transition duration-300 hover:border-primary/20 hover:text-primary"
                  type="button"
                  onClick={closePasswordPanel}
                >
                  <X aria-hidden="true" className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
            <form className="space-y-5 px-5 py-5 sm:px-6 sm:py-6" noValidate onSubmit={handlePasswordSubmit}>
              {passwordWarningMessage ? (
                <p
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-medium text-rose-700"
                  role="alert"
                >
                  {passwordWarningMessage}
                </p>
              ) : null}
              {passwordMessage ? (
                <p className="text-sm font-medium text-ink" role="status">
                  {passwordMessage}
                </p>
              ) : null}
              <AdminPasswordField
                error={passwordErrors.currentPassword}
                hidePasswordLabel={authContent.register.password.hidePasswordLabel}
                id="university-password-current"
                inputRef={currentPasswordRef}
                label="Contraseña actual"
                name="currentPassword"
                placeholder="Ingresa la contraseña actual"
                showPassword={showPasswords.currentPassword}
                showPasswordLabel={authContent.register.password.showPasswordLabel}
                value={passwordValues.currentPassword}
                onBlur={() => handlePasswordFieldBlur('currentPassword')}
                onChange={(value) => handlePasswordFieldChange('currentPassword', value)}
                onToggleVisibility={() => togglePasswordVisibility('currentPassword')}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <AdminPasswordField
                  error={passwordErrors.newPassword}
                  hidePasswordLabel={authContent.register.password.hidePasswordLabel}
                  id="university-password-new"
                  inputRef={newPasswordRef}
                  label="Nueva contraseña"
                  name="newPassword"
                  placeholder="Crea una contraseña segura"
                  showPassword={showPasswords.newPassword}
                  showPasswordLabel={authContent.register.password.showPasswordLabel}
                  value={passwordValues.newPassword}
                  onBlur={() => handlePasswordFieldBlur('newPassword')}
                  onChange={(value) => handlePasswordFieldChange('newPassword', value)}
                  onToggleVisibility={() => togglePasswordVisibility('newPassword')}
                />
                <AdminPasswordField
                  error={passwordErrors.confirmPassword}
                  hidePasswordLabel={authContent.register.password.hidePasswordLabel}
                  id="university-password-confirm"
                  inputRef={confirmPasswordRef}
                  label="Confirmar contraseña"
                  name="confirmPassword"
                  placeholder="Repite la nueva contraseña"
                  showPassword={showPasswords.confirmPassword}
                  showPasswordLabel={authContent.register.password.showPasswordLabel}
                  value={passwordValues.confirmPassword}
                  onBlur={() => handlePasswordFieldBlur('confirmPassword')}
                  onChange={(value) => handlePasswordFieldChange('confirmPassword', value)}
                  onToggleVisibility={() => togglePasswordVisibility('confirmPassword')}
                />
              </div>
              <div className="rounded-[1.45rem] border border-slate-200/80 bg-slate-50/85 p-4">
                <p className="text-[0.7rem] font-black uppercase tracking-[0.24em] text-primary/80">
                  Requisitos de la nueva contraseña
                </p>
                <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  {authContent.register.password.requirements.map((requirement) => {
                    const isMet = passwordRequirementStatus[requirement.key];

                    return (
                      <li
                        className={isMet ? 'flex items-start gap-2.5 text-emerald-700' : 'flex items-start gap-2.5 text-ink-muted'}
                        key={requirement.key}
                      >
                        {isMet ? (
                          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                        ) : (
                          <Circle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                        )}
                        <span>{requirement.label}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink transition duration-300 hover:bg-slate-50"
                  type="button"
                  onClick={closePasswordPanel}
                >
                  Cancelar
                </button>
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
        </div>
      ) : null}
    </div>
  );
}
