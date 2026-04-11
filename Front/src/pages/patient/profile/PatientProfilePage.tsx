import {
  CalendarDays,
  ImagePlus,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Save,
  UserRound,
} from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';

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
import {
  getOptimizedAvatarUrl,
  readOptimizedImageFileAsDataUrl,
} from '@/lib/imageOptimization';
import { usePatientModuleStore } from '@/lib/patientModuleStore';

function getInitialValues(profile: PatientProfile): PatientProfileFormValues {
  return {
    avatarFileName: profile.avatarFileName,
    avatarSrc: profile.avatarSrc,
    city: profile.city,
    locality: profile.locality,
    phone: profile.phone,
  };
}

function validateProfile(values: PatientProfileFormValues): PatientProfileFormErrors {
  const errors: PatientProfileFormErrors = {};

  if (!values.phone.trim()) {
    errors.phone = 'Ingresa un numero de celular.';
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
  const { errorMessage, isLoading, profile, updateProfile } = usePatientModuleStore();
  const [values, setValues] = useState<PatientProfileFormValues>(() => getInitialValues(profile));
  const [errors, setErrors] = useState<PatientProfileFormErrors>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const patientInitials = useMemo(
    () => `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase(),
    [profile.firstName, profile.lastName],
  );

  useEffect(() => {
    setValues(getInitialValues(profile));
    setErrors({});
    setSaveMessage(null);
  }, [profile]);

  const handleFieldChange = <K extends keyof PatientProfileFormValues>(
    field: K,
    nextValue: PatientProfileFormValues[K],
  ) => {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: nextValue,
    }));
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
    <div className="mx-auto flex h-full max-w-[88rem] min-h-0 flex-col gap-4 overflow-hidden 2xl:max-w-[96rem]">
      <Seo
        description={patientContent.profilePage.meta.description}
        noIndex
        title={patientContent.profilePage.meta.title}
      />
      <AdminPageHeader
        description={patientContent.profilePage.description}
        title={patientContent.profilePage.title}
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
        <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
            <SurfaceCard className="overflow-hidden bg-brand-gradient text-white shadow-none" paddingClassName="p-0">
              <div className="flex h-full flex-col px-5 py-5">
                <div className="flex items-center gap-4">
                  {values.avatarSrc ? (
                    <img
                      alt={profile.avatarAlt}
                      className="h-20 w-20 rounded-[1.75rem] object-cover ring-4 ring-white/25"
                      decoding="async"
                      src={getOptimizedAvatarUrl(values.avatarSrc, 240)}
                    />
                  ) : (
                    <span className="inline-flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-white/14 text-2xl font-extrabold uppercase text-white ring-4 ring-white/15">
                      {patientInitials}
                    </span>
                  )}
                  <div className="min-w-0 space-y-1">
                    <h2 className="font-headline text-[1.45rem] font-extrabold tracking-tight text-white">
                      {profile.firstName} {profile.lastName}
                    </h2>
                    <p className="text-sm font-medium text-white/88">{profile.email}</p>
                    <span className="inline-flex rounded-full bg-white/14 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/18">
                      Paciente activo en la plataforma
                    </span>
                  </div>
                </div>
                <div className="mt-5 space-y-3 text-sm text-white/90">
                  <div className="flex items-start gap-3 rounded-[1.25rem] bg-white/10 px-4 py-3">
                    <Phone aria-hidden="true" className="mt-0.5 h-4.5 w-4.5 shrink-0 text-white" />
                    <div className="min-w-0">
                      <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/65">
                        Celular
                      </p>
                      <p className="truncate font-semibold text-white">{profile.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-[1.25rem] bg-white/10 px-4 py-3">
                    <MapPin aria-hidden="true" className="mt-0.5 h-4.5 w-4.5 shrink-0 text-white" />
                    <div className="min-w-0">
                      <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/65">
                        Ubicacion
                      </p>
                      <p className="truncate font-semibold text-white">
                        {profile.city} - {profile.locality}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-[1.25rem] bg-white/10 px-4 py-3">
                    <CalendarDays
                      aria-hidden="true"
                      className="mt-0.5 h-4.5 w-4.5 shrink-0 text-white"
                    />
                    <div className="min-w-0">
                      <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/65">
                        Fecha de nacimiento
                      </p>
                      <p className="truncate font-semibold text-white">
                        {new Date(`${profile.birthDate}T00:00:00`).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </SurfaceCard>
            <div className="space-y-4">
              <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-5">
                <div className="space-y-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink">
                        Datos de contacto
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-ink-muted">
                        Actualiza la informacion que acompanara tus solicitudes y conversaciones.
                      </p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-primary transition duration-300 hover:bg-slate-100">
                      <ImagePlus aria-hidden="true" className="h-4 w-4" />
                      <span>{patientContent.profilePage.actionLabels.uploadPhoto}</span>
                      <input
                        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                        className="sr-only"
                        type="file"
                        onChange={handleAvatarSelection}
                      />
                    </label>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-ink">Correo electronico</label>
                      <div className="flex min-h-12 items-center rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-ink">
                        <Mail aria-hidden="true" className="mr-2 h-4 w-4 text-primary" />
                        {profile.email}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-ink">Sexo</label>
                      <div className="flex min-h-12 items-center rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-ink">
                        <UserRound aria-hidden="true" className="mr-2 h-4 w-4 text-primary" />
                        {profile.sex}
                      </div>
                    </div>
                    <AdminTextField
                      error={errors.phone}
                      icon={Phone}
                      id="patient-profile-phone"
                      label="Celular"
                      name="patientProfilePhone"
                      placeholder="3001234567"
                      value={values.phone}
                      onChange={(value) => handleFieldChange('phone', value)}
                    />
                    <AdminTextField
                      error={errors.city}
                      icon={MapPin}
                      id="patient-profile-city"
                      label="Ciudad principal"
                      name="patientProfileCity"
                      placeholder="Ingresa la ciudad"
                      value={values.city}
                      onChange={(value) => handleFieldChange('city', value)}
                    />
                    <AdminTextField
                      containerClassName="lg:col-span-2"
                      error={errors.locality}
                      icon={MapPin}
                      id="patient-profile-locality"
                      label="Localidad principal"
                      name="patientProfileLocality"
                      placeholder="Ingresa la localidad"
                      value={values.locality}
                      onChange={(value) => handleFieldChange('locality', value)}
                    />
                  </div>
                </div>
              </SurfaceCard>
              {profile.tutor ? (
                <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-5">
                  <div className="space-y-4">
                    <div>
                      <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink">
                        Tutor responsable
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-ink-muted">
                        Referencia disponible en caso de acompanamiento o validacion adicional.
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-primary/70">
                          Nombre
                        </p>
                        <p className="mt-1 text-sm font-semibold text-ink">
                          {profile.tutor.firstName} {profile.tutor.lastName}
                        </p>
                      </div>
                      <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-primary/70">
                          Correo
                        </p>
                        <p className="mt-1 break-all text-sm font-semibold text-ink">
                          {profile.tutor.email}
                        </p>
                      </div>
                      <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-primary/70">
                          Celular
                        </p>
                        <p className="mt-1 text-sm font-semibold text-ink">{profile.tutor.phone}</p>
                      </div>
                    </div>
                  </div>
                </SurfaceCard>
              ) : (
                <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-5">
                  <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-ink-muted">
                    No hay tutor responsable asociado a esta cuenta.
                  </div>
                </SurfaceCard>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-200/80 bg-white px-6 py-4 sm:px-7">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-ink transition duration-300 hover:bg-slate-100"
            disabled={isLoading}
            type="button"
            onClick={() => {
              setValues(getInitialValues(profile));
              setErrors({});
              setSaveMessage(null);
            }}
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            <span>{patientContent.profilePage.actionLabels.reset}</span>
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-5 py-3 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110"
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
