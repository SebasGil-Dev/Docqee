import {
  Check,
  MapPin,
  MessageSquareMore,
  SlidersHorizontal,
  Star,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminTablePagination } from '@/components/admin/AdminTablePagination';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { patientContent } from '@/content/patientContent';
import { classNames } from '@/lib/classNames';
import { formatDisplayName } from '@/lib/formatDisplayName';
import { getOptimizedAvatarUrl } from '@/lib/imageOptimization';
import { usePatientModuleStore } from '@/lib/patientModuleStore';
import { calculateAverageRating, getStarFillRatio } from '@/lib/ratings';

const reviewDateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const DEFAULT_REVIEW_ROWS_PER_PAGE = 5;
const MIN_REVIEW_ROWS_PER_PAGE = 1;
const REVIEW_TABLE_HEADER_HEIGHT_PX = 30;
const REVIEW_TABLE_ROW_HEIGHT_FALLBACK_PX = 48;
const REVIEW_TABLE_HEIGHT_PADDING_PX = 4;

function renderStars(
  value: number,
  sizeClassName = 'h-4.5 w-4.5',
  tone: 'dark' | 'light' = 'light',
) {
  return Array.from({ length: 5 }, (_, index) => {
    const fillRatio = getStarFillRatio(value, index);
    const emptyClassName =
      tone === 'light' ? 'text-white/35' : 'text-slate-300/85';

    return (
      <span
        key={`patient-star-${value}-${index}`}
        aria-hidden="true"
        className={classNames('relative inline-flex shrink-0', sizeClassName)}
      >
        <Star className={classNames('h-full w-full', emptyClassName)} />
        {fillRatio > 0 ? (
          <span
            className="absolute inset-y-0 left-0 overflow-hidden"
            style={{ width: `${fillRatio * 100}%` }}
          >
            <Star
              className={classNames(
                'block max-w-none fill-amber-300 text-amber-300',
                sizeClassName,
              )}
            />
          </span>
        ) : null}
      </span>
    );
  });
}

function formatReviewSummary(averageRatingValue: number, reviewCount: number) {
  const reviewLabel = reviewCount === 1 ? 'reseña' : 'reseñas';

  return `${averageRatingValue.toFixed(1)} · (${reviewCount} ${reviewLabel})`;
}

type PatientReviewRatingFilter = 'all' | 1 | 2 | 3 | 4 | 5;

export function PatientHomePage() {
  const { errorMessage, isLoading, profile, reviews } = usePatientModuleStore();
  const [reviewRatingFilter, setReviewRatingFilter] =
    useState<PatientReviewRatingFilter>('all');
  const [isReviewRatingMenuOpen, setIsReviewRatingMenuOpen] = useState(false);
  const [reviewCurrentPage, setReviewCurrentPage] = useState(1);
  const [reviewRowsPerPage, setReviewRowsPerPage] = useState(
    DEFAULT_REVIEW_ROWS_PER_PAGE,
  );
  const reviewRatingMenuRef = useRef<HTMLDivElement | null>(null);
  const reviewTableViewportRef = useRef<HTMLDivElement | null>(null);
  const reviewTableBodyRef = useRef<HTMLTableSectionElement | null>(null);
  const patientName = formatDisplayName(
    `${profile.firstName || patientContent.shell.adminUser.firstName} ${
      profile.lastName || patientContent.shell.adminUser.lastName
    }`,
  );
  const patientInitials = useMemo(
    () =>
      `${(profile.firstName || patientContent.shell.adminUser.firstName).charAt(0)}${(
        profile.lastName || patientContent.shell.adminUser.lastName
      ).charAt(0)}`.toUpperCase(),
    [profile.firstName, profile.lastName],
  );
  const optimizedAvatarSrc = getOptimizedAvatarUrl(profile.avatarSrc, 160);
  const averageRating = useMemo(() => {
    if (reviews.length === 0) {
      return 0;
    }

    return calculateAverageRating(reviews.map((review) => review.rating));
  }, [reviews]);
  const filteredReviews = useMemo(() => {
    if (reviewRatingFilter === 'all') {
      return reviews;
    }

    return reviews.filter(
      (review) => Math.round(review.rating) === reviewRatingFilter,
    );
  }, [reviewRatingFilter, reviews]);
  const reviewTotalPages = Math.max(
    1,
    Math.ceil(filteredReviews.length / reviewRowsPerPage),
  );
  const clampedReviewCurrentPage = Math.min(
    reviewCurrentPage,
    reviewTotalPages,
  );
  const reviewPageStartIndex =
    (clampedReviewCurrentPage - 1) * reviewRowsPerPage;
  const paginatedReviews = useMemo(
    () =>
      filteredReviews.slice(
        reviewPageStartIndex,
        reviewPageStartIndex + reviewRowsPerPage,
      ),
    [filteredReviews, reviewPageStartIndex, reviewRowsPerPage],
  );
  const reviewPageStartLabel =
    filteredReviews.length > 0 ? reviewPageStartIndex + 1 : 0;
  const reviewPageEndLabel = Math.min(
    reviewPageStartIndex + paginatedReviews.length,
    filteredReviews.length,
  );
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
    setReviewCurrentPage(1);
  }, [reviewRatingFilter]);

  useEffect(() => {
    setReviewCurrentPage((currentValue) =>
      Math.min(currentValue, reviewTotalPages),
    );
  }, [reviewTotalPages]);

  useEffect(() => {
    const tableViewportElement = reviewTableViewportRef.current;

    if (!tableViewportElement) {
      return undefined;
    }

    const tableViewport = tableViewportElement;

    function updateReviewRowsPerPage() {
      const nextAvailableHeight = tableViewport.getBoundingClientRect().height;

      if (nextAvailableHeight <= 0) {
        return;
      }

      const firstHeaderCell = tableViewport.querySelector('thead th');
      const tableHeaderHeight =
        firstHeaderCell?.getBoundingClientRect().height ??
        REVIEW_TABLE_HEADER_HEIGHT_PX;
      const rowElements = Array.from(
        reviewTableBodyRef.current?.children ?? [],
      );
      const rowHeights = rowElements
        .map((rowElement) => rowElement.getBoundingClientRect().height)
        .filter((rowHeight) => rowHeight > 0);
      const estimatedRowHeight =
        rowHeights.length > 0
          ? rowHeights.reduce((sum, rowHeight) => sum + rowHeight, 0) /
            rowHeights.length
          : REVIEW_TABLE_ROW_HEIGHT_FALLBACK_PX;
      const nextRowsPerPage = Math.max(
        MIN_REVIEW_ROWS_PER_PAGE,
        Math.floor(
          (nextAvailableHeight -
            tableHeaderHeight -
            REVIEW_TABLE_HEIGHT_PADDING_PX) /
            estimatedRowHeight,
        ),
      );

      setReviewRowsPerPage((currentRowsPerPage) =>
        currentRowsPerPage === nextRowsPerPage
          ? currentRowsPerPage
          : nextRowsPerPage,
      );
    }

    updateReviewRowsPerPage();

    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(updateReviewRowsPerPage);
      resizeObserver.observe(tableViewport);

      return () => {
        resizeObserver.disconnect();
      };
    }

    window.addEventListener('resize', updateReviewRowsPerPage);

    return () => {
      window.removeEventListener('resize', updateReviewRowsPerPage);
    };
  }, [filteredReviews.length, reviewPageStartIndex, paginatedReviews.length]);

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
    <div className="student-page-compact flex h-full w-full min-h-0 flex-col gap-3 overflow-hidden">
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
      <SurfaceCard
        className="overflow-hidden bg-brand-gradient text-white"
        paddingClassName="p-0"
      >
        <div className="flex flex-col gap-3 px-4 py-3.5 sm:px-5 sm:py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-3 2xl:px-6">
          <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
            <div className="shrink-0">
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
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
                <h1 className="min-w-0 max-w-[calc(100%-4.25rem)] truncate font-headline text-[1.02rem] font-extrabold tracking-tight text-white sm:max-w-[calc(100%-4.75rem)] sm:text-[1.18rem] lg:max-w-none lg:flex-none lg:whitespace-normal lg:overflow-visible">
                  Bienvenido, {patientName}
                </h1>
                {reviews.length > 0 ? (
                  <span className="inline-flex shrink-0 items-center rounded-full bg-white/12 px-2 py-1 text-white/92 lg:hidden">
                    <span className="flex shrink-0 items-center gap-0.5">
                      {renderStars(averageRating, 'h-2.5 w-2.5 sm:h-3 w-3')}
                    </span>
                  </span>
                ) : null}
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2 lg:flex-nowrap">
                {profile.city || profile.locality ? (
                  <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[0.75rem] font-semibold text-white/88">
                    <MapPin
                      aria-hidden="true"
                      className="h-3.5 w-3.5 shrink-0"
                    />
                    <span className="max-w-[14rem] truncate sm:max-w-[16rem] xl:max-w-[18rem]">
                      {[profile.city, profile.locality]
                        .filter(Boolean)
                        .join(' - ')}
                    </span>
                  </span>
                ) : null}
                {reviews.length > 0 ? (
                  <span className="hidden min-w-0 items-center gap-2 rounded-full bg-white/12 px-2.5 py-1 text-white/92 lg:inline-flex">
                    <span className="flex shrink-0 items-center gap-0.5">
                      {renderStars(averageRating, 'h-3.5 w-3.5')}
                    </span>
                    <span className="max-w-[12rem] truncate text-[0.75rem] font-semibold xl:max-w-[14rem]">
                      {formatReviewSummary(averageRating, reviews.length)}
                    </span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </SurfaceCard>
      <AdminPanelCard className="flex-1" panelClassName="bg-[#f4f8ff]">
        <div className="border-b border-slate-200/80 px-2.5 py-2 sm:px-4">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-headline text-[0.98rem] font-extrabold tracking-tight text-ink sm:text-[1.14rem]">
                Comentarios de tus citas
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <div
                className="inline-flex items-center gap-1.5 rounded-[0.8rem] border border-sky-200/80 bg-sky-50 px-1.5 py-1 text-sky-950 shadow-[0_14px_28px_-24px_rgba(14,116,144,0.38)] sm:gap-2 sm:rounded-[0.95rem] sm:px-2.5 sm:py-1.5"
                data-testid="patient-review-comments-dashboard"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-[0.62rem] bg-white text-primary shadow-[0_12px_22px_-20px_rgba(14,116,144,0.55)] sm:h-7 sm:w-7 sm:rounded-[0.7rem]">
                  <MessageSquareMore
                    aria-hidden="true"
                    className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                  />
                </span>
                <p className="hidden text-[0.58rem] font-bold uppercase tracking-[0.16em] text-sky-700/80 sm:block">
                  Comentarios
                </p>
                <p className="font-headline text-[0.9rem] font-extrabold tracking-tight text-sky-950 sm:text-[1rem]">
                  {filteredReviews.length}
                </p>
              </div>
              <div className="relative" ref={reviewRatingMenuRef}>
                <button
                  aria-controls="patient-review-rating-menu"
                  aria-expanded={isReviewRatingMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Filtrar comentarios por estrellas"
                  className={classNames(
                    'relative inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white/98 text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-9 sm:w-9',
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
                  <SlidersHorizontal
                    aria-hidden="true"
                    className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                  />
                  {reviewRatingFilter !== 'all' ? (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
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
                                    {renderStars(
                                      option.value,
                                      'h-3.5 w-3.5',
                                      'dark',
                                    )}
                                  </div>
                                  <span>{option.label}</span>
                                </>
                              )}
                            </div>
                            <span
                              className={classNames(
                                'inline-flex h-4.5 w-4.5 items-center justify-center rounded-full',
                                isSelected
                                  ? 'bg-white/18 text-white'
                                  : 'bg-white text-slate-300',
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
        <div
          ref={reviewTableViewportRef}
          className="min-h-0 flex-1 overflow-hidden px-2 py-1.5 sm:px-3 sm:py-2.5"
        >
          {filteredReviews.length > 0 ? (
            <div className="h-full overflow-hidden">
              <table className="w-full table-fixed text-left">
                <thead className="border-b border-slate-200/80">
                  <tr className="text-[0.54rem] font-bold uppercase tracking-[0.12em] text-ink-muted sm:text-[0.6rem] sm:tracking-[0.16em]">
                    <th className="w-[31%] px-2 py-1.5 font-bold sm:w-[24%] sm:px-3 sm:py-2">
                      Estudiante
                    </th>
                    <th className="hidden w-[18%] px-3 py-2 font-bold md:table-cell">
                      Cita
                    </th>
                    <th className="w-[25%] px-1.5 py-1.5 font-bold sm:w-[18%] sm:px-3 sm:py-2">
                      Valoracion
                    </th>
                    <th className="hidden w-[14%] px-3 py-2 font-bold lg:table-cell">
                      Sede
                    </th>
                    <th className="w-[44%] px-2 py-1.5 font-bold sm:w-[40%] sm:px-3 sm:py-2">
                      Comentario
                    </th>
                  </tr>
                </thead>
                <tbody
                  ref={reviewTableBodyRef}
                  className="divide-y divide-slate-200/70"
                >
                  {paginatedReviews.map((review) => (
                    <tr
                      key={review.id}
                      className="align-top transition duration-200 hover:bg-white/55"
                      data-testid={`patient-review-card-${review.id}`}
                    >
                      <td className="px-2 py-1.5 align-top sm:px-3 sm:py-2">
                        <p className="break-words text-[0.74rem] font-semibold leading-4 text-ink sm:text-[0.8rem] sm:leading-5">
                          {formatDisplayName(review.studentName)}
                        </p>
                        <p className="mt-0.5 text-[0.56rem] font-semibold uppercase tracking-[0.1em] text-ink-muted sm:text-[0.64rem]">
                          {reviewDateFormatter.format(
                            new Date(review.createdAt),
                          )}
                        </p>
                      </td>
                      <td className="hidden px-3 py-2 align-top text-[0.74rem] leading-5 text-ink-muted md:table-cell">
                        {review.appointmentLabel}
                      </td>
                      <td className="px-1.5 py-1.5 align-top sm:px-3 sm:py-2">
                        <div className="flex flex-wrap items-center gap-0.5 pt-0.5">
                          {renderStars(
                            review.rating,
                            'h-3 w-3 sm:h-3.5 sm:w-3.5',
                            'dark',
                          )}
                        </div>
                      </td>
                      <td className="hidden px-3 py-2 align-top lg:table-cell">
                        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/70 px-2 py-0.5 text-[0.68rem] font-semibold text-ink-muted">
                          <MapPin
                            aria-hidden="true"
                            className="h-3 w-3 shrink-0"
                          />
                          <span className="truncate">
                            {formatDisplayName(review.siteName)}
                          </span>
                        </span>
                      </td>
                      <td className="px-2 py-1.5 align-top sm:px-3 sm:py-2">
                        <p className="max-h-8 overflow-hidden text-[0.72rem] leading-4 text-ink sm:max-h-10 sm:text-[0.78rem] sm:leading-5">
                          {review.comment ??
                            'El estudiante no dejo un comentario escrito para esta cita.'}
                        </p>
                        <span className="mt-0.5 hidden max-w-full items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[0.6rem] font-semibold text-ink-muted md:inline-flex lg:hidden">
                          <MapPin
                            aria-hidden="true"
                            className="h-3 w-3 shrink-0"
                          />
                          <span className="truncate">
                            {formatDisplayName(review.siteName)}
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-[1rem] border border-dashed border-slate-200 bg-white px-4 py-6">
              <div className="space-y-1.5 text-center">
                <p className="font-headline text-[1rem] font-extrabold tracking-tight text-ink">
                  {reviews.length === 0
                    ? 'Aun no tienes comentarios registrados'
                    : 'No hay comentarios para este filtro'}
                </p>
                <p className="mx-auto max-w-xl text-[0.8rem] leading-5 text-ink-muted">
                  {reviews.length === 0
                    ? 'Cuando finalicen citas con valoracion hacia tu perfil, aqui podras revisar las estrellas y comentarios recibidos.'
                    : 'Prueba con otra cantidad de estrellas para ver mas comentarios en esta seccion.'}
                </p>
              </div>
            </div>
          )}
        </div>
        <AdminTablePagination
          currentPage={clampedReviewCurrentPage}
          pageEndLabel={reviewPageEndLabel}
          pageStartLabel={reviewPageStartLabel}
          totalItems={filteredReviews.length}
          totalPages={reviewTotalPages}
          onNext={() =>
            setReviewCurrentPage((currentValue) =>
              Math.min(reviewTotalPages, currentValue + 1),
            )
          }
          onPrevious={() =>
            setReviewCurrentPage((currentValue) =>
              Math.max(1, currentValue - 1),
            )
          }
        />
      </AdminPanelCard>
      {isLoading ? (
        <p className="pb-2 text-sm font-medium text-ink-muted">
          Cargando la informacion principal del paciente...
        </p>
      ) : null}
    </div>
  );
}
