import {
  Check,
  Eye,
  MessageSquareMore,
  Search,
  ShieldX,
  SlidersHorizontal,
  Star,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { AdminConfirmationDialog } from '@/components/admin/AdminConfirmationDialog';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { ROUTES } from '@/constants/routes';
import { studentContent } from '@/content/studentContent';
import type { StudentRequest, StudentRequestStatus } from '@/content/types';
import { classNames } from '@/lib/classNames';
import { getOptimizedAvatarUrl } from '@/lib/imageOptimization';
import { useStudentModuleStore } from '@/lib/studentModuleStore';

type RequestStatusFilter = StudentRequestStatus | 'all';

type StudentRequestProfileDialogProps = {
  onAccept: () => void;
  onClose: () => void;
  onReject: () => void;
  request: StudentRequest;
};

const preloadedPatientAvatarUrls = new Set<string>();

const requestStatusOptions: Array<{ label: string; value: RequestStatusFilter }> = [
  { label: 'Todas', value: 'all' },
  { label: 'Pendiente', value: 'PENDIENTE' },
  { label: 'Aceptada', value: 'ACEPTADA' },
  { label: 'Rechazada', value: 'RECHAZADA' },
  { label: 'Cerrada', value: 'CERRADA' },
  { label: 'Cancelada', value: 'CANCELADA' },
];

const requestProfileDateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function formatRequestDate(value: string) {
  return new Date(value).toLocaleDateString('es-CO');
}

function getPatientLocationLabel(request: StudentRequest) {
  return [request.patientCity, request.patientLocality].filter(Boolean).join(' - ');
}

function renderRatingStars(value: number, sizeClassName = 'h-4 w-4') {
  return Array.from({ length: 5 }, (_, index) => {
    const isFilled = index < Math.round(value);

    return (
      <Star
        key={`request-rating-star-${value}-${index}`}
        aria-hidden="true"
        className={classNames(
          sizeClassName,
          isFilled ? 'fill-amber-300 text-amber-300' : 'text-slate-300',
        )}
      />
    );
  });
}

function getStatusBadgeClasses(status: StudentRequestStatus) {
  switch (status) {
    case 'ACEPTADA':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'RECHAZADA':
      return 'bg-rose-50 text-rose-700 ring-rose-200';
    case 'CERRADA':
      return 'bg-slate-100 text-slate-700 ring-slate-200';
    case 'CANCELADA':
      return 'bg-slate-100 text-slate-700 ring-slate-200';
    default:
      return 'bg-amber-50 text-amber-700 ring-amber-200';
  }
}

function getStatusLabel(status: StudentRequestStatus) {
  switch (status) {
    case 'ACEPTADA':
      return 'Aceptada';
    case 'RECHAZADA':
      return 'Rechazada';
    case 'CERRADA':
      return 'Cerrada';
    case 'CANCELADA':
      return 'Cancelada';
    default:
      return 'Pendiente';
  }
}

function getPatientInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'P';
}

function getRequestPatientAvatarSrc(src: string | null | undefined) {
  const normalizedSrc = src?.trim();

  if (!normalizedSrc || normalizedSrc.startsWith('/patient-avatars/')) {
    return undefined;
  }

  return getOptimizedAvatarUrl(normalizedSrc, 160);
}

function preloadPatientAvatar(src: string | undefined) {
  if (!src || preloadedPatientAvatarUrls.has(src) || typeof Image === 'undefined') {
    return;
  }

  preloadedPatientAvatarUrls.add(src);
  const image = new Image();
  image.decoding = 'async';
  image.src = src;
}

function StudentRequestProfileDialog({
  onAccept,
  onClose,
  onReject,
  request,
}: StudentRequestProfileDialogProps) {
  const patientProfile = request.patientProfile ?? null;
  const patientReviews = patientProfile?.reviews ?? [];
  const patientComments = patientReviews.filter((review) => Boolean(review.comment?.trim()));
  const patientInitials = getPatientInitials(request.patientName);
  const optimizedAvatarSrc = getRequestPatientAvatarSrc(patientProfile?.avatarSrc);
  const averageRating = patientProfile?.averageRating ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        aria-label="Cerrar perfil del paciente"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
        type="button"
        onClick={onClose}
      />
      <div
        aria-labelledby={`student-request-profile-title-${request.id}`}
        aria-modal="true"
        className="relative w-full max-w-4xl overflow-hidden rounded-[1.9rem] border border-slate-200/80 bg-white shadow-[0_34px_90px_-36px_rgba(15,23,42,0.55)]"
        role="dialog"
      >
        <div className="absolute right-4 top-4 z-10">
          <button
            aria-label="Cerrar perfil del paciente"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-ink-muted transition duration-200 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
            type="button"
            onClick={onClose}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <div className="admin-scrollbar max-h-[min(84vh,48rem)] overflow-y-auto px-4 pb-4 pt-5 sm:px-5 sm:pb-5 sm:pt-6">
          <div className="space-y-4">
            <div className="space-y-1.5 pr-10">
              <h2
                className="font-headline text-[1.35rem] font-extrabold tracking-tight text-ink sm:text-[1.5rem]"
                id={`student-request-profile-title-${request.id}`}
              >
                Perfil de {request.patientName}
              </h2>
            </div>

            <SurfaceCard
              className="overflow-hidden bg-brand-gradient text-white shadow-none"
              paddingClassName="p-0"
            >
              <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-4 py-4 sm:px-5 sm:py-5 lg:grid-cols-[auto_minmax(0,1fr)_minmax(9rem,0.7fr)_minmax(10rem,0.75fr)] lg:items-stretch">
                <div className="flex shrink-0 items-center">
                  {optimizedAvatarSrc ? (
                    <img
                      alt={
                        patientProfile?.avatarAlt ?? `Foto de perfil de ${request.patientName}`
                      }
                      className="h-20 w-20 rounded-[1.55rem] object-cover ring-4 ring-white/20 sm:h-24 sm:w-24"
                      decoding="async"
                      fetchPriority="high"
                      height={96}
                      loading="eager"
                      src={optimizedAvatarSrc}
                      width={96}
                    />
                  ) : (
                    <span className="inline-flex h-20 w-20 items-center justify-center rounded-[1.55rem] bg-white/14 text-2xl font-extrabold uppercase text-white ring-4 ring-white/15 sm:h-24 sm:w-24 sm:text-[1.7rem]">
                      {patientInitials}
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-col justify-center gap-2 rounded-[1.15rem] bg-white/10 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <h3 className="truncate font-headline text-[1.25rem] font-extrabold tracking-tight text-white">
                      {request.patientName}
                    </h3>
                    <p className="text-sm font-medium text-white/88">
                      {`${request.patientAge} a\u00f1os - ${request.patientCity}`}
                    </p>
                  </div>
                </div>
                <div className="col-span-2 flex min-w-0 flex-col justify-center rounded-[1.15rem] bg-white/10 px-3.5 py-2.5 lg:col-span-1">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/65">
                    {'Valoraci\u00f3n'}
                  </p>
                  <div
                    aria-label={
                      averageRating !== null
                        ? `Valoracion ${averageRating.toFixed(1)} de 5`
                        : 'Sin valoracion'
                    }
                    className="mt-2 flex items-center gap-1.5"
                  >
                    {renderRatingStars(averageRating ?? 0, 'h-4 w-4')}
                  </div>
                </div>
                <div className="col-span-2 flex min-w-0 flex-col justify-center rounded-[1.15rem] bg-white/10 px-3.5 py-2.5 lg:col-span-1">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/65">
                    Solicitud enviada
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {requestProfileDateFormatter.format(new Date(request.sentAt))}
                  </p>
                </div>
              </div>
            </SurfaceCard>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
              <SurfaceCard
                className="border border-slate-200/80 bg-white shadow-none"
                paddingClassName="p-4"
              >
                <div className="space-y-3">
                  <div>
                    <h3 className="font-headline text-lg font-extrabold tracking-tight text-ink">
                      Motivo de la solicitud
                    </h3>
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm leading-6 text-ink-muted">
                    {request.reason ?? 'Sin motivo registrado.'}
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard
                className="border border-slate-200/80 bg-white shadow-none"
                paddingClassName="p-4"
              >
                <div className="space-y-3.5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-headline text-lg font-extrabold tracking-tight text-ink">
                        Comentarios de otros estudiantes
                      </h3>
                    </div>
                  </div>

                  {patientComments.length > 0 ? (
                    <div className="space-y-2.5">
                      {patientComments.map((review) => (
                        <div
                          className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-3.5 py-3"
                          key={review.id}
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-ink">{review.authorName}</p>
                              <p className="text-xs text-ink-muted">
                                {requestProfileDateFormatter.format(new Date(review.createdAt))}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-amber-700">
                              <span className="flex items-center gap-1">
                                {renderRatingStars(review.rating, 'h-3.5 w-3.5')}
                              </span>
                              <span>{review.rating.toFixed(1)}</span>
                            </div>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-ink-muted">
                            {review.comment}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-ink-muted">
                      Este paciente aun no tiene comentarios escritos por otros estudiantes.
                    </div>
                  )}
                </div>
              </SurfaceCard>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                className="inline-flex items-center justify-center rounded-full bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition duration-200 hover:bg-slate-200"
                type="button"
                onClick={onClose}
              >
                Cerrar
              </button>
              {request.status === 'PENDIENTE' ? (
                <>
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition duration-200 hover:bg-rose-100"
                    type="button"
                    onClick={onReject}
                  >
                    <XCircle aria-hidden="true" className="h-4 w-4" />
                    <span>{studentContent.requestsPage.actionLabels.reject}</span>
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition duration-200 hover:bg-emerald-100"
                    type="button"
                    onClick={onAccept}
                  >
                    <Check aria-hidden="true" className="h-4 w-4" />
                    <span>{studentContent.requestsPage.actionLabels.accept}</span>
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StudentRequestsPage() {
  const { errorMessage, isLoading, requests, respondToRequest } = useStudentModuleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatusFilter>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [requestToClose, setRequestToClose] = useState<StudentRequest | null>(null);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === 'PENDIENTE').length,
    [requests],
  );
  const filteredRequests = requests.filter((request) => {
    const matchesSearch = request.patientName.toLowerCase().includes(normalizedSearch);

    return matchesSearch && (statusFilter === 'all' || request.status === statusFilter);
  });
  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedRequestId) ?? null,
    [requests, selectedRequestId],
  );

  useEffect(() => {
    requests.forEach((request) => {
      preloadPatientAvatar(getRequestPatientAvatarSrc(request.patientProfile?.avatarSrc));
    });
  }, [requests]);

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
    if (!selectedRequestId) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSelectedRequestId(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedRequestId]);

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [successMessage]);

  const handleRequestAction = (
    requestId: string,
    nextStatus: StudentRequestStatus,
    message: string,
    onSuccess?: () => void,
  ) => {
    void (async () => {
      const updated = await respondToRequest(requestId, nextStatus);

      if (!updated) {
        return;
      }

      setSuccessMessage(message);
      onSuccess?.();
    })();
  };

  return (
    <div className="student-page-compact flex h-full w-full min-h-0 flex-col gap-3 overflow-hidden">
      <Seo
        description={studentContent.requestsPage.meta.description}
        noIndex
        title={studentContent.requestsPage.meta.title}
      />
      <AdminPageHeader
        className="gap-3"
        description={studentContent.requestsPage.description}
        descriptionClassName="text-sm leading-6 sm:text-base"
        headingAlign="center"
        title={studentContent.requestsPage.title}
        titleClassName="text-[2rem] sm:text-[2.35rem]"
      />
      {successMessage ? (
        <SurfaceCard
          className="border border-emerald-200 bg-emerald-50/90 text-sm font-medium text-emerald-800"
          paddingClassName="p-3.5"
        >
          <p role="status">
            <span className="font-semibold">
              {studentContent.requestsPage.successNoticePrefix}
            </span>{' '}
            {successMessage}
          </p>
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
      <div>
        <SurfaceCard
          className="min-w-0 overflow-hidden bg-brand-gradient text-white"
          paddingClassName="p-0"
        >
          <div className="flex items-center gap-2.5 px-3.5 py-2">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.9rem] bg-white/12 text-white ring-1 ring-white/18">
              <UserRound aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="font-headline text-[1.28rem] font-extrabold tracking-tight text-white">
              {pendingCount}
            </span>
            <p className="min-w-0 text-[0.82rem] font-semibold text-white/90">
              Solicitudes pendientes
            </p>
          </div>
        </SurfaceCard>
      </div>
      <AdminPanelCard className="flex-1" panelClassName="bg-[#f4f8ff]">
        <div className="border-b border-slate-200/80 px-4 py-3.5 sm:px-5 sm:py-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label
              className="relative min-w-0 flex-1 sm:max-w-[30rem] xl:max-w-[34rem]"
              htmlFor="student-request-search"
            >
              <span className="sr-only">{studentContent.requestsPage.searchLabel}</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost"
              />
              <input
                className="h-11 w-full rounded-full border border-slate-200/90 bg-white/98 py-0 pl-11 pr-4 text-sm text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 placeholder:text-ghost/80 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                id="student-request-search"
                placeholder={studentContent.requestsPage.searchPlaceholder}
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
            <div className="relative shrink-0" ref={statusMenuRef}>
              <button
                aria-controls="student-request-status-menu"
                aria-expanded={isStatusMenuOpen}
                aria-haspopup="menu"
                aria-label={
                  statusFilter === 'all'
                    ? 'Filtrar solicitudes por estado'
                    : `Filtrar solicitudes por estado. Actual: ${
                        requestStatusOptions.find((option) => option.value === statusFilter)?.label
                      }`
                }
                className={classNames(
                  'relative inline-flex h-11 w-11 items-center justify-center rounded-full border bg-white/98 text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                  statusFilter === 'all'
                    ? 'border-slate-200/90 hover:border-primary/30 hover:bg-white'
                    : 'border-primary/25 bg-primary/[0.08] text-primary hover:bg-primary/[0.12]',
                )}
                type="button"
                onClick={() => setIsStatusMenuOpen((currentValue) => !currentValue)}
              >
                <SlidersHorizontal aria-hidden="true" className="h-[1.05rem] w-[1.05rem]" />
                {statusFilter !== 'all' ? (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
                ) : null}
              </button>
              {isStatusMenuOpen ? (
                <div
                  className="absolute right-0 top-[calc(100%+0.6rem)] z-20 w-[14rem] overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-white/95 p-2 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] backdrop-blur"
                  id="student-request-status-menu"
                  role="menu"
                >
                  <div className="px-2.5 pb-2 pt-1">
                    <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-primary/75">
                      Filtrar por estado
                    </p>
                  </div>
                  <div className="space-y-1">
                    {requestStatusOptions.map((option) => {
                      const isSelected = statusFilter === option.value;

                      return (
                        <button
                          key={option.value}
                          aria-checked={isSelected}
                          className={classNames(
                            'flex w-full items-center justify-between rounded-[1rem] px-3 py-2.5 text-left text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                            isSelected
                              ? 'bg-primary text-white shadow-[0_14px_30px_-20px_rgba(22,78,99,0.9)]'
                              : 'bg-slate-50/70 text-ink hover:bg-slate-100',
                          )}
                          role="menuitemradio"
                          type="button"
                          onClick={() => {
                            setStatusFilter(option.value);
                            setIsStatusMenuOpen(false);
                          }}
                        >
                          <span>{option.label}</span>
                          <span
                            className={classNames(
                              'inline-flex h-5 w-5 items-center justify-center rounded-full',
                              isSelected ? 'bg-white/18 text-white' : 'bg-white text-slate-300',
                            )}
                          >
                            <Check aria-hidden="true" className="h-3.5 w-3.5" />
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
        {filteredRequests.length > 0 ? (
          <div className="admin-scrollbar min-h-0 flex-1 overflow-x-auto overflow-y-auto">
            <table className="min-w-[62rem] lg:min-w-full">
              <thead className="sticky top-0 z-10 bg-slate-100 text-left">
                <tr className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-ink-muted">
                  <th className="w-[17rem] px-4 py-2.5 sm:px-5">Paciente</th>
                  <th className="px-4 py-2.5">Motivo</th>
                  <th className="w-[9.5rem] px-4 py-2.5 text-left">Estado</th>
                  <th className="w-[18rem] px-4 py-2.5 text-center sm:px-5">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 bg-white">
                {filteredRequests.map((request) => (
                  <tr
                    key={request.id}
                    className="align-top"
                    data-testid={`student-request-row-${request.id}`}
                  >
                    <td className="w-[17rem] px-4 py-3 sm:px-5">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-ink">{request.patientName}</p>
                        <p className="text-xs text-ink-muted">
                          {getPatientLocationLabel(request)}
                        </p>
                        <p className="text-xs text-ink-muted">
                          Envio:{' '}
                          <span className="font-medium text-ink">
                            {formatRequestDate(request.sentAt)}
                          </span>
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-[22rem] text-sm leading-6 text-ink-muted 2xl:max-w-[30rem]">
                        {request.reason ?? 'Sin motivo registrado.'}
                      </p>
                    </td>
                    <td className="w-[9.5rem] px-4 py-3">
                      <span
                        className={classNames(
                          'inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
                          getStatusBadgeClasses(request.status),
                        )}
                      >
                        {getStatusLabel(request.status)}
                      </span>
                    </td>
                    <td className="w-[18rem] px-4 py-3 text-center sm:px-5">
                      {request.status === 'PENDIENTE' ? (
                        <div className="flex flex-nowrap items-center justify-center gap-2 whitespace-nowrap">
                          <button
                            aria-label={`Ver perfil de ${request.patientName}`}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition duration-200 hover:bg-slate-200"
                            type="button"
                            onClick={() => setSelectedRequestId(request.id)}
                          >
                            <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                            <span>{studentContent.requestsPage.actionLabels.viewProfile}</span>
                          </button>
                          <button
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition duration-200 hover:bg-emerald-100"
                            type="button"
                            onClick={() =>
                              handleRequestAction(
                                request.id,
                                'ACEPTADA',
                                'La solicitud fue aceptada y la conversacion quedo habilitada.',
                              )
                            }
                          >
                            <Check aria-hidden="true" className="h-3.5 w-3.5" />
                            <span>{studentContent.requestsPage.actionLabels.accept}</span>
                          </button>
                          <button
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition duration-200 hover:bg-rose-100"
                            type="button"
                            onClick={() =>
                              handleRequestAction(
                                request.id,
                                'RECHAZADA',
                                'La solicitud fue rechazada desde el modulo del estudiante.',
                              )
                            }
                          >
                            <XCircle aria-hidden="true" className="h-3.5 w-3.5" />
                            <span>{studentContent.requestsPage.actionLabels.reject}</span>
                          </button>
                        </div>
                      ) : request.status === 'ACEPTADA' ? (
                        <div className="flex flex-nowrap items-center justify-center gap-2 whitespace-nowrap">
                          <button
                            aria-label={`Ver perfil de ${request.patientName}`}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition duration-200 hover:bg-slate-200"
                            type="button"
                            onClick={() => setSelectedRequestId(request.id)}
                          >
                            <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                            <span>{studentContent.requestsPage.actionLabels.viewProfile}</span>
                          </button>
                          {request.conversationId ? (
                            <Link
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition duration-200 hover:bg-primary/15"
                              to={`${ROUTES.studentConversations}?conversation=${request.conversationId}`}
                            >
                              <MessageSquareMore aria-hidden="true" className="h-3.5 w-3.5" />
                              <span>
                                {studentContent.conversationsPage.actionLabels.openConversation}
                              </span>
                            </Link>
                          ) : null}
                          <button
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition duration-200 hover:bg-slate-200"
                            type="button"
                            onClick={() => setRequestToClose(request)}
                          >
                            <ShieldX aria-hidden="true" className="h-3.5 w-3.5" />
                            <span>{studentContent.requestsPage.actionLabels.close}</span>
                          </button>
                        </div>
                      ) : request.conversationId ? (
                        <div className="flex flex-nowrap items-center justify-center gap-2 whitespace-nowrap">
                          <button
                            aria-label={`Ver perfil de ${request.patientName}`}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition duration-200 hover:bg-slate-200"
                            type="button"
                            onClick={() => setSelectedRequestId(request.id)}
                          >
                            <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                            <span>{studentContent.requestsPage.actionLabels.viewProfile}</span>
                          </button>
                          <Link
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition duration-200 hover:bg-slate-200"
                            to={`${ROUTES.studentConversations}?conversation=${request.conversationId}`}
                          >
                            <MessageSquareMore aria-hidden="true" className="h-3.5 w-3.5" />
                            <span>
                              {studentContent.conversationsPage.actionLabels.viewConversation}
                            </span>
                          </Link>
                        </div>
                      ) : (
                        <div className="flex flex-nowrap items-center justify-center gap-2 whitespace-nowrap">
                          <button
                            aria-label={`Ver perfil de ${request.patientName}`}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition duration-200 hover:bg-slate-200"
                            type="button"
                            onClick={() => setSelectedRequestId(request.id)}
                          >
                            <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                            <span>{studentContent.requestsPage.actionLabels.viewProfile}</span>
                          </button>
                          <span className="text-xs font-medium text-ink-muted">Sin acciones</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-8 text-center sm:px-5">
            <p className="text-sm font-medium text-ink-muted">
              {isLoading ? 'Cargando solicitudes...' : studentContent.requestsPage.emptyState}
            </p>
          </div>
        )}
      </AdminPanelCard>

      {selectedRequest ? (
        <StudentRequestProfileDialog
          request={selectedRequest}
          onAccept={() =>
            handleRequestAction(
              selectedRequest.id,
              'ACEPTADA',
              'La solicitud fue aceptada y la conversacion quedo habilitada.',
              () => setSelectedRequestId(null),
            )
          }
          onClose={() => setSelectedRequestId(null)}
          onReject={() =>
            handleRequestAction(
              selectedRequest.id,
              'RECHAZADA',
              'La solicitud fue rechazada desde el modulo del estudiante.',
              () => setSelectedRequestId(null),
            )
          }
        />
      ) : null}
      <AdminConfirmationDialog
        cancelLabel="No, volver"
        confirmLabel="Sí, cerrar solicitud"
        description="Si cierras esta solicitud, ya no podrás comunicarte más con este usuario. ¿Estás seguro de que deseas continuar?"
        icon={ShieldX}
        isOpen={!!requestToClose}
        isSubmitting={isLoading}
        title="Cerrar solicitud"
        tone="danger"
        onCancel={() => setRequestToClose(null)}
        onConfirm={() => {
          if (!requestToClose) {
            return;
          }

          handleRequestAction(
            requestToClose.id,
            'CERRADA',
            'La solicitud fue cerrada y la conversación quedó inhabilitada para nuevos mensajes.',
            () => setRequestToClose(null),
          );
        }}
      />
    </div>
  );
}
