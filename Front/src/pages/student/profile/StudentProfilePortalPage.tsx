import {
  Building2,
  GraduationCap,
  ImagePlus,
  Link2,
  Mail,
  MapPin,
  Power,
  PowerOff,
  RotateCcw,
  Save,
  Stethoscope,
  Trash2,
  UserRound,
} from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { AdminDropdownField } from '@/components/admin/AdminDropdownField';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { AdminTextField } from '@/components/admin/AdminTextField';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { studentContent } from '@/content/studentContent';
import type {
  StudentProfessionalLinkType,
  StudentProfile,
  StudentProfileFormErrors,
  StudentProfileFormValues,
} from '@/content/types';
import { classNames } from '@/lib/classNames';
import {
  getOptimizedAvatarUrl,
  getOptimizedLogoUrl,
  readOptimizedImageFileAsDataUrl,
} from '@/lib/imageOptimization';
import { useStudentModuleStore } from '@/lib/studentModuleStore';

type StudentLinkDraft = {
  type: StudentProfessionalLinkType;
  url: string;
};

const initialLinkDraft: StudentLinkDraft = {
  type: 'RED_PROFESIONAL',
  url: '',
};

function getInitialValues(profile: StudentProfile): StudentProfileFormValues {
  return {
    avatarFileName: profile.avatarFileName,
    avatarSrc: profile.avatarSrc,
    availabilityGeneral: profile.availabilityGeneral,
    biography: profile.biography,
    links: profile.links.map((link) => ({ ...link })),
  };
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateProfile(values: StudentProfileFormValues): StudentProfileFormErrors {
  void values;
  return {};
}

function getLinkTypeLabel(type: StudentProfessionalLinkType) {
  const option = studentContent.profilePage.linkTypes.find((item) => item.id === type);
  return option?.label ?? 'Otro';
}

export function StudentProfilePage() {
  const {
    errorMessage,
    isLoading,
    nextLinkId,
    practiceSites,
    profile,
    togglePracticeSiteStatus,
    toggleTreatmentStatus,
    treatments,
    updateProfile,
  } = useStudentModuleStore();
  const [values, setValues] = useState<StudentProfileFormValues>(() => getInitialValues(profile));
  const [errors, setErrors] = useState<StudentProfileFormErrors>({});
  const [linkDraft, setLinkDraft] = useState<StudentLinkDraft>(initialLinkDraft);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const studentInitials = useMemo(
    () => `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase(),
    [profile.firstName, profile.lastName],
  );

  useEffect(() => {
    setValues(getInitialValues(profile));
    setErrors({});
    setLinkDraft(initialLinkDraft);
    setLinkError(null);
    setSaveMessage(null);
  }, [profile]);

  const handleFieldChange = <K extends keyof StudentProfileFormValues>(
    field: K,
    nextValue: StudentProfileFormValues[K],
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

  const handleAddLink = () => {
    const normalizedUrl = linkDraft.url.trim();

    if (!normalizedUrl || !isValidUrl(normalizedUrl)) {
      setLinkError(studentContent.profilePage.invalidLinkMessage);
      return;
    }

    handleFieldChange('links', [
      ...values.links,
      {
        id: nextLinkId(),
        type: linkDraft.type,
        url: normalizedUrl,
      },
    ]);
    setLinkDraft(initialLinkDraft);
    setLinkError(null);
  };

  const handleSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

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

      setSaveMessage(studentContent.profilePage.successMessage);
    })();
  };

  return (
    <div className="student-page-compact mx-auto flex h-full max-w-[88rem] min-h-0 flex-col gap-3 overflow-hidden 2xl:max-w-[96rem]">
      <Seo
        description={studentContent.profilePage.meta.description}
        noIndex
        title={studentContent.profilePage.meta.title}
      />
      <AdminPageHeader
        className="gap-3"
        description={studentContent.profilePage.description}
        descriptionClassName="text-sm leading-6 sm:text-base"
        headingAlign="center"
        title={studentContent.profilePage.title}
        titleClassName="text-[2rem] sm:text-[2.35rem]"
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
        <form className="flex h-full min-h-0 flex-col" noValidate onSubmit={handleSubmit}>
          <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3.5 sm:px-5 sm:py-4">
            <div className="space-y-3">
              <SurfaceCard
                className="border border-slate-200/80 bg-white shadow-none"
                paddingClassName="p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center 2xl:gap-5">
                  <div className="flex flex-col items-center gap-3">
                    {values.avatarSrc ? (
                      <img
                        alt={profile.avatarAlt}
                        className="h-20 w-20 rounded-[1.7rem] object-cover ring-4 ring-primary/10"
                        decoding="async"
                        src={getOptimizedAvatarUrl(values.avatarSrc, 240)}
                      />
                    ) : (
                      <span className="inline-flex h-20 w-20 items-center justify-center rounded-[1.7rem] bg-primary/10 text-2xl font-extrabold uppercase text-primary ring-4 ring-primary/10">
                        {studentInitials}
                      </span>
                    )}
                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-primary transition duration-300 hover:bg-slate-100">
                      <ImagePlus aria-hidden="true" className="h-4 w-4" />
                      <span>{studentContent.profilePage.actionLabels.uploadPhoto}</span>
                      <input
                        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                        className="sr-only"
                        type="file"
                        onChange={handleAvatarSelection}
                      />
                    </label>
                  </div>
                  <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                    <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50 px-3.5 py-3">
                      <div className="flex items-start gap-3">
                        <UserRound aria-hidden="true" className="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary" />
                        <div className="min-w-0">
                          <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-primary/70">
                            Nombre completo
                          </p>
                          <p className="mt-1 text-sm font-semibold text-ink">
                            {profile.firstName} {profile.lastName}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50 px-3.5 py-3">
                      <div className="flex items-start gap-3">
                        <Mail aria-hidden="true" className="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary" />
                        <div className="min-w-0">
                          <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-primary/70">
                            Correo electronico
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold text-ink">
                            {profile.email}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50 px-3.5 py-3">
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border border-slate-200 bg-white">
                          {profile.universityLogoSrc ? (
                            <img
                              alt={profile.universityLogoAlt}
                              className="h-full w-full object-contain"
                              decoding="async"
                              src={getOptimizedLogoUrl(profile.universityLogoSrc, 240, 240)}
                            />
                          ) : (
                            <Building2 aria-hidden="true" className="h-4.5 w-4.5 text-primary" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-primary/70">
                            Universidad
                          </p>
                          <p className="mt-1 text-sm font-semibold text-ink">
                            {profile.universityName}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50 px-3.5 py-3">
                      <div className="flex items-start gap-3">
                        <GraduationCap
                          aria-hidden="true"
                          className="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary"
                        />
                        <div className="min-w-0">
                          <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-primary/70">
                            Semestre
                          </p>
                          <p className="mt-1 text-sm font-semibold text-ink">
                            Semestre {profile.semester}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard
                className="border border-slate-200/80 bg-white shadow-none"
                paddingClassName="p-4 sm:p-5"
              >
                <div className="space-y-4">
                  <div>
                    <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink">
                      Descripcion y disponibilidad
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-ink-muted">
                      Puedes completar estos campos cuando lo necesites. Ambos son opcionales.
                    </p>
                  </div>
                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="space-y-1.5">
                      <label
                        className="block text-sm font-semibold text-ink"
                        htmlFor="student-profile-biography"
                      >
                        Descripcion profesional
                      </label>
                      <textarea
                        aria-describedby={
                          errors.biography ? 'student-profile-biography-error' : undefined
                        }
                        aria-invalid={Boolean(errors.biography)}
                        className={classNames(
                          'min-h-[8rem] w-full rounded-[1.4rem] border bg-surface px-4 py-3 text-sm text-ink placeholder:text-ghost/80 transition duration-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                          errors.biography
                            ? 'border-rose-300 focus-visible:border-rose-400 focus-visible:ring-rose-200/70'
                            : 'border-slate-200 focus-visible:border-primary',
                        )}
                        id="student-profile-biography"
                        placeholder="Describe tu enfoque clinico, fortalezas y estilo de acompanamiento."
                        value={values.biography}
                        onChange={(event) => handleFieldChange('biography', event.target.value)}
                      />
                      {errors.biography ? (
                        <p className="text-sm text-rose-600" id="student-profile-biography-error">
                          {errors.biography}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1.5">
                      <label
                        className="block text-sm font-semibold text-ink"
                        htmlFor="student-profile-availability"
                      >
                        Disponibilidad general
                      </label>
                      <textarea
                        aria-describedby={
                          errors.availabilityGeneral
                            ? 'student-profile-availability-error'
                            : undefined
                        }
                        aria-invalid={Boolean(errors.availabilityGeneral)}
                        className={classNames(
                          'min-h-[8rem] w-full rounded-[1.4rem] border bg-surface px-4 py-3 text-sm text-ink placeholder:text-ghost/80 transition duration-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                          errors.availabilityGeneral
                            ? 'border-rose-300 focus-visible:border-rose-400 focus-visible:ring-rose-200/70'
                            : 'border-slate-200 focus-visible:border-primary',
                        )}
                        id="student-profile-availability"
                        placeholder="Indica jornadas, sedes preferidas o notas clave para agendamiento."
                        value={values.availabilityGeneral}
                        onChange={(event) =>
                          handleFieldChange('availabilityGeneral', event.target.value)
                        }
                      />
                      {errors.availabilityGeneral ? (
                        <p
                          className="text-sm text-rose-600"
                          id="student-profile-availability-error"
                        >
                          {errors.availabilityGeneral}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard
                className="border border-slate-200/80 bg-white shadow-none"
                paddingClassName="p-4 sm:p-5"
              >
                <div className="space-y-3.5">
                  <div>
                    <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink">
                      Tratamientos que realizas
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-ink-muted">
                      Selecciona que tratamientos quieres mantener activos dentro de tu perfil.
                    </p>
                  </div>
                  {treatments.length > 0 ? (
                    <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
                      {treatments.map((treatment) => (
                        <div
                          key={treatment.id}
                          className="flex flex-col gap-3 rounded-[1.35rem] border border-slate-200/80 bg-slate-50 px-3.5 py-3"
                          data-testid={`student-profile-treatment-card-${treatment.id}`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Stethoscope aria-hidden="true" className="h-4 w-4 text-primary" />
                                <p className="text-sm font-semibold text-ink">{treatment.name}</p>
                              </div>
                              <p className="text-sm leading-6 text-ink-muted">
                                {treatment.description}
                              </p>
                            </div>
                            <AdminStatusBadge entity="teacher" status={treatment.status} />
                          </div>
                          <div className="flex justify-end">
                            <button
                              className={classNames(
                                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                                treatment.status === 'active'
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                  : 'bg-primary/10 text-primary hover:bg-primary/15',
                              )}
                              type="button"
                              onClick={() => {
                                void toggleTreatmentStatus(treatment.id);
                              }}
                            >
                              {treatment.status === 'active' ? (
                                <PowerOff aria-hidden="true" className="h-3.5 w-3.5" />
                              ) : (
                                <Power aria-hidden="true" className="h-3.5 w-3.5" />
                              )}
                              <span>
                                {treatment.status === 'active'
                                  ? studentContent.treatmentsPage.actionLabels.deactivate
                                  : studentContent.treatmentsPage.actionLabels.activate}
                              </span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-ink-muted">
                      No hay tratamientos asociados a tu perfil en este momento.
                    </div>
                  )}
                </div>
              </SurfaceCard>

              <SurfaceCard
                className="border border-slate-200/80 bg-white shadow-none"
                paddingClassName="p-4 sm:p-5"
              >
                <div className="space-y-3.5">
                  <div>
                    <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink">
                      Sedes de practica clinica
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-ink-muted">
                      Controla en que sedes de tu universidad apareces disponible para atencion.
                    </p>
                  </div>
                  {practiceSites.length > 0 ? (
                    <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
                      {practiceSites.map((practiceSite) => (
                        <div
                          key={practiceSite.id}
                          className="flex flex-col gap-3 rounded-[1.35rem] border border-slate-200/80 bg-slate-50 px-3.5 py-3"
                          data-testid={`student-profile-practice-site-card-${practiceSite.id}`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <MapPin aria-hidden="true" className="h-4 w-4 text-primary" />
                                <p className="text-sm font-semibold text-ink">{practiceSite.name}</p>
                              </div>
                              <p className="text-sm text-ink-muted">{practiceSite.address}</p>
                              <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
                                {practiceSite.city} - {practiceSite.locality}
                              </p>
                            </div>
                            <AdminStatusBadge entity="teacher" status={practiceSite.status} />
                          </div>
                          <div className="flex justify-end">
                            <button
                              className={classNames(
                                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                                practiceSite.status === 'active'
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                  : 'bg-primary/10 text-primary hover:bg-primary/15',
                              )}
                              type="button"
                              onClick={() => {
                                void togglePracticeSiteStatus(practiceSite.id);
                              }}
                            >
                              {practiceSite.status === 'active' ? (
                                <PowerOff aria-hidden="true" className="h-3.5 w-3.5" />
                              ) : (
                                <Power aria-hidden="true" className="h-3.5 w-3.5" />
                              )}
                              <span>
                                {practiceSite.status === 'active'
                                  ? studentContent.treatmentsPage.actionLabels.deactivate
                                  : studentContent.treatmentsPage.actionLabels.activate}
                              </span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-ink-muted">
                      No hay sedes asociadas a tu practica en este momento.
                    </div>
                  )}
                </div>
              </SurfaceCard>

              <SurfaceCard
                className="border border-slate-200/80 bg-white shadow-none"
                paddingClassName="p-4 sm:p-5"
              >
                <div className="space-y-4">
                  <div>
                    <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink">
                      Enlaces profesionales
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-ink-muted">
                      Agrega recursos que complementen tu perfil, como redes, portafolio o hoja de vida.
                    </p>
                  </div>
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_auto] 2xl:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto]">
                    <AdminDropdownField
                      icon={Building2}
                      id="student-profile-link-type"
                      label="Tipo de enlace"
                      name="studentProfileLinkType"
                      options={studentContent.profilePage.linkTypes.map((option) => ({
                        id: option.id,
                        label: option.label,
                      }))}
                      placeholder="Selecciona un tipo"
                      value={linkDraft.type}
                      onChange={(value) => {
                        setLinkDraft((currentDraft) => ({
                          ...currentDraft,
                          type: value as StudentProfessionalLinkType,
                        }));
                        setLinkError(null);
                      }}
                    />
                    <AdminTextField
                      containerClassName="lg:col-span-1"
                      error={linkError ?? undefined}
                      icon={Link2}
                      id="student-profile-link-url"
                      label="URL"
                      name="studentProfileLinkUrl"
                      placeholder="https://..."
                      value={linkDraft.url}
                      onChange={(value) => {
                        setLinkDraft((currentDraft) => ({
                          ...currentDraft,
                          url: value,
                        }));
                        setLinkError(null);
                      }}
                    />
                    <div className="flex items-end">
                      <button
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 lg:w-auto"
                        type="button"
                        onClick={handleAddLink}
                      >
                        <Save aria-hidden="true" className="h-4 w-4" />
                        <span>{studentContent.profilePage.actionLabels.addLink}</span>
                      </button>
                    </div>
                  </div>
                  {values.links.length > 0 ? (
                    <div className="grid gap-3">
                      {values.links.map((link) => (
                        <div
                          key={link.id}
                          className="flex flex-col gap-3 rounded-[1.35rem] border border-slate-200/80 bg-slate-50 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0 space-y-1">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/70">
                              {getLinkTypeLabel(link.type)}
                            </p>
                            <a
                              className="block truncate text-sm font-semibold text-ink transition duration-200 hover:text-primary hover:underline"
                              href={link.url}
                              rel="noreferrer"
                              target="_blank"
                            >
                              {link.url}
                            </a>
                          </div>
                          <button
                            aria-label={`Eliminar enlace ${link.url}`}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-rose-600 transition duration-300 hover:bg-rose-50"
                            type="button"
                            onClick={() =>
                              handleFieldChange(
                                'links',
                                values.links.filter((currentLink) => currentLink.id !== link.id),
                              )
                            }
                          >
                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-ink-muted">
                      Aun no has agregado enlaces profesionales.
                    </div>
                  )}
                </div>
              </SurfaceCard>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-200/80 bg-white px-5 py-3.5 sm:px-6">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-ink transition duration-300 hover:bg-slate-100"
              disabled={isLoading}
              type="button"
              onClick={() => {
                setValues(getInitialValues(profile));
                setErrors({});
                setLinkDraft(initialLinkDraft);
                setLinkError(null);
                setSaveMessage(null);
              }}
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              <span>{studentContent.profilePage.actionLabels.reset}</span>
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110"
              disabled={isLoading}
              type="submit"
            >
              <Save aria-hidden="true" className="h-4 w-4" />
              <span>{studentContent.profilePage.actionLabels.save}</span>
            </button>
          </div>
        </form>
      </AdminPanelCard>
    </div>
  );
}
