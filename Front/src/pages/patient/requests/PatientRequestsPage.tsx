import {
  Check,
  MessageSquareMore,
  Search,
  SlidersHorizontal,
  UserRound,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminTablePagination } from '@/components/admin/AdminTablePagination';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { ROUTES } from '@/constants/routes';
import { patientContent } from '@/content/patientContent';
import type { PatientRequest, PatientRequestStatus } from '@/content/types';
import { useAutoDismissSystemMessage } from '@/hooks/useAutoDismissSystemMessage';
import { useStableRowsPerPage } from '@/hooks/useStableRowsPerPage';
import { classNames } from '@/lib/classNames';
import { usePatientModuleStore } from '@/lib/patientModuleStore';

type RequestStatusFilter = PatientRequestStatus | 'all';

const requestStatusOptions: Array<{ label: string; value: RequestStatusFilter }> = [
  { label: 'Todas', value: 'all' },
  { label: 'Pendiente', value: 'PENDIENTE' },
  { label: 'Aceptada', value: 'ACEPTADA' },
  { label: 'Rechazada', value: 'RECHAZADA' },
  { label: 'Cerrada', value: 'CERRADA' },
  { label: 'Cancelada', value: 'CANCELADA' },
];

const DEFAULT_ROWS_PER_PAGE = 6;
const MIN_ROWS_PER_PAGE = 1;
const TABLE_HEADER_HEIGHT_PX = 38;
const TABLE_ROW_HEIGHT_FALLBACK_PX = 82;
const TABLE_HEIGHT_PADDING_PX = 0;

function formatRequestDate(value: string) {
  return new Date(value).toLocaleDateString('es-CO');
}

function getStatusBadgeClasses(status: PatientRequestStatus) {
  if (status === 'ACEPTADA') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }

  if (status === 'RECHAZADA' || status === 'CANCELADA') {
    return 'bg-rose-50 text-rose-700 ring-rose-200';
  }

  if (status === 'CERRADA') {
    return 'bg-slate-100 text-slate-700 ring-slate-200';
  }

  return 'bg-amber-50 text-amber-700 ring-amber-200';
}

function getStatusLabel(status: PatientRequestStatus) {
  const labels: Record<PatientRequestStatus, string> = {
    PENDIENTE: 'Pendiente',
    ACEPTADA: 'Aceptada',
    RECHAZADA: 'Rechazada',
    CERRADA: 'Cerrada',
    CANCELADA: 'Cancelada',
  };

  return labels[status];
}

function getRequestStatusPriority(status: PatientRequestStatus) {
  if (status === 'PENDIENTE') {
    return 0;
  }

  if (status === 'ACEPTADA') {
    return 1;
  }

  if (status === 'RECHAZADA') {
    return 2;
  }

  if (status === 'CERRADA') {
    return 3;
  }

  return 4;
}

function getRequestResponseTime(request: PatientRequest) {
  return new Date(request.responseAt ?? request.sentAt).getTime();
}

export function PatientRequestsPage() {
  const { errorMessage, isLoading, requests, updateRequestStatus } = usePatientModuleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatusFilter>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const tableViewportRef = useRef<HTMLDivElement | null>(null);
  const tableBodyRef = useRef<HTMLTableSectionElement | null>(null);
  const rowsPerPage = useStableRowsPerPage({
    viewportRef: tableViewportRef,
    defaultRowsPerPage: DEFAULT_ROWS_PER_PAGE,
    minRowsPerPage: MIN_ROWS_PER_PAGE,
    headerHeightPx: TABLE_HEADER_HEIGHT_PX,
    rowHeightPx: TABLE_ROW_HEIGHT_FALLBACK_PX,
    heightPaddingPx: TABLE_HEIGHT_PADDING_PX,
  });
  const normalizedSearch = searchTerm.trim().toLowerCase();

  useAutoDismissSystemMessage(successMessage, () => setSuccessMessage(null));

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === 'PENDIENTE').length,
    [requests],
  );

  const filteredRequests = useMemo(() => {
    return requests
      .map((request, index) => ({ request, index }))
      .filter(({ request }) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          [request.studentName, request.universityName, request.reason]
            .filter((value): value is string => Boolean(value))
            .some((value) => value.toLowerCase().includes(normalizedSearch));
        const matchesStatus = statusFilter === 'all' || request.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((left, right) => {
        const statusPriority =
          getRequestStatusPriority(left.request.status) - getRequestStatusPriority(right.request.status);

        if (statusPriority !== 0) {
          return statusPriority;
        }

        const leftTime = getRequestResponseTime(left.request);
        const rightTime = getRequestResponseTime(right.request);

        if (leftTime !== rightTime) {
          return rightTime - leftTime;
        }

        return left.index - right.index;
      })
      .map(({ request }) => request);
  }, [normalizedSearch, requests, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / rowsPerPage));
  const clampedCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRequests = useMemo(() => {
    const start = (clampedCurrentPage - 1) * rowsPerPage;

    return filteredRequests.slice(start, start + rowsPerPage);
  }, [clampedCurrentPage, filteredRequests, rowsPerPage]);
  const pageStartLabel = filteredRequests.length === 0 ? 0 : (clampedCurrentPage - 1) * rowsPerPage + 1;
  const pageEndLabel = Math.min(filteredRequests.length, clampedCurrentPage * rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedSearch, statusFilter]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);


  useEffect(() => {
    if (!isStatusMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (statusMenuRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsStatusMenuOpen(false);
    };

    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isStatusMenuOpen]);

  const handleCancelRequest = async (requestId: string) => {
    setSuccessMessage(null);
    await updateRequestStatus(requestId, 'CANCELADA');
    setSuccessMessage(`${patientContent.requestsPage.successNoticePrefix} cancelada.`);
  };

  return (
    <div className="student-page-compact flex h-full w-full min-h-0 flex-col gap-3 overflow-hidden">
      <Seo title="Solicitudes del paciente" description={patientContent.requestsPage.description} />
      <AdminPageHeader
        className="gap-3"
        description={patientContent.requestsPage.description}
        descriptionClassName="text-sm leading-6 sm:text-base"
        headingAlign="center"
        title={patientContent.requestsPage.title}
        titleClassName="text-[2rem] sm:text-[2.35rem]"
      />

      {(successMessage || errorMessage) && (
        <div className="grid shrink-0 gap-2">
          {successMessage && (
            <div
              className="rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700"
              role="status"
            >
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">
              {errorMessage}
            </div>
          )}
        </div>
      )}

      <div className="shrink-0">
        <SurfaceCard className="min-w-0 overflow-hidden bg-brand-gradient text-white" paddingClassName="p-0">
          <div className="flex items-center gap-2 px-3 py-1.5 sm:gap-2 sm:px-3 sm:py-1.5">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.8rem] bg-white/12 text-white sm:h-7 sm:w-7 sm:rounded-[0.85rem]">
              <UserRound className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5" aria-hidden />
            </span>
            <span className="font-headline text-[1.12rem] font-extrabold tracking-tight text-white sm:text-[1.14rem]">
              {pendingCount}
            </span>
            <p className="min-w-0 text-[0.76rem] font-semibold text-white/90 sm:text-[0.78rem]">
              Solicitudes pendientes
            </p>
          </div>
        </SurfaceCard>
      </div>

      <AdminPanelCard
        className="flex-1 bg-[#f4f8ff] shadow-none"
        panelClassName="bg-[#f4f8ff]"
        shellPaddingClassName="p-0.5 sm:p-1"
      >
        <div className="border-b border-slate-200/80 px-4 py-3.5 sm:px-4 sm:py-2.5">
          <div className="flex items-center gap-2 sm:justify-between sm:gap-3">
            <label className="relative min-w-0 flex-1 sm:max-w-[30rem] xl:max-w-[34rem]" htmlFor="patient-request-search">
              <span className="sr-only">Buscar solicitud</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ghost sm:left-3.5 sm:h-4 sm:w-4"
                aria-hidden
              />
              <input
                className="h-9 w-full rounded-full border border-slate-200/90 bg-white/98 py-0 pl-9 pr-3 text-[0.8rem] text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 placeholder:text-ghost/80 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-10 sm:pl-10 sm:pr-4 sm:text-[0.86rem]"
                id="patient-request-search"
                placeholder={patientContent.requestsPage.searchPlaceholder}
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
            <div className="relative shrink-0" ref={statusMenuRef}>
              <button
                aria-controls="patient-request-status-menu"
                aria-expanded={isStatusMenuOpen}
                aria-haspopup="menu"
                aria-label="Filtrar solicitudes por estado"
                className={classNames(
                  'relative inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white/98 text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-10 sm:w-10',
                  isStatusMenuOpen
                    ? 'border-primary/35 text-primary'
                    : 'border-slate-200/90 hover:border-primary/30 hover:bg-white',
                )}
                type="button"
                onClick={() => setIsStatusMenuOpen((current) => !current)}
              >
                <SlidersHorizontal className="h-4 w-4 sm:h-[1rem] sm:w-[1rem]" aria-hidden />
              </button>
              {statusFilter !== 'all' && (
                <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
              )}
              {isStatusMenuOpen && (
                <div
                  id="patient-request-status-menu"
                  role="menu"
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-44 overflow-hidden rounded-[1rem] border border-slate-200/80 bg-white p-1.5 shadow-[0_20px_50px_-22px_rgba(15,23,42,0.35)]"
                >
                  {requestStatusOptions.map((option) => {
                    const isSelected = option.value === statusFilter;

                    return (
                      <button
                        key={option.value}
                        className={classNames(
                          'flex w-full items-center justify-between gap-2 rounded-[0.8rem] px-3 py-2 text-left text-[0.78rem] font-semibold transition duration-200',
                          isSelected ? 'bg-primary/10 text-primary' : 'text-ink-muted hover:bg-slate-100 hover:text-ink',
                        )}
                        role="menuitemradio"
                        aria-checked={isSelected}
                        type="button"
                        onClick={() => {
                          setStatusFilter(option.value);
                          setIsStatusMenuOpen(false);
                        }}
                      >
                        <span>{option.label}</span>
                        {isSelected && <Check className="h-3.5 w-3.5" aria-hidden />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {filteredRequests.length > 0 ? (
          <div ref={tableViewportRef} className="min-h-0 flex-1 overflow-hidden">
            <table className="w-full table-fixed">
              <thead className="sticky top-0 z-10 bg-slate-100 text-left">
                <tr className="text-[0.55rem] font-bold uppercase leading-[0.72rem] tracking-[0.1em] text-ink-muted sm:text-[0.66rem] sm:leading-none sm:tracking-[0.16em]">
                  <th className="w-[36%] px-1.5 py-1 sm:px-3 sm:py-2 md:w-[27%]">Estudiante</th>
                  <th className="hidden px-2 py-1.5 sm:px-3 sm:py-2 md:table-cell md:w-[28%]">Motivo</th>
                  <th className="w-[19%] px-1 py-1 text-left sm:px-3 sm:py-2 md:w-[15%]">Estado</th>
                  <th className="w-[45%] px-1 py-1 text-center sm:px-3 sm:py-2 md:w-[30%]">Acciones</th>
                </tr>
              </thead>
              <tbody ref={tableBodyRef} className="divide-y divide-slate-200/80 bg-white">
                {paginatedRequests.map((request) => (
                  <tr key={request.id} className="align-top" data-testid={`patient-request-row-${request.id}`}>
                    <td className="px-1.5 py-1.5 sm:px-3 sm:py-2.5">
                      <div className="min-w-0 space-y-0.5 sm:space-y-1">
                        <p className="break-words text-[0.76rem] font-semibold leading-4 text-ink sm:text-sm sm:leading-5">
                          {request.studentName}
                        </p>
                        <p className="break-words text-[0.66rem] leading-[0.92rem] text-ink-muted sm:text-xs sm:leading-5">
                          {request.universityName}
                        </p>
                        <p className="text-[0.66rem] leading-[0.92rem] text-ink-muted sm:text-xs">
                          Envio: <span className="font-medium text-ink">{formatRequestDate(request.sentAt)}</span>
                        </p>
                        {request.responseAt && (
                          <p className="hidden text-xs leading-5 text-ink-muted sm:block">
                            Respuesta: <span className="font-medium text-ink">{formatRequestDate(request.responseAt)}</span>
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-2 py-2 sm:px-3 sm:py-2.5 md:table-cell">
                      <p className="line-clamp-3 break-words text-sm leading-5 text-ink-muted">
                        {request.reason || 'Sin motivo registrado.'}
                      </p>
                    </td>
                    <td className="px-1 py-1.5 sm:px-3 sm:py-2.5">
                      <span
                        className={classNames(
                          'inline-flex max-w-full rounded-full px-1 py-0.5 text-[0.6rem] font-semibold leading-3 ring-1 ring-inset sm:px-2.5 sm:py-1 sm:text-xs sm:leading-4',
                          getStatusBadgeClasses(request.status),
                        )}
                      >
                        {getStatusLabel(request.status)}
                      </span>
                    </td>
                    <td className="px-0.5 py-1.5 text-center sm:px-3 sm:py-2.5">
                      <div className="flex flex-wrap items-center justify-center gap-0.5 sm:gap-1.5 xl:flex-nowrap">
                        {request.status === 'PENDIENTE' ? (
                          <button
                            aria-label={`Cancelar solicitud de ${request.studentName}`}
                            className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full bg-rose-50 px-1 py-0.5 text-[0.56rem] font-semibold text-rose-700 transition duration-200 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs"
                            disabled={isLoading}
                            type="button"
                            onClick={() => void handleCancelRequest(request.id)}
                          >
                            <XCircle className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" aria-hidden />
                            <span className="text-[0.52rem] leading-none sm:text-xs">Cancelar</span>
                          </button>
                        ) : request.conversationId ? (
                          <Link
                            className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full bg-slate-100 px-1 py-0.5 text-[0.56rem] font-semibold text-slate-700 transition duration-200 hover:bg-slate-200 sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs"
                            to={`${ROUTES.patientConversations}?conversation=${request.conversationId}`}
                          >
                            <MessageSquareMore className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" aria-hidden />
                            <span className="text-[0.52rem] leading-none sm:text-xs">Ver chat</span>
                          </Link>
                        ) : (
                          <span className="inline-flex w-full justify-center text-[0.62rem] font-medium text-ink-muted sm:text-xs">
                            -
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 place-items-center px-5 py-10 text-center">
            <div className="max-w-sm space-y-2">
              <p className="font-semibold text-ink">
                {isLoading ? 'Cargando solicitudes...' : patientContent.requestsPage.emptyState}
              </p>
            </div>
          </div>
        )}

        <AdminTablePagination
          currentPage={clampedCurrentPage}
          onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
          pageEndLabel={pageEndLabel}
          pageStartLabel={pageStartLabel}
          totalItems={filteredRequests.length}
          totalPages={totalPages}
        />
      </AdminPanelCard>
    </div>
  );
}
