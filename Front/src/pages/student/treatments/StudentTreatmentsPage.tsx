import {
  Building2,
  CalendarDays,
  Check,
  GraduationCap,
  MapPin,
  MessageSquareMore,
  Power,
  PowerOff,
  Search,
  SlidersHorizontal,
  Star,
  Stethoscope,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { studentContent } from '@/content/studentContent';
import type { PersonOperationalStatus } from '@/content/types';
import { classNames } from '@/lib/classNames';
import {
  getOptimizedAvatarUrl,
  getOptimizedLogoUrl,
} from '@/lib/imageOptimization';
import { useStudentModuleStore } from '@/lib/studentModuleStore';

const reviewDateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function renderStars(
  value: number,
  sizeClassName = 'h-4.5 w-4.5',
  tone: 'dark' | 'light' = 'light',
) {
  return Array.from({ length: 5 }, (_, index) => {
    const isFilled = index < Math.round(value);

    return (
      <Star
        key={`star-${value}-${index}`}
        aria-hidden="true"
        className={`${sizeClassName} ${
          isFilled
            ? 'fill-amber-300 text-amber-300'
            : tone === 'light'
              ? 'text-white/35'
              : 'text-slate-300/85'
        }`}
      />
    );
  });
}

type StudentAvailabilityFilter = PersonOperationalStatus | 'all';
type StudentReviewRatingFilter = 'all' | 1 | 2 | 3 | 4 | 5;

export function StudentTreatmentsPage() {
  const {
    errorMessage,
    isLoading,
    practiceSites,
    profile,
    reviews,
    requests,
    togglePracticeSiteStatus,
    toggleTreatmentStatus,
    treatments,
  } = useStudentModuleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StudentAvailabilityFilter>('all');
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const [reviewRatingFilter, setReviewRatingFilter] = useState<StudentReviewRatingFilter>('all');
  const [isReviewRatingMenuOpen, setIsReviewRatingMenuOpen] = useState(false);
  const reviewRatingMenuRef = useRef<HTMLDivElement | null>(null);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filterOptions: Array<{ label: string; value: StudentAvailabilityFilter }> = [
    { label: 'Todos', value: 'all' },
    { label: 'Activo', value: 'active' },
    { label: 'Inactivo', value: 'inactive' },
  ];
  const reviewRatingOptions: Array<{ label: string; value: StudentReviewRatingFilter }> = [
    { label: 'Todas las estrellas', value: 'all' },
    { label: '5 estrellas', value: 5 },
    { label: '4 estrellas', value: 4 },
    { label: '3 estrellas', value: 3 },
    { label: '2 estrellas', value: 2 },
    { label: '1 estrella', value: 1 },
  ];
  const activeTreatmentsCount = useMemo(
    () => treatments.filter((treatment) => treatment.status === 'active').length,
    [treatments],
  );
  const activePracticeSitesCount = useMemo(
    () => practiceSites.filter((practiceSite) => practiceSite.status === 'active').length,
    [practiceSites],
  );
  const totalAppointmentsCount = useMemo(
    () =>
      requests.reduce(
        (total, request) => total + request.appointmentsCount,
        0,
      ),
    [requests],
  );
  const studentInitials = useMemo(
    () => `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase(),
    [profile.firstName, profile.lastName],
  );
  const dashboardErrorMessage = useMemo(() => {
    if (!errorMessage) {
      return null;
    }

    return errorMessage === 'No pudimos completar la solicitud.'
      ? 'No fue posible cargar tu panel de valoraciones en este momento.'
      : errorMessage;
  }, [errorMessage]);
  const averageRating = useMemo(() => {
    if (reviews.length === 0) {
      return 0;
    }

    const totalRating = reviews.reduce((total, review) => total + review.rating, 0);
    return totalRating / reviews.length;
  }, [reviews]);
  const commentsCount = useMemo(
    () => reviews.filter((review) => Boolean(review.comment?.trim())).length,
    [reviews],
  );
  const filteredReviews = useMemo(() => {
    if (reviewRatingFilter === 'all') {
      return reviews;
    }

    return reviews.filter((review) => Math.round(review.rating) === reviewRatingFilter);
  }, [reviewRatingFilter, reviews]);
  const filteredTreatments = treatments.filter((treatment) => {
    const matchesSearch =
      treatment.name.toLowerCase().includes(normalizedSearch) ||
      treatment.description.toLowerCase().includes(normalizedSearch);

    return matchesSearch && (statusFilter === 'all' || treatment.status === statusFilter);
  });
  const filteredPracticeSites = practiceSites.filter((practiceSite) => {
    const matchesSearch =
      practiceSite.name.toLowerCase().includes(normalizedSearch) ||
      practiceSite.city.toLowerCase().includes(normalizedSearch) ||
      practiceSite.locality.toLowerCase().includes(normalizedSearch);

    return matchesSearch && (statusFilter === 'all' || practiceSite.status === statusFilter);
  });

  useEffect(() => {
    if (!isStatusMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!statusMenuRef.current?.contains(event.target as Node)) {
        setIsStatusMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsStatusMenuOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isStatusMenuOpen]);

  useEffect(() => {
    if (!isReviewRatingMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!reviewRatingMenuRef.current?.contains(event.target as Node)) {
        setIsReviewRatingMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsReviewRatingMenuOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isReviewRatingMenuOpen]);

  return (
    <div className="student-page-compact mx-auto flex h-full max-w-[90rem] min-h-0 flex-col gap-3 overflow-hidden 2xl:max-w-[98rem]">
      <Seo
        description={studentContent.treatmentsPage.meta.description}
        noIndex
        title={studentContent.treatmentsPage.meta.title}
      />
      {dashboardErrorMessage ? (
        <SurfaceCard
          className="border border-rose-200 bg-rose-50/90 text-sm font-medium text-rose-800"
          paddingClassName="p-3.5"
        >
          <p role="alert">{dashboardErrorMessage}</p>
        </SurfaceCard>
      ) : null}
      <SurfaceCard className="overflow-hidden bg-brand-gradient text-white" paddingClassName="p-0">
        <div className="flex flex-col gap-3 px-4 py-3.5 sm:px-5 sm:py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-3 2xl:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {profile.avatarSrc ? (
              <img
                alt={profile.avatarAlt}
                className="h-12 w-12 rounded-[1.2rem] object-cover ring-4 ring-white/20 sm:h-14 sm:w-14"
                decoding="async"
                src={getOptimizedAvatarUrl(profile.avatarSrc, 160)}
              />
            ) : (
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-white/14 text-base font-extrabold uppercase text-white ring-4 ring-white/15 sm:h-14 sm:w-14 sm:text-lg">
                {studentInitials}
              </span>
            )}
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-2.5">
                <h2 className="max-w-[14rem] truncate font-headline text-[1.05rem] font-extrabold tracking-tight text-white sm:max-w-[16rem] sm:text-[1.18rem] xl:max-w-[20rem]">
                  Bienvenido, {profile.firstName} {profile.lastName}
                </h2>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[0.75rem] font-semibold text-white/88">
                  <Building2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                  <span className="max-w-[10rem] truncate sm:max-w-[12rem] xl:max-w-[14rem]">
                    {profile.universityName}
                  </span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[0.75rem] font-semibold text-white/88">
                  <GraduationCap aria-hidden="true" className="h-3.5 w-3.5" />
                  <span>Semestre {profile.semester}</span>
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-2.5 py-1 text-white/92">
                  <div className="flex shrink-0 items-center gap-0.5">
                    {renderStars(averageRating, 'h-3.5 w-3.5')}
                  </div>
                  {reviews.length > 0 ? (
                    <span className="max-w-[10rem] truncate text-[0.75rem] font-semibold sm:max-w-[12rem] xl:max-w-[14rem]">
                      {`${averageRating.toFixed(1)} de 5 en ${reviews.length} valoraciones`}
                    </span>
                  ) : null}
                </span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-nowrap">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1.5 ring-1 ring-white/15 backdrop-blur-sm">
              <Stethoscope aria-hidden="true" className="h-3.5 w-3.5 text-white" />
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-white/75">
                Tratamientos
              </p>
              <p className="font-headline text-[1.05rem] font-extrabold tracking-tight text-white">
                {activeTreatmentsCount}
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1.5 ring-1 ring-white/15 backdrop-blur-sm">
              <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-white" />
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-white/75">
                Sedes
              </p>
              <p className="font-headline text-[1.05rem] font-extrabold tracking-tight text-white">
                {activePracticeSitesCount}
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1.5 ring-1 ring-white/15 backdrop-blur-sm">
              <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 text-white" />
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-white/75">
                Citas
              </p>
              <p className="font-headline text-[1.05rem] font-extrabold tracking-tight text-white">
                {totalAppointmentsCount}
              </p>
            </div>
          </div>
        </div>
      </SurfaceCard>
      <AdminPanelCard className="flex-1" panelClassName="bg-[#f4f8ff]">
        <div className="border-b border-slate-200/80 px-4 py-3.5 sm:px-5 sm:py-3.5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-1">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.24em] text-primary/75">
                Experiencia del paciente
              </p>
              <h2 className="font-headline text-[1.45rem] font-extrabold tracking-tight text-ink">
                Comentarios de tus citas
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 self-start">
              <div
                className="inline-flex items-center gap-2 rounded-[1.2rem] border border-sky-200/80 bg-sky-50 px-3.5 py-2.5 text-sky-950 shadow-[0_16px_34px_-24px_rgba(14,116,144,0.38)]"
                data-testid="student-review-comments-dashboard"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-[0.95rem] bg-white text-primary shadow-[0_14px_24px_-20px_rgba(14,116,144,0.55)]">
                  <MessageSquareMore aria-hidden="true" className="h-4.5 w-4.5" />
                </span>
                <p className="text-[0.64rem] font-bold uppercase tracking-[0.18em] text-sky-700/80">
                  Comentarios
                </p>
                <p className="font-headline text-[1.28rem] font-extrabold tracking-tight text-sky-950">
                  {commentsCount}
                </p>
              </div>
              <div className="relative" ref={reviewRatingMenuRef}>
                <button
                  aria-controls="student-review-rating-menu"
                  aria-expanded={isReviewRatingMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Filtrar comentarios por estrellas"
                  className={classNames(
                    'relative inline-flex h-11 w-11 items-center justify-center rounded-full border bg-white/98 text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                    reviewRatingFilter === 'all'
                      ? 'border-slate-200/90 hover:border-primary/30 hover:bg-white'
                      : 'border-primary/30 bg-primary/10 text-primary',
                  )}
                  data-testid="student-review-rating-filter-button"
                  type="button"
                  onClick={() => {
                    setIsReviewRatingMenuOpen((current) => !current);
                  }}
                >
                  <SlidersHorizontal aria-hidden="true" className="h-[1.02rem] w-[1.02rem]" />
                  {reviewRatingFilter !== 'all' ? (
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
                  ) : null}
                </button>
                {isReviewRatingMenuOpen ? (
                  <div
                    className="absolute right-0 top-[calc(100%+0.45rem)] z-20 w-[min(15rem,calc(100vw-2.5rem))] overflow-hidden rounded-[1rem] border border-slate-200/80 bg-white/95 p-1 shadow-[0_20px_46px_-32px_rgba(15,23,42,0.22)] backdrop-blur"
                    id="student-review-rating-menu"
                    role="menu"
                  >
                    <div className="px-2 pb-1 pt-0.5">
                      <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-primary/70">
                        Filtrar por estrellas
                      </p>
                    </div>
                    <div className="admin-scrollbar max-h-[10rem] space-y-0.5 overflow-y-auto pr-0.5">
                      {reviewRatingOptions.map((option) => {
                        const isSelected = option.value === reviewRatingFilter;

                        return (
                          <button
                            key={option.label}
                            aria-checked={isSelected}
                            className={classNames(
                              'flex w-full items-center justify-between rounded-[0.8rem] px-2.5 py-2 text-left text-[0.76rem] font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                              isSelected
                                ? 'bg-primary text-white shadow-[0_14px_30px_-20px_rgba(22,78,99,0.9)]'
                                : 'bg-slate-50/70 text-ink hover:bg-slate-100',
                            )}
                            role="menuitemradio"
                            type="button"
                            onClick={() => {
                              setReviewRatingFilter(option.value);
                              setIsReviewRatingMenuOpen(false);
                            }}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              {option.value === 'all' ? (
                                <span>{option.label}</span>
                              ) : (
                                <>
                                  <div className="flex items-center gap-0.5">
                    {renderStars(option.value, 'h-3.5 w-3.5', 'dark')}
                                  </div>
                                  <span>{option.label}</span>
                                </>
                              )}
                            </div>
                            <span
                              className={classNames(
                                'inline-flex h-4.5 w-4.5 items-center justify-center rounded-full',
                                isSelected ? 'bg-white/18 text-white' : 'bg-white text-slate-300',
                              )}
                            >
                              <Check aria-hidden="true" className="h-3 w-3" />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3.5 sm:px-5 sm:py-4">
          {filteredReviews.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3 2xl:gap-4">
              {filteredReviews.map((review) => (
                <SurfaceCard
                  key={review.id}
                  className="border border-slate-200/80 bg-white shadow-none"
                  paddingClassName="p-4"
                >
                  <div className="space-y-3" data-testid={`student-review-card-${review.id}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-ink">{review.patientName}</p>
                        <p className="text-sm text-ink-muted">{review.appointmentLabel}</p>
                      </div>
                      <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {reviewDateFormatter.format(new Date(review.createdAt))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {renderStars(review.rating, 'h-4 w-4', 'dark')}
                      </div>
                      <span className="text-sm font-semibold text-ink">{review.rating.toFixed(1)}</span>
                    </div>
                    <p className="rounded-[1.2rem] bg-slate-50 px-3.5 py-3 text-sm leading-6 text-ink">
                      {review.comment ?? 'El paciente no dejo un comentario escrito para esta cita.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
                        <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
                        {review.siteName}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
                        <MessageSquareMore aria-hidden="true" className="h-3.5 w-3.5" />
                        Comentario recibido
                      </span>
                    </div>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          ) : (
            <SurfaceCard
              className="border border-dashed border-slate-200 bg-white shadow-none"
              paddingClassName="px-5 py-8"
            >
              <div className="space-y-2 text-center">
                <p className="font-headline text-xl font-extrabold tracking-tight text-ink">
                  {reviews.length === 0
                    ? 'Aun no tienes comentarios registrados'
                    : 'No hay comentarios para este filtro'}
                </p>
                <p className="mx-auto max-w-xl text-sm leading-6 text-ink-muted">
                  {reviews.length === 0
                    ? 'Cuando se finalicen citas con valoracion del paciente, aqui podras revisar sus estrellas y comentarios.'
                    : 'Prueba con otra cantidad de estrellas para ver mas valoraciones en esta seccion.'}
                </p>
              </div>
            </SurfaceCard>
          )}
        </div>
      </AdminPanelCard>
    </div>
  );

  return (
    <div className="student-page-compact mx-auto flex h-full max-w-[90rem] min-h-0 flex-col gap-4 overflow-hidden 2xl:max-w-[98rem]">
      <Seo
        description={studentContent.treatmentsPage.meta.description}
        noIndex
        title={studentContent.treatmentsPage.meta.title}
      />
      {dashboardErrorMessage ? (
        <SurfaceCard
          className="border border-rose-200 bg-rose-50/90 text-sm font-medium text-rose-800"
          paddingClassName="p-3.5"
        >
          <p role="alert">{dashboardErrorMessage}</p>
        </SurfaceCard>
      ) : null}
      <SurfaceCard className="overflow-hidden bg-brand-gradient text-white" paddingClassName="p-0">
        <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {profile.avatarSrc ? (
              <img
                alt={profile.avatarAlt}
                className="h-20 w-20 rounded-[1.75rem] object-cover ring-4 ring-white/20"
                decoding="async"
                src={getOptimizedAvatarUrl(profile.avatarSrc, 240)}
              />
            ) : (
              <span className="inline-flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-white/14 text-2xl font-extrabold uppercase text-white ring-4 ring-white/15">
                {studentInitials}
              </span>
            )}
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-headline text-[1.6rem] font-extrabold tracking-tight text-white sm:text-[1.9rem]">
                  Bienvenido, {profile.firstName} {profile.lastName}
                </h2>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 ring-1 ring-white/16">
                  <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white/90 text-primary">
                    {profile.universityLogoSrc ? (
                      <img
                        alt={profile.universityLogoAlt}
                        className="h-full w-full object-contain p-0.5"
                        decoding="async"
                        src={getOptimizedLogoUrl(profile.universityLogoSrc, 80, 80)}
                      />
                    ) : (
                      <span className="text-[0.65rem] font-extrabold uppercase">
                        {profile.universityName.charAt(0)}
                      </span>
                    )}
                  </span>
                  <span className="max-w-[18rem] truncate text-sm font-semibold text-white">
                    {profile.universityName}
                  </span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-white/85">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 ring-1 ring-white/16">
                  <GraduationCap aria-hidden="true" className="h-3.5 w-3.5" />
                  <span>Semestre {profile.semester}</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-white/92">
                <div className="flex items-center gap-1">{renderStars(averageRating)}</div>
                <p className="text-sm font-semibold">
                  {reviews.length > 0
                    ? `${averageRating.toFixed(1)} de 5 en ${reviews.length} valoraciones`
                    : 'Aun no tienes valoraciones registradas'}
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[32rem]">
            <div className="rounded-[1.4rem] bg-white/12 px-4 py-4 ring-1 ring-white/15 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Stethoscope aria-hidden="true" className="h-4.5 w-4.5 text-white" />
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">
                  Tratamientos activos
                </p>
              </div>
              <p className="mt-3 font-headline text-[2rem] font-extrabold tracking-tight text-white">
                {activeTreatmentsCount}
              </p>
            </div>
            <div className="rounded-[1.4rem] bg-white/12 px-4 py-4 ring-1 ring-white/15 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <MapPin aria-hidden="true" className="h-4.5 w-4.5 text-white" />
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">
                  Sedes activas
                </p>
              </div>
              <p className="mt-3 font-headline text-[2rem] font-extrabold tracking-tight text-white">
                {activePracticeSitesCount}
              </p>
            </div>
            <div className="rounded-[1.4rem] bg-white/12 px-4 py-4 ring-1 ring-white/15 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <CalendarDays aria-hidden="true" className="h-4.5 w-4.5 text-white" />
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">
                  Citas registradas
                </p>
              </div>
              <p className="mt-3 font-headline text-[2rem] font-extrabold tracking-tight text-white">
                {totalAppointmentsCount}
              </p>
            </div>
          </div>
        </div>
      </SurfaceCard>
      <AdminPanelCard className="flex-1" panelClassName="bg-[#f4f8ff]">
        <div className="border-b border-slate-200/80 px-4 py-4 sm:px-5 sm:py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.24em] text-primary/75">
                Experiencia del paciente
              </p>
              <h2 className="font-headline text-[1.45rem] font-extrabold tracking-tight text-ink">
                Comentarios de tus citas
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-ink-muted">
                Consulta lo que los pacientes han compartido despues de atenderse contigo en la plataforma.
              </p>
            </div>
            <div className="inline-flex items-center gap-3 self-start rounded-[1.25rem] border border-amber-200/80 bg-amber-50 px-4 py-3 text-amber-900 shadow-[0_16px_34px_-24px_rgba(180,83,9,0.45)]">
              <div className="flex items-center gap-1">
                {renderStars(averageRating, 'h-4 w-4', 'dark')}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700/80">
                  Promedio actual
                </p>
                <p className="text-sm font-semibold">
                  {reviews.length > 0 ? `${averageRating.toFixed(1)} / 5` : 'Sin valoraciones'}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <div className="grid gap-4 xl:grid-cols-2">
            <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-5">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                    <Stethoscope aria-hidden="true" className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink">
                      Tratamientos
                    </h2>
                    <p className="text-sm text-ink-muted">
                      Controla que tratamientos quieres mantener visibles y disponibles.
                    </p>
                  </div>
                </div>
                {filteredTreatments.length > 0 ? (
                  <div className="space-y-3">
                    {filteredTreatments.map((treatment) => (
                      <div
                        key={treatment.id}
                        data-testid={`student-treatment-card-${treatment.id}`}
                        className="flex flex-col gap-3 rounded-[1.35rem] border border-slate-200/80 bg-slate-50 px-4 py-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-ink">{treatment.name}</p>
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
                    {isLoading
                      ? 'Cargando tratamientos...'
                      : studentContent.treatmentsPage.emptyTreatmentsState}
                  </div>
                )}
              </div>
            </SurfaceCard>
            <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-5">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                    <MapPin aria-hidden="true" className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink">
                      Sedes de practica
                    </h2>
                    <p className="text-sm text-ink-muted">
                      Gestiona en que sedes de tu universidad quieres mantener tu oferta operativa.
                    </p>
                  </div>
                </div>
                {filteredPracticeSites.length > 0 ? (
                  <div className="space-y-3">
                    {filteredPracticeSites.map((practiceSite) => (
                      <div
                        key={practiceSite.id}
                        data-testid={`student-practice-site-card-${practiceSite.id}`}
                        className="flex flex-col gap-3 rounded-[1.35rem] border border-slate-200/80 bg-slate-50 px-4 py-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-ink">{practiceSite.name}</p>
                            <p className="text-sm text-ink-muted">{practiceSite.address}</p>
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
                              {practiceSite.city} · {practiceSite.locality}
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
                    {isLoading
                      ? 'Cargando sedes...'
                      : studentContent.treatmentsPage.emptySitesState}
                  </div>
                )}
              </div>
            </SurfaceCard>
          </div>
        </div>
      </AdminPanelCard>
    </div>
  );
}
