import {
  CalendarDays,
  ImagePlus,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Save,
  Star,
  UserRound,
} from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminTextField } from '@/components/admin/AdminTextField';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { patientContent } from '@/content/patientContent';
import type {
  PatientProfile,
  PatientProfileFormErrors,
  PatientProfileFormValues,
} from '@/content/types';
import { useAutoDismissSystemMessage } from '@/hooks/useAutoDismissSystemMessage';
import {
  getOptimizedAvatarUrl,
  readOptimizedImageFileAsDataUrl,
} from '@/lib/imageOptimization';
import { usePatientModuleStore } from '@/lib/patientModuleStore';
import {
  PHONE_NUMBER_DIGITS_MESSAGE,
  normalizePhoneNumberInput,
  PHONE_NUMBER_MAX_DIGITS,
} from '@/lib/phoneNumber';
import { calculateAverageRating } from '@/lib/ratings';

function getInitialValues(profile: PatientProfile): PatientProfileFormValues {
  return {
    avatarFileName: profile.avatarFileName,
    avatarSrc: profile.avatarSrc,
    city: profile.city,
    locality: profile.locality,
    phone: profile.phone,
  };
}

function areProfileFormValuesEqual(
  firstValues: PatientProfileFormValues,
  secondValues: PatientProfileFormValues,
) {
  return (
    firstValues.avatarFileName === secondValues.avatarFileName &&
    firstValues.avatarSrc === secondValues.avatarSrc &&
    firstValues.city === secondValues.city &&
    firstValues.locality === secondValues.locality &&
    firstValues.phone === secondValues.phone
  );
}

function validateProfile(
  values: PatientProfileFormValues,
): PatientProfileFormErrors {
  const errors: PatientProfileFormErrors = {};

  if (!values.phone.trim()) {
    errors.phone = 'Ingresa un numero de celular.';
  } else if (values.phone.trim().length !== PHONE_NUMBER_MAX_DIGITS) {
    errors.phone = PHONE_NUMBER_DIGITS_MESSAGE;
  }

  if (!values.city.trim()) {
    errors.city = 'Ingresa la ciudad principal.';
  }

  if (!values.locality.trim()) {
    errors.locality = 'Ingresa la localidad principal.';
  }

  return errors;
}

export function PatientProfilePage() {
  const { errorMessage, isLoading, profile, reviews, updateProfile } =
    usePatientModuleStore();
  const averageRating = useMemo(() => {
    if (reviews.length === 0) return null;
    return calculateAverageRating(reviews.map((review) => review.rating));
  }, [reviews]);
  const [values, setValues] = useState<PatientProfileFormValues>(() =>
    getInitialValues(profile),
  );
  const valuesRef = useRef(values);
  const lastSyncedProfileValuesRef = useRef<PatientProfileFormValues>(
    getInitialValues(profile),
  );
  const lastSyncedProfileIdRef = useRef(profile.id);
  const [errors, setErrors] = useState<PatientProfileFormErrors>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useAutoDismissSystemMessage(saveMessage, () => {
    setSaveMessage(null);
  });

  const patientInitials = useMemo(
    () =>
      `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase(),
    [profile.firstName, profile.lastName],
  );

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  useEffect(() => {
    const nextProfileValues = getInitialValues(profile);
    const previousProfileValues = lastSyncedProfileValuesRef.current;
    const isSameProfile = lastSyncedProfileIdRef.current === profile.id;
    const hasUnsavedChanges =
      isSameProfile &&
      !areProfileFormValuesEqual(valuesRef.current, previousProfileValues);

    lastSyncedProfileValuesRef.current = nextProfileValues;
    lastSyncedProfileIdRef.current = profile.id;

    if (hasUnsavedChanges) {
      return;
    }

    valuesRef.current = nextProfileValues;
    setValues(nextProfileValues);
    setErrors({});
    setSaveMessage(null);
  }, [profile]);

  const handleFieldChange = <K extends keyof PatientProfileFormValues>(
    field: K,
    nextValue: PatientProfileFormValues[K],
  ) => {
    setValues((currentValues) => {
      const nextValues = {
        ...currentValues,
        [field]: nextValue,
      };

      valuesRef.current = nextValues;
      return nextValues;
    });
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
    setSaveMessage(null);
  };

  const handleAvatarSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    void (async () => {
      const avatarSrc = await readOptimizedImageFileAsDataUrl(file, {
        fit: 'cover',
        maxHeight: 800,
        maxWidth: 800,
      });
      handleFieldChange('avatarFileName', file.name);
      handleFieldChange('avatarSrc', avatarSrc);
    })();
  };

  const handleSave = () => {
    const nextErrors = validateProfile(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    void (async () => {
      const updated = await updateProfile(values);

      if (!updated) {
        return;
      }

      setSaveMessage(patientContent.profilePage.successMessage);
    })();
  };

  return (
    <div className="flex h-full w-full min-h-0 flex-col gap-2 overflow-hidden lg:gap-2.5">
      <Seo
        description={patientContent.profilePage.meta.description}
        noIndex
        title={patientContent.profilePage.meta.title}
      />
      <AdminPageHeader
        className="items-center lg:items-center lg:justify-center lg:gap-2"
        description={patientContent.profilePage.description}
        descriptionClassName="lg:text-sm lg:leading-5"
        headingAlign="center"
        title={patientContent.profilePage.title}
        titleClassName="lg:text-2xl xl:text-[1.7rem]"
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
      <AdminPanelCard className="flex-1" panelClassName="bg-[#f4f8ff]">
        <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4 lg:overflow-hidden lg:px-3.5 lg:py-3 xl:px-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
            <SurfaceCard
              className="overflow-hidden bg-brand-gradient text-white shadow-none"
              paddingClassName="p-0"
            >
              <div className="flex h-full flex-col px-5 py-5 lg:px-3.5 lg:py-3.5 xl:px-4 xl:py-4">
                <div className="flex items-center gap-4 lg:gap-3">
                  {values.avatarSrc ? (
                    <img
                      alt={profile.avatarAlt}
                      className="h-20 w-20 rounded-[1.75rem] object-cover ring-4 ring-white/25 lg:h-14 lg:w-14 lg:rounded-[1.1rem] xl:h-16 xl:w-16"
                      decoding="async"
                      src={getOptimizedAvatarUrl(values.avatarSrc, 240)}
                    />
                  ) : (
                    <span className="inline-flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-white/14 text-2xl font-extrabold uppercase text-white ring-4 ring-white/15 lg:h-14 lg:w-14 lg:rounded-[1.1rem] lg:text-lg xl:h-16 xl:w-16">
                      {patientInitials}
                    </span>
                  )}
                  <div className="min-w-0 space-y-1 lg:space-y-0.5">
                    <h2 className="font-headline text-[1.45rem] font-extrabold tracking-tight text-white lg:text-[1.05rem] xl:text-[1.18rem]">
                      {profile.firstName} {profile.lastName}
                    </h2>
                    <p className="text-sm font-medium text-white/88 lg:text-[0.72rem]">
                      {profile.email}
                    </p>
                    <span className="inline-flex rounded-full bg-white/14 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/18 lg:px-2 lg:py-0.5 lg:text-[0.62rem]">
                      Paciente activo en la plataforma
                    </span>
                  </div>
                </div>
                <div className="mt-5 space-y-3 text-sm text-white/90 lg:mt-3 lg:space-y-2">
                  <div className="flex items-start gap-3 rounded-[1.25rem] bg-white/10 px-4 py-3 lg:gap-2 lg:rounded-[0.95rem] lg:px-3 lg:py-2">
                    <Phone
                      aria-hidden="true"
                      className="mt-0.5 h-4.5 w-4.5 shrink-0 text-white"
                    />
                    <div className="min-w-0">
                      <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/65 lg:text-[0.58rem] lg:tracking-[0.13em]">
                        Celular
                      </p>
                      <p className="truncate font-semibold text-white lg:text-[0.78rem]">
                        {profile.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-[1.25rem] bg-white/10 px-4 py-3 lg:gap-2 lg:rounded-[0.95rem] lg:px-3 lg:py-2">
                    <MapPin
                      aria-hidden="true"
                      className="mt-0.5 h-4.5 w-4.5 shrink-0 text-white"
                    />
                    <div className="min-w-0">
                      <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/65 lg:text-[0.58rem] lg:tracking-[0.13em]">
                        Ubicacion
                      </p>
                      <p className="truncate font-semibold text-white lg:text-[0.78rem]">
                        {profile.city} - {profile.locality}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-[1.25rem] bg-white/10 px-4 py-3 lg:gap-2 lg:rounded-[0.95rem] lg:px-3 lg:py-2">
                    <CalendarDays
                      aria-hidden="true"
                      className="mt-0.5 h-4.5 w-4.5 shrink-0 text-white"
                    />
                    <div className="min-w-0">
                      <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/65 lg:text-[0.58rem] lg:tracking-[0.13em]">
                        Fecha de nacimiento
                      </p>
                      <p className="truncate font-semibold text-white lg:text-[0.78rem]">
                        {new Date(
                          `${profile.birthDate}T00:00:00`,
                        ).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                  </div>
                  {averageRating !== null ? (
                    <div className="flex items-start gap-3 rounded-[1.25rem] bg-white/10 px-4 py-3 lg:gap-2 lg:rounded-[0.95rem] lg:px-3 lg:py-2">
                      <Star
                        aria-hidden="true"
                        className="mt-0.5 h-4.5 w-4.5 shrink-0 fill-amber-300 text-amber-300"
                      />
                      <div className="min-w-0">
                        <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/65 lg:text-[0.58rem] lg:tracking-[0.13em]">
                          Calificacion promedio
                        </p>
                        <p className="truncate font-semibold text-white lg:text-[0.78rem]">
                          {averageRating.toFixed(1)} / 5{' '}
                          <span className="text-xs font-normal text-white/70">
                            ({reviews.length}{' '}
                            {reviews.length === 1
                              ? 'valoracion'
                              : 'valoraciones'}
                            )
                          </span>
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </SurfaceCard>
            <div className="space-y-4 lg:space-y-3">
              <SurfaceCard
                className="border border-slate-200/80 bg-white shadow-none"
                paddingClassName="p-4 lg:p-3.5 xl:p-4"
              >
                <div className="space-y-5 lg:space-y-3">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
                    <div>
                      <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink lg:text-[1rem]">
                        Datos de contacto
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-ink-muted lg:text-[0.76rem] lg:leading-4">
                        Actualiza la informacion que acompanara tus solicitudes
                        y conversaciones.
                      </p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-primary transition duration-300 hover:bg-slate-100 lg:rounded-xl lg:px-3 lg:py-2 lg:text-[0.76rem]">
                      <ImagePlus aria-hidden="true" className="h-4 w-4" />
                      <span>
                        {patientContent.profilePage.actionLabels.uploadPhoto}
                      </span>
                      <input
                        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                        className="sr-only"
                        type="file"
                        onChange={handleAvatarSelection}
                      />
                    </label>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2 lg:gap-3">
                    <div className="space-y-1.5 lg:space-y-1">
                      <label className="block text-sm font-semibold text-ink lg:text-[0.78rem]">
                        Correo electronico
                      </label>
                      <div className="flex min-h-12 items-center rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-ink lg:min-h-10 lg:rounded-[1rem] lg:px-3 lg:text-[0.78rem]">
                        <Mail
                          aria-hidden="true"
                          className="mr-2 h-4 w-4 text-primary"
                        />
                        {profile.email}
                      </div>
                    </div>
                    <div className="space-y-1.5 lg:space-y-1">
                      <label className="block text-sm font-semibold text-ink lg:text-[0.78rem]">
                        Sexo
                      </label>
                      <div className="flex min-h-12 items-center rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-ink lg:min-h-10 lg:rounded-[1rem] lg:px-3 lg:text-[0.78rem]">
                        <UserRound
                          aria-hidden="true"
                          className="mr-2 h-4 w-4 text-primary"
                        />
                        {profile.sex}
                      </div>
                    </div>
                    <AdminTextField
                      error={errors.phone}
                      icon={Phone}
                      id="patient-profile-phone"
                      inputMode="numeric"
                      label="Celular"
                      labelClassName="lg:text-[0.78rem]"
                      maxLength={PHONE_NUMBER_MAX_DIGITS}
                      name="patientProfilePhone"
                      pattern="[0-9]*"
                      placeholder="3001234567"
                      type="tel"
                      value={values.phone}
                      inputClassName="lg:rounded-[1rem] lg:py-2 lg:text-[0.72rem]"
                      onChange={(value) =>
                        handleFieldChange(
                          'phone',
                          normalizePhoneNumberInput(value),
                        )
                      }
                    />
                    <AdminTextField
                      error={errors.city}
                      icon={MapPin}
                      id="patient-profile-city"
                      label="Ciudad principal"
                      labelClassName="lg:text-[0.78rem]"
                      name="patientProfileCity"
                      placeholder="Ingresa la ciudad"
                      value={values.city}
                      inputClassName="lg:rounded-[1rem] lg:py-2 lg:text-[0.72rem]"
                      onChange={(value) => handleFieldChange('city', value)}
                    />
                    <AdminTextField
                      containerClassName="lg:col-span-2"
                      error={errors.locality}
                      icon={MapPin}
                      id="patient-profile-locality"
                      label="Localidad principal"
                      labelClassName="lg:text-[0.78rem]"
                      name="patientProfileLocality"
                      placeholder="Ingresa la localidad"
                      value={values.locality}
                      inputClassName="lg:rounded-[1rem] lg:py-2 lg:text-[0.72rem]"
                      onChange={(value) => handleFieldChange('locality', value)}
                    />
                  </div>
                </div>
              </SurfaceCard>
              {profile.tutor ? (
                <SurfaceCard
                  className="border border-slate-200/80 bg-white shadow-none"
                  paddingClassName="p-4 lg:p-3.5 xl:p-4"
                >
                  <div className="space-y-4 lg:space-y-3">
                    <div>
                      <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink lg:text-[1rem]">
                        Tutor responsable
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-ink-muted lg:text-[0.76rem] lg:leading-4">
                        Referencia disponible en caso de acompanamiento o
                        validacion adicional.
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 lg:rounded-[1rem] lg:px-3 lg:py-2">
                        <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-primary/70 lg:text-[0.58rem] lg:tracking-[0.13em]">
                          Nombre
                        </p>
                        <p className="mt-1 text-sm font-semibold text-ink lg:text-[0.78rem]">
                          {profile.tutor.firstName} {profile.tutor.lastName}
                        </p>
                      </div>
                      <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 lg:rounded-[1rem] lg:px-3 lg:py-2">
                        <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-primary/70 lg:text-[0.58rem] lg:tracking-[0.13em]">
                          Correo
                        </p>
                        <p className="mt-1 break-all text-sm font-semibold text-ink lg:text-[0.78rem]">
                          {profile.tutor.email}
                        </p>
                      </div>
                      <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 lg:rounded-[1rem] lg:px-3 lg:py-2">
                        <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-primary/70 lg:text-[0.58rem] lg:tracking-[0.13em]">
                          Celular
                        </p>
                        <p className="mt-1 text-sm font-semibold text-ink lg:text-[0.78rem]">
                          {profile.tutor.phone}
                        </p>
                      </div>
                    </div>
                  </div>
                </SurfaceCard>
              ) : (
                <SurfaceCard
                  className="border border-slate-200/80 bg-white shadow-none"
                  paddingClassName="p-4 lg:p-3.5 xl:p-4"
                >
                  <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-ink-muted lg:rounded-[1rem] lg:px-3 lg:py-3 lg:text-[0.78rem]">
                    No hay tutor responsable asociado a esta cuenta.
                  </div>
                </SurfaceCard>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-200/80 bg-white px-6 py-4 sm:px-7 lg:gap-2 lg:px-5 lg:py-2.5">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-ink transition duration-300 hover:bg-slate-100 lg:rounded-xl lg:px-4 lg:py-2 lg:text-[0.78rem]"
            disabled={isLoading}
            type="button"
            onClick={() => {
              const nextValues = getInitialValues(profile);
              valuesRef.current = nextValues;
              setValues(nextValues);
              setErrors({});
              setSaveMessage(null);
            }}
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            <span>{patientContent.profilePage.actionLabels.reset}</span>
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-5 py-3 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 lg:rounded-xl lg:px-4 lg:py-2 lg:text-[0.78rem]"
            disabled={isLoading}
            type="button"
            onClick={handleSave}
          >
            <Save aria-hidden="true" className="h-4 w-4" />
            <span>{patientContent.profilePage.actionLabels.save}</span>
          </button>
        </div>
      </AdminPanelCard>
    </div>
  );
}
