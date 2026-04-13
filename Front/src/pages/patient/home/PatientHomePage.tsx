import { Check, MapPin, MessageSquareMore, SlidersHorizontal, Star } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { patientContent } from '@/content/patientContent';
import { classNames } from '@/lib/classNames';
import { formatDisplayName } from '@/lib/formatDisplayName';
import { getOptimizedAvatarUrl } from '@/lib/imageOptimization';
import { usePatientModuleStore } from '@/lib/patientModuleStore';

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
        key={`patient-star-${value}-${index}`}
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

type PatientReviewRatingFilter = 'all' | 1 | 2 | 3 | 4 | 5;

export function PatientHomePage() {
  const { errorMessage, isLoading, profile, reviews } = usePatientModuleStore();
  const [reviewRatingFilter, setReviewRatingFilter] =
    useState<PatientReviewRatingFilter>('all');
  const [isReviewRatingMenuOpen, setIsReviewRatingMenuOpen] = useState(false);
  const reviewRatingMenuRef = useRef<HTMLDivElement | null>(null);
  const patientName = formatDisplayName(
    `${profile.firstName || patientContent.shell.adminUser.firstName} ${
      profile.lastName || patientContent.shell.adminUser.lastName
    }`,
  );
  const patientInitials = useMemo(
    () =>
      `${(profile.firstName || patientContent.shell.adminUser.firstName).charAt(0)}${
        (profile.lastName || patientContent.shell.adminUser.lastName).charAt(0)
      }`.toUpperCase(),
    [profile.firstName, profile.lastName],
  );
  const optimizedAvatarSrc = getOptimizedAvatarUrl(profile.avatarSrc, 160);
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
  const reviewRatingOptions: Array<{
    label: string;
    value: PatientReviewRatingFilter;
  }> = [
    { label: 'Todas las estrellas', value: 'all' },
    { label: '5 estrellas', value: 5 },
    { label: '4 estrellas', value: 4 },
    { label: '3 estrellas', value: 3 },
    { label: '2 estrellas', value: 2 },
    { label: '1 estrella', value: 1 },
  ];

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
    <div className="mx-auto flex h-full max-w-[90rem] min-h-0 flex-col gap-3 overflow-hidden 2xl:max-w-[98rem]">
      <Seo
        description={patientContent.homePage.meta.description}
        noIndex
        title={patientContent.homePage.meta.title}
      />
      {errorMessage ? (
        <SurfaceCard
          className="border border-rose-200 bg-rose-50/90 text-sm font-medium text-rose-800"
          paddingClassName="p-3.5"
        >
          <p role="alert">{errorMessage}</p>
        </SurfaceCard>
      ) : null}
      <SurfaceCard className="overflow-hidden bg-brand-gradient text-white" paddingClassName="p-0">
        <div className="flex flex-col gap-3 px-4 py-3.5 sm:px-5 sm:py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-3 2xl:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {optimizedAvatarSrc ? (
              <img
                alt={patientName}
                className="h-12 w-12 rounded-[1.2rem] object-cover ring-4 ring-white/20 sm:h-14 sm:w-14"
                decoding="async"
                src={optimizedAvatarSrc}
              />
            ) : (
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-white/14 text-base font-extrabold uppercase text-white ring-4 ring-white/15 sm:h-14 sm:w-14 sm:text-lg">
                {patientInitials}
              </span>
            )}
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-2.5">
                <h1 className="max-w-[14rem] truncate font-headline text-[1.05rem] font-extrabold tracking-tight text-white sm:max-w-[16rem] sm:text-[1.18rem] xl:max-w-[20rem]">
                  Bienvenido, {patientName}
                </h1>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {profile.city || profile.locality ? (
                  <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[0.75rem] font-semibold text-white/88">
                    <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                    <span className="max-w-[14rem] truncate sm:max-w-[16rem] xl:max-w-[18rem]">
                      {[profile.city, profile.locality]
                        .filter(Boolean)
                        .map((value) => formatDisplayName(value))
                        .join(' - ')}
                    </span>
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-2.5 py-1 text-white/92">
                  <div className="flex shrink-0 items-center gap-0.5">
                    {renderStars(averageRating, 'h-3.5 w-3.5')}
                  </div>
                  {reviews.length > 0 ? (
                    <span className="max-w-[12rem] truncate text-[0.75rem] font-semibold sm:max-w-[14rem] xl:max-w-[18rem]">
                      {`${averageRating.toFixed(1)} de 5 en ${reviews.length} valoraciones`}
                    </span>
                  ) : (
                    <span className="text-[0.75rem] font-semibold">
                      Aun no tienes valoraciones registradas
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </SurfaceCard>
      <AdminPanelCard className="flex-1" panelClassName="bg-[#f4f8ff]">
        <div className="border-b border-slate-200/80 px-4 py-3.5 sm:px-5 sm:py-3.5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-1">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.24em] text-primary/75">
                Experiencia en citas
              </p>
              <h2 className="font-headline text-[1.45rem] font-extrabold tracking-tight text-ink">
                Comentarios recibidos
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 self-start">
              <div
                className="inline-flex items-center gap-2 rounded-[1.2rem] border border-sky-200/80 bg-sky-50 px-3.5 py-2.5 text-sky-950 shadow-[0_16px_34px_-24px_rgba(14,116,144,0.38)]"
                data-testid="patient-review-comments-dashboard"
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
                  aria-controls="patient-review-rating-menu"
                  aria-expanded={isReviewRatingMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Filtrar comentarios por estrellas"
                  className={classNames(
                    'relative inline-flex h-11 w-11 items-center justify-center rounded-full border bg-white/98 text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                    reviewRatingFilter === 'all'
                      ? 'border-slate-200/90 hover:border-primary/30 hover:bg-white'
                      : 'border-primary/30 bg-primary/10 text-primary',
                  )}
                  data-testid="patient-review-rating-filter-button"
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
                    id="patient-review-rating-menu"
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
                  <div className="space-y-3" data-testid={`patient-review-card-${review.id}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-ink">
                          {formatDisplayName(review.studentName)}
                        </p>
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
                      <span className="text-sm font-semibold text-ink">
                        {review.rating.toFixed(1)}
                      </span>
                    </div>
                    <p className="rounded-[1.2rem] bg-slate-50 px-3.5 py-3 text-sm leading-6 text-ink">
                      {review.comment ?? 'No hay un comentario escrito para esta cita.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
                        <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
                        {formatDisplayName(review.siteName)}
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
                    ? 'Cuando finalicen citas con valoracion hacia tu perfil, aqui podras revisar las estrellas y comentarios recibidos.'
                    : 'Prueba con otra cantidad de estrellas para ver mas comentarios en esta seccion.'}
                </p>
              </div>
            </SurfaceCard>
          )}
        </div>
      </AdminPanelCard>
      {isLoading ? (
        <p className="pb-2 text-sm font-medium text-ink-muted">
          Cargando la informacion principal del paciente...
        </p>
      ) : null}
    </div>
  );
}
