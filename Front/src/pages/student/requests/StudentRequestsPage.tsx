import {
  Check,
  MessageSquareMore,
  Search,
  ShieldX,
  SlidersHorizontal,
  UserRound,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { ROUTES } from '@/constants/routes';
import { studentContent } from '@/content/studentContent';
import type { StudentRequestStatus } from '@/content/types';
import { classNames } from '@/lib/classNames';
import { useStudentModuleStore } from '@/lib/studentModuleStore';

type RequestStatusFilter = StudentRequestStatus | 'all';

const requestStatusOptions: Array<{ label: string; value: RequestStatusFilter }> = [
  { label: 'Todas', value: 'all' },
  { label: 'Pendiente', value: 'PENDIENTE' },
  { label: 'Aceptada', value: 'ACEPTADA' },
  { label: 'Rechazada', value: 'RECHAZADA' },
  { label: 'Cerrada', value: 'CERRADA' },
  { label: 'Cancelada', value: 'CANCELADA' },
];

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

export function StudentRequestsPage() {
  const { errorMessage, isLoading, requests, respondToRequest } = useStudentModuleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatusFilter>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === 'PENDIENTE').length,
    [requests],
  );
  const activeConversationCount = useMemo(
    () => requests.filter((request) => request.conversationEnabled).length,
    [requests],
  );
  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.patientName.toLowerCase().includes(normalizedSearch) ||
      request.patientCity.toLowerCase().includes(normalizedSearch) ||
      (request.reason ?? '').toLowerCase().includes(normalizedSearch);

    return matchesSearch && (statusFilter === 'all' || request.status === statusFilter);
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

  const handleRequestAction = (requestId: string, nextStatus: StudentRequestStatus, message: string) => {
    void (async () => {
      const updated = await respondToRequest(requestId, nextStatus);

      if (!updated) {
        return;
      }

      setSuccessMessage(message);
    })();
  };

  return (
    <div className="mx-auto flex h-full max-w-[76rem] min-h-0 flex-col gap-4 overflow-hidden">
      <Seo
        description={studentContent.requestsPage.meta.description}
        noIndex
        title={studentContent.requestsPage.meta.title}
      />
      <AdminPageHeader
        description={studentContent.requestsPage.description}
        title={studentContent.requestsPage.title}
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
      <div className="grid gap-3 md:grid-cols-2">
        <SurfaceCard className="min-w-0 overflow-hidden bg-brand-gradient text-white" paddingClassName="p-0">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-white/12 text-white ring-1 ring-white/18">
              <UserRound aria-hidden="true" className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="font-headline text-[1.55rem] font-extrabold tracking-tight text-white">
                {pendingCount}
              </p>
              <p className="text-sm font-semibold text-white/90">Solicitudes pendientes</p>
            </div>
          </div>
        </SurfaceCard>
        <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-0">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-primary/10 text-primary ring-1 ring-primary/10">
              <MessageSquareMore aria-hidden="true" className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="font-headline text-[1.55rem] font-extrabold tracking-tight text-ink">
                {activeConversationCount}
              </p>
              <p className="text-sm font-semibold text-ink-muted">Conversaciones activas</p>
            </div>
          </div>
        </SurfaceCard>
      </div>
      <AdminPanelCard className="flex-1" panelClassName="bg-[#f4f8ff]">
        <div className="border-b border-slate-200/80 px-4 py-4 sm:px-5 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative min-w-0 flex-1 sm:max-w-[26rem]" htmlFor="student-request-search">
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
            <table className="min-w-[64rem] lg:min-w-full">
              <thead className="sticky top-0 z-10 bg-slate-100 text-left">
                <tr className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-ink-muted">
                  <th className="px-4 py-3 sm:px-5">Paciente</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Seguimiento</th>
                  <th className="px-4 py-3 text-right sm:px-5">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 bg-white">
                {filteredRequests.map((request) => (
                  <tr
                    key={request.id}
                    className="align-top"
                    data-testid={`student-request-row-${request.id}`}
                  >
                    <td className="px-4 py-3.5 sm:px-5">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-ink">{request.patientName}</p>
                        <p className="text-xs text-ink-muted">
                          {request.patientAge} anos · {request.patientCity}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="max-w-[18rem] text-sm leading-6 text-ink-muted">
                        {request.reason ?? 'Sin motivo registrado.'}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={classNames(
                          'inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
                          getStatusBadgeClasses(request.status),
                        )}
                      >
                        {getStatusLabel(request.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="space-y-1 text-sm text-ink-muted">
                        <p>
                          Envio:{' '}
                          <span className="font-medium text-ink">
                            {new Date(request.sentAt).toLocaleDateString('es-CO')}
                          </span>
                        </p>
                        <p>
                          Conversacion:{' '}
                          <span className="font-medium text-ink">
                            {request.conversationEnabled ? 'Habilitada' : 'No habilitada'}
                          </span>
                        </p>
                        <p>
                          Citas asociadas:{' '}
                          <span className="font-medium text-ink">{request.appointmentsCount}</span>
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right sm:px-5">
                      {request.status === 'PENDIENTE' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition duration-200 hover:bg-emerald-100"
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
                            className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition duration-200 hover:bg-rose-100"
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
                        <div className="flex justify-end gap-2">
                          {request.conversationId ? (
                            <Link
                              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition duration-200 hover:bg-primary/15"
                              to={`${ROUTES.studentConversations}?conversation=${request.conversationId}`}
                            >
                              <MessageSquareMore aria-hidden="true" className="h-3.5 w-3.5" />
                              <span>
                                {studentContent.conversationsPage.actionLabels.openConversation}
                              </span>
                            </Link>
                          ) : null}
                          <button
                            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition duration-200 hover:bg-slate-200"
                            type="button"
                            onClick={() =>
                              handleRequestAction(
                                request.id,
                                'CERRADA',
                                'La solicitud fue cerrada y la conversacion paso a modo no operativo.',
                              )
                            }
                          >
                            <ShieldX aria-hidden="true" className="h-3.5 w-3.5" />
                            <span>{studentContent.requestsPage.actionLabels.close}</span>
                          </button>
                        </div>
                      ) : request.conversationId ? (
                        <div className="flex justify-end">
                          <Link
                            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition duration-200 hover:bg-slate-200"
                            to={`${ROUTES.studentConversations}?conversation=${request.conversationId}`}
                          >
                            <MessageSquareMore aria-hidden="true" className="h-3.5 w-3.5" />
                            <span>
                              {studentContent.conversationsPage.actionLabels.viewConversation}
                            </span>
                          </Link>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-ink-muted">Sin acciones</span>
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
    </div>
  );
}
