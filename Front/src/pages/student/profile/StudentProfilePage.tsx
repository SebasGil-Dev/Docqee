import {
  Building2,
  Check,
  GraduationCap,
  ImagePlus,
  Link2,
  Mail,
  RotateCcw,
  Save,
  School,
  Trash2,
} from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { AdminDropdownField } from '@/components/admin/AdminDropdownField';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminTextField } from '@/components/admin/AdminTextField';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { studentContent } from '@/content/studentContent';
import type {
  StudentPracticeSite,
  StudentProfessionalLinkType,
  StudentProfile,
  StudentProfileFormErrors,
  StudentProfileFormValues,
} from '@/content/types';
import { classNames } from '@/lib/classNames';
import {
  getOptimizedAvatarUrl,
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
  const errors: StudentProfileFormErrors = {};

  if (!values.biography.trim()) {
    errors.biography = 'Agrega una descripcion breve para tu perfil.';
  }

  if (!values.availabilityGeneral.trim()) {
    errors.availabilityGeneral = 'Describe tu disponibilidad general.';
  }

  return errors;
}

function getLinkTypeLabel(type: StudentProfessionalLinkType) {
  const option = studentContent.profilePage.linkTypes.find((item) => item.id === type);
  return option?.label ?? 'Otro';
}

export function StudentProfilePage() {
  const { errorMessage, isLoading, nextLinkId, practiceSites, profile, getUniversitySites, updatePracticeSites, updateProfile } = useStudentModuleStore();
  const [values, setValues] = useState<StudentProfileFormValues>(() => getInitialValues(profile));
  const [errors, setErrors] = useState<StudentProfileFormErrors>({});
  const [linkDraft, setLinkDraft] = useState<StudentLinkDraft>(initialLinkDraft);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [universitySites, setUniversitySites] = useState<StudentPracticeSite[]>([]);
  const [selectedSiteIds, setSelectedSiteIds] = useState<Set<string>>(() =>
    new Set(practiceSites.map((s) => s.siteId)),
  );
  const [sedesSaveMessage, setSedesSaveMessage] = useState<string | null>(null);
  const [isSedeSaving, setIsSedeSaving] = useState(false);
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

  useEffect(() => {
    void getUniversitySites().then(setUniversitySites);
  }, []);

  const handleToggleSede = (siteId: string) => {
    setSelectedSiteIds((current) => {
      const next = new Set(current);
      if (next.has(siteId)) {
        next.delete(siteId);
      } else {
        next.add(siteId);
      }
      return next;
    });
    setSedesSaveMessage(null);
  };

  const handleSaveSedes = () => {
    setIsSedeSaving(true);
    void updatePracticeSites([...selectedSiteIds]).then((ok) => {
      setIsSedeSaving(false);
      if (ok) {
        setSedesSaveMessage('Sedes de practica actualizadas correctamente.');
      }
    });
  };

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
    <div className="flex h-full w-full min-h-0 flex-col gap-4 overflow-hidden">
      <Seo
        description={studentContent.profilePage.meta.description}
        noIndex
        title={studentContent.profilePage.meta.title}
      />
      <AdminPageHeader
        description={studentContent.profilePage.description}
        title={studentContent.profilePage.title}
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
          <div className="grid gap-4 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
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
                      {studentInitials}
                    </span>
                  )}
                  <div className="min-w-0 space-y-1">
                    <h2 className="font-headline text-[1.45rem] font-extrabold tracking-tight text-white">
                      {profile.firstName} {profile.lastName}
                    </h2>
                    <p className="text-sm font-medium text-white/88">{profile.universityName}</p>
                    <span className="inline-flex rounded-full bg-white/14 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/18">
                      Semestre {profile.semester}
                    </span>
                  </div>
                </div>
                <div className="mt-5 space-y-3 text-sm text-white/90">
                  <div className="flex items-start gap-3 rounded-[1.25rem] bg-white/10 px-4 py-3">
                    <Mail aria-hidden="true" className="mt-0.5 h-4.5 w-4.5 shrink-0 text-white" />
                    <div className="min-w-0">
                      <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/65">
                        Correo
                      </p>
                      <p className="truncate font-semibold text-white">{profile.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-[1.25rem] bg-white/10 px-4 py-3">
                    <GraduationCap
                      aria-hidden="true"
                      className="mt-0.5 h-4.5 w-4.5 shrink-0 text-white"
                    />
                    <div>
                      <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/65">
                        Visibilidad
                      </p>
                      <p className="font-medium text-white/90">
                        {studentContent.profilePage.helperText}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </SurfaceCard>
            <form className="space-y-4" noValidate onSubmit={handleSubmit}>
              <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-5">
                <div className="space-y-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink">
                        Presentacion publica
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-ink-muted">
                        Completa la descripcion, la disponibilidad general y la foto que vera el paciente.
                      </p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-primary transition duration-300 hover:bg-slate-100">
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
                  <div className="grid gap-5 lg:grid-cols-2">
                    <div className="space-y-1.5 lg:col-span-2">
                      <label className="block text-sm font-semibold text-ink" htmlFor="student-profile-biography">
                        Descripcion profesional
                      </label>
                      <textarea
                        aria-describedby={errors.biography ? 'student-profile-biography-error' : undefined}
                        aria-invalid={Boolean(errors.biography)}
                        className={classNames(
                          'min-h-[8.25rem] w-full rounded-[1.4rem] border bg-surface px-4 py-3 text-sm text-ink placeholder:text-ghost/80 transition duration-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
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
                    <div className="space-y-1.5 lg:col-span-2">
                      <label className="block text-sm font-semibold text-ink" htmlFor="student-profile-availability">
                        Disponibilidad general
                      </label>
                      <textarea
                        aria-describedby={
                          errors.availabilityGeneral ? 'student-profile-availability-error' : undefined
                        }
                        aria-invalid={Boolean(errors.availabilityGeneral)}
                        className={classNames(
                          'min-h-[7rem] w-full rounded-[1.4rem] border bg-surface px-4 py-3 text-sm text-ink placeholder:text-ghost/80 transition duration-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
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
                        <p className="text-sm text-rose-600" id="student-profile-availability-error">
                          {errors.availabilityGeneral}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </SurfaceCard>
              <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-5">
                <div className="space-y-5">
                  <div>
                    <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink">
                      Enlaces profesionales
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-ink-muted">
                      Agrega recursos que complementen tu perfil, como redes, portafolio o hoja de vida.
                    </p>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto]">
                    <AdminDropdownField
                      icon={School}
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
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-4 py-3 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 lg:w-auto"
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
                          className="flex flex-col gap-3 rounded-[1.35rem] border border-slate-200/80 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
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
              <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-5">
                <div className="space-y-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink">
                        Sedes de practica clinica
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-ink-muted">
                        Selecciona las sedes de tu universidad a las que perteneces.
                      </p>
                    </div>
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-4 py-3 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 disabled:opacity-60"
                      disabled={isSedeSaving}
                      type="button"
                      onClick={handleSaveSedes}
                    >
                      <Save aria-hidden="true" className="h-4 w-4" />
                      <span>Guardar sedes</span>
                    </button>
                  </div>
                  {sedesSaveMessage ? (
                    <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                      {sedesSaveMessage}
                    </p>
                  ) : null}
                  {universitySites.length === 0 ? (
                    <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-ink-muted">
                      No hay sedes disponibles para tu universidad.
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {universitySites.map((site) => {
                        const isSelected = selectedSiteIds.has(site.id);
                        return (
                          <button
                            key={site.id}
                            className={classNames(
                              'flex items-center gap-3 rounded-[1.35rem] border px-4 py-3 text-left text-sm font-semibold transition duration-200',
                              isSelected
                                ? 'border-primary/30 bg-primary/8 text-primary'
                                : 'border-slate-200 bg-slate-50 text-ink hover:bg-slate-100',
                            )}
                            type="button"
                            onClick={() => handleToggleSede(site.id)}
                          >
                            <span
                              className={classNames(
                                'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition duration-200',
                                isSelected
                                  ? 'border-primary bg-primary text-white'
                                  : 'border-slate-300 bg-white',
                              )}
                            >
                              {isSelected ? <Check aria-hidden="true" className="h-3 w-3" /> : null}
                            </span>
                            <Building2
                              aria-hidden="true"
                              className={classNames(
                                'h-4 w-4 shrink-0',
                                isSelected ? 'text-primary' : 'text-ink-muted',
                              )}
                            />
                            <span className="min-w-0 truncate">{site.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </SurfaceCard>
            </form>
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
              setLinkDraft(initialLinkDraft);
              setLinkError(null);
              setSaveMessage(null);
            }}
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            <span>{studentContent.profilePage.actionLabels.reset}</span>
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-5 py-3 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110"
            disabled={isLoading}
            type="button"
            onClick={() => handleSubmit()}
          >
            <Save aria-hidden="true" className="h-4 w-4" />
            <span>{studentContent.profilePage.actionLabels.save}</span>
          </button>
        </div>
      </AdminPanelCard>
    </div>
  );
}
