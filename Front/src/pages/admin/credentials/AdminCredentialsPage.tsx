import {
  Check,
  ChevronLeft,
  ChevronRight,
  Mail,
  PencilLine,
  RotateCcw,
  Search,
  Send,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AdminConfirmationDialog } from '@/components/admin/AdminConfirmationDialog';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { adminContent } from '@/content/adminContent';
import type { AdminUniversity, PendingCredential } from '@/content/types';
import { useStableRowsPerPage } from '@/hooks/useStableRowsPerPage';
import { classNames } from '@/lib/classNames';
import { formatDisplayName } from '@/lib/formatDisplayName';
import { useAdminModuleStore } from '@/lib/adminModuleStore';

type CredentialRow = PendingCredential;

type CredentialFilterValue = 'all' | 'generated' | 'pending' | 'sent';

type PendingCredentialConfirmation =
  | {
      action: 'delete';
      credential: CredentialRow;
    }
  | {
      action: 'resend' | 'send';
      credential: CredentialRow;
    };

const credentialFilterOptions: Array<{
  label: string;
  value: CredentialFilterValue;
}> = [
  { label: 'Todos', value: 'all' },
  { label: 'Generada', value: 'generated' },
  { label: 'Pendiente', value: 'pending' },
  { label: 'Enviada', value: 'sent' },
];

const AUTO_REFRESH_MIN_INTERVAL_MS = 5000;
const DEFAULT_ROWS_PER_PAGE = 6;
const MIN_ROWS_PER_PAGE = 1;
const TABLE_HEADER_HEIGHT_PX = 38;
const TABLE_ROW_HEIGHT_FALLBACK_PX = 60;
const TABLE_HEIGHT_PADDING_PX = 4;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formatLastSentAt(value: string | null) {
  if (!value) {
    return 'Sin envío previo';
  }

  return new Date(value).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getFirstNamePart(value: string) {
  return value.trim().split(/\s+/)[0] ?? '';
}

function buildCompactAdministratorLabel(
  credential: CredentialRow,
  university?: AdminUniversity,
) {
  if (university) {
    return formatDisplayName(
      `${getFirstNamePart(university.adminFirstName)} ${getFirstNamePart(university.adminLastName)}`,
    );
  }

  const nameParts = credential.administratorName.trim().split(/\s+/);

  if (nameParts.length <= 2) {
    return formatDisplayName(credential.administratorName);
  }

  const inferredLastName =
    nameParts.length >= 4 ? nameParts[2] : nameParts[nameParts.length - 1];

  return formatDisplayName(`${nameParts[0]} ${inferredLastName}`);
}

export function AdminCredentialsPage() {
  const {
    credentials,
    deleteCredential,
    editCredentialEmail,
    errorMessage,
    isLoading,
    resendCredential,
    refresh,
    sendAllCredentials,
    sendCredential,
    universities,
  } = useAdminModuleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<CredentialFilterValue>('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(
    null,
  );
  const [emailDraft, setEmailDraft] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingCredentialConfirmation | null>(null);
  const [isConfirmationSubmitting, setIsConfirmationSubmitting] =
    useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const tableViewportRef = useRef<HTMLDivElement | null>(null);
  const tableBodyRef = useRef<HTMLTableSectionElement | null>(null);
  const stableRowsPerPage = useStableRowsPerPage({
    viewportRef: tableViewportRef,
    defaultRowsPerPage: DEFAULT_ROWS_PER_PAGE,
    minRowsPerPage: MIN_ROWS_PER_PAGE,
    headerHeightPx: TABLE_HEADER_HEIGHT_PX,
    rowHeightPx: TABLE_ROW_HEIGHT_FALLBACK_PX,
    heightPaddingPx: TABLE_HEIGHT_PADDING_PX,
    rowSafetyBufferPx: 8,
  });
  const rowsPerPage = stableRowsPerPage;
  const lastAutoRefreshAtRef = useRef(0);
  const credentialRows = useMemo<CredentialRow[]>(
    () => credentials,
    [credentials],
  );
  const universitiesById = useMemo(
    () =>
      new Map(
        universities.map((university) => [university.id, university] as const),
      ),
    [universities],
  );
  const generatedCredentialCount = credentialRows.filter(
    (credential) => credential.deliveryStatus === 'generated',
  ).length;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredCredentialRows = credentialRows.filter((credential) => {
    const matchesSearch =
      credential.universityName.toLowerCase().includes(normalizedSearch) ||
      credential.administratorName.toLowerCase().includes(normalizedSearch) ||
      credential.administratorEmail.toLowerCase().includes(normalizedSearch);

    if (!matchesSearch) {
      return false;
    }

    if (statusFilter === 'all') {
      return true;
    }

    if (statusFilter === 'pending') {
      return credential.universityStatus === 'pending';
    }

    return credential.deliveryStatus === statusFilter;
  });
  const emptyStateMessage = isLoading
    ? 'Cargando credenciales...'
    : normalizedSearch || statusFilter !== 'all'
      ? 'No encontramos credenciales con los filtros seleccionados.'
      : adminContent.credentialsPage.emptyState;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredCredentialRows.length / rowsPerPage),
  );
  const clampedCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (clampedCurrentPage - 1) * rowsPerPage;
  const paginatedCredentialRows = useMemo(
    () =>
      filteredCredentialRows.slice(
        pageStartIndex,
        pageStartIndex + rowsPerPage,
      ),
    [filteredCredentialRows, pageStartIndex, rowsPerPage],
  );
  const pageStartLabel =
    filteredCredentialRows.length > 0 ? pageStartIndex + 1 : 0;
  const pageEndLabel = Math.min(
    pageStartIndex + paginatedCredentialRows.length,
    filteredCredentialRows.length,
  );

  const handleStartEmailEdit = (credential: CredentialRow) => {
    setEditingCredentialId(credential.id);
    setEmailDraft(credential.administratorEmail);
    setEmailError(null);
    setFeedbackMessage(null);
  };

  const handleCancelEmailEdit = () => {
    setEditingCredentialId(null);
    setEmailDraft('');
    setEmailError(null);
  };

  const handleCloseConfirmation = () => {
    if (isConfirmationSubmitting) {
      return;
    }

    setPendingConfirmation(null);
  };

  const handleSaveEmail = (credentialId: string, administratorName: string) => {
    const normalizedEmail = emailDraft.trim();
    const formattedAdministratorName = formatDisplayName(administratorName);

    if (!isValidEmail(normalizedEmail)) {
      setEmailError(adminContent.credentialsPage.emailInvalidMessage);
      return;
    }

    void (async () => {
      const updated = await editCredentialEmail(credentialId, normalizedEmail);

      if (!updated) {
        setEmailError('No pudimos actualizar el correo en este momento.');
        return;
      }

      setEditingCredentialId(null);
      setEmailDraft('');
      setEmailError(null);
      setFeedbackMessage(
        `El correo de ${formattedAdministratorName} se actualizo correctamente.`,
      );
    })();
  };

  const handleConfirmPendingAction = () => {
    if (!pendingConfirmation) {
      return;
    }

    setIsConfirmationSubmitting(true);

    void (async () => {
      if (pendingConfirmation.action === 'delete') {
        const deleted = await deleteCredential(
          pendingConfirmation.credential.id,
        );

        if (deleted) {
          if (editingCredentialId === pendingConfirmation.credential.id) {
            handleCancelEmailEdit();
          }

          setFeedbackMessage(
            'La credencial pendiente se elimino correctamente.',
          );
        }
      } else {
        const wasProcessed =
          pendingConfirmation.action === 'send'
            ? await sendCredential(pendingConfirmation.credential.id)
            : await resendCredential(pendingConfirmation.credential.id);

        if (wasProcessed) {
          setFeedbackMessage(
            pendingConfirmation.action === 'send'
              ? 'Credencial enviada correctamente.'
              : 'Credencial reenviada correctamente.',
          );
        }
      }

      setIsConfirmationSubmitting(false);
      setPendingConfirmation(null);
    })();
  };

  const handleSendAll = () => {
    void (async () => {
      const sentCount = await sendAllCredentials();

      if (sentCount === 0) {
        setFeedbackMessage(
          'No hay credenciales generadas por enviar en este momento.',
        );
        return;
      }

      setFeedbackMessage(
        sentCount === 1
          ? 'Se envio 1 credencial pendiente.'
          : `Se enviaron ${sentCount} credenciales pendientes.`,
      );
    })();
  };

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (isLoading || document.visibilityState === 'hidden') {
        return;
      }

      const now = Date.now();

      if (now - lastAutoRefreshAtRef.current < AUTO_REFRESH_MIN_INTERVAL_MS) {
        return;
      }

      lastAutoRefreshAtRef.current = now;
      void refresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshWhenVisible();
      }
    };

    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLoading, refresh]);

  useEffect(() => {
    if (!feedbackMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedbackMessage(null);
    }, 2000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [feedbackMessage]);


  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedSearch, statusFilter]);

  useEffect(() => {
    setCurrentPage((currentValue) => Math.min(currentValue, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (!isFilterMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!filterMenuRef.current?.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsFilterMenuOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFilterMenuOpen]);

  const confirmationTitle =
    pendingConfirmation?.action === 'delete'
      ? '¿Quieres eliminar esta credencial?'
      : pendingConfirmation?.action === 'send'
        ? '¿Deseas enviar la credencial?'
        : '¿Deseas reenviar la credencial?';

  const confirmationConfirmLabel =
    pendingConfirmation?.action === 'delete'
      ? 'Sí, eliminar'
      : pendingConfirmation?.action === 'send'
        ? 'Sí, enviar'
        : 'Sí, reenviar';

  const confirmationDescription = pendingConfirmation
    ? pendingConfirmation.action === 'delete'
      ? `Se eliminará la credencial pendiente de ${formatDisplayName(pendingConfirmation.credential.universityName)}.`
      : pendingConfirmation.action === 'send'
        ? `La credencial será enviada al correo ${pendingConfirmation.credential.administratorEmail}`
        : `La credencial será reenviada al correo ${pendingConfirmation.credential.administratorEmail}`
    : '';

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5 overflow-hidden sm:gap-6">
      <Seo
        description={adminContent.credentialsPage.meta.description}
        noIndex
        title={adminContent.credentialsPage.meta.title}
      />
      <AdminPageHeader
        className="items-center gap-3"
        description=""
        headingAlign="center"
        titleClassName="whitespace-nowrap text-center text-[clamp(1.25rem,6vw,1.85rem)] leading-none sm:text-[2.2rem]"
        title={adminContent.credentialsPage.title}
      />
      {feedbackMessage ? (
        <SurfaceCard
          className="border border-emerald-200 bg-emerald-50/90 text-sm font-medium text-emerald-800"
          paddingClassName="p-3.5"
        >
          <p role="status">{feedbackMessage}</p>
        </SurfaceCard>
      ) : null}
      {errorMessage ? (
        <SurfaceCard
          className="border border-rose-200 bg-rose-50/90 text-sm font-medium text-rose-700"
          paddingClassName="p-3.5"
        >
          <p role="alert">{errorMessage}</p>
        </SurfaceCard>
      ) : null}
      <AdminPanelCard
        className="min-h-0 flex-1 bg-transparent"
        panelClassName="bg-white"
      >
        <div className="border-b border-slate-200/80 px-3 py-2.5 sm:px-5 sm:py-4">
          <div className="flex items-center gap-2 sm:justify-between sm:gap-4">
            <h2 className="hidden whitespace-nowrap font-headline font-extrabold leading-none tracking-tight text-ink sm:block sm:text-left sm:text-[1.45rem]">
              Credenciales pendientes
            </h2>
            <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:w-full sm:max-w-[26rem] sm:flex-none sm:justify-end sm:gap-2.5 xl:max-w-[30rem]">
              <label
                className="relative min-w-0 flex-1"
                htmlFor="admin-credential-search"
              >
                <span className="sr-only">Buscar universidad</span>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ghost sm:left-4 sm:h-4 sm:w-4"
                />
                <input
                  className="h-9 w-full rounded-full border border-slate-200/90 bg-white/98 py-0 pl-8 pr-3 text-[0.72rem] text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 placeholder:text-ghost/80 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-11 sm:pl-11 sm:pr-4 sm:text-sm"
                  id="admin-credential-search"
                  placeholder="Buscar universidad..."
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>
              <div className="relative shrink-0" ref={filterMenuRef}>
                <button
                  aria-controls="admin-credential-filter-menu"
                  aria-expanded={isFilterMenuOpen}
                  aria-haspopup="menu"
                  aria-label={
                    statusFilter === 'all'
                      ? 'Filtrar credenciales'
                      : `Filtrar credenciales. Actual: ${
                          credentialFilterOptions.find(
                            (option) => option.value === statusFilter,
                          )?.label
                        }`
                  }
                  className={classNames(
                    'relative inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white/98 text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-11 sm:w-11',
                    statusFilter === 'all'
                      ? 'border-slate-200/90 hover:border-primary/30 hover:bg-white'
                      : 'border-primary/25 bg-primary/[0.08] text-primary hover:bg-primary/[0.12]',
                  )}
                  type="button"
                  onClick={() => setIsFilterMenuOpen((current) => !current)}
                >
                  <SlidersHorizontal
                    aria-hidden="true"
                    className="h-4 w-4 sm:h-[1.05rem] sm:w-[1.05rem]"
                  />
                  {statusFilter !== 'all' ? (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
                  ) : null}
                </button>
                {isFilterMenuOpen ? (
                  <div
                    className="absolute right-0 top-[calc(100%+0.6rem)] z-20 w-[13.5rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-white/95 p-2 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] backdrop-blur sm:w-[14.5rem]"
                    id="admin-credential-filter-menu"
                    role="menu"
                  >
                    <div className="px-2.5 pb-2 pt-1">
                      <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-primary/75">
                        Filtrar credenciales
                      </p>
                    </div>
                    <div className="space-y-1">
                      {credentialFilterOptions.map((option) => {
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
                              setIsFilterMenuOpen(false);
                            }}
                          >
                            <span>{option.label}</span>
                            <span
                              className={classNames(
                                'inline-flex h-5 w-5 items-center justify-center rounded-full',
                                isSelected
                                  ? 'bg-white/18 text-white'
                                  : 'bg-white text-slate-300',
                              )}
                            >
                              <Check
                                aria-hidden="true"
                                className="h-3.5 w-3.5"
                              />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
              <button
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-xl bg-brand-gradient px-2.5 text-[0.7rem] font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 sm:h-auto sm:gap-2 sm:px-3.5 sm:py-2.5 sm:text-[0.82rem]"
                disabled={isLoading || generatedCredentialCount === 0}
                type="button"
                onClick={handleSendAll}
              >
                <Send
                  aria-hidden="true"
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                />
                <span className="whitespace-nowrap">
                  {adminContent.credentialsPage.actionLabels.sendAll}
                </span>
              </button>
            </div>
          </div>
        </div>
        {filteredCredentialRows.length > 0 ? (
          <>
            <div
              ref={tableViewportRef}
              className="min-h-0 flex-1 overflow-hidden"
            >
              <div className="w-full">
                <table className="w-full table-fixed">
                  <thead className="bg-slate-100 text-left">
                    <tr className="text-[0.52rem] font-bold uppercase tracking-[0.035em] text-ink-muted sm:text-[0.62rem] sm:tracking-[0.16em] lg:text-[0.68rem]">
                      <th className="w-[34%] px-2 py-2 sm:px-4 sm:py-2.5 lg:w-[23%]">
                        Universidad
                      </th>
                      <th className="w-[27%] px-1.5 py-2 sm:px-3 sm:py-2.5 lg:w-[20%]">
                        Administrador
                      </th>
                      <th className="hidden px-3 py-2.5 lg:table-cell lg:w-[25%]">
                        Correo electrónico
                      </th>
                      <th className="w-[15%] px-0.5 py-2 text-center sm:px-3 sm:py-2.5 lg:w-[14%]">
                        Estado
                      </th>
                      <th className="w-[24%] px-0.5 py-2 text-center sm:px-4 sm:py-2.5 lg:w-[18%]">
                        <span className="sm:hidden">Acción</span>
                        <span className="hidden sm:inline">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    ref={tableBodyRef}
                    className="divide-y divide-slate-200/80"
                  >
                    {paginatedCredentialRows.map((credential, index) => {
                      const isGenerated =
                        credential.deliveryStatus === 'generated';
                      const isEditing = editingCredentialId === credential.id;
                      const isLast =
                        index === paginatedCredentialRows.length - 1;
                      const relatedUniversity = universitiesById.get(
                        credential.universityId,
                      );

                      return (
                        <tr key={credential.id} className="align-middle">
                          <td
                            className={classNames(
                              'overflow-hidden px-2 pt-2 sm:px-4 sm:pt-2.75',
                              isLast ? 'pb-2.5 sm:pb-3' : 'pb-2 sm:pb-2.75',
                            )}
                          >
                            <div className="min-w-0 space-y-1">
                              <p
                                className="break-words text-[0.66rem] font-semibold leading-tight text-ink sm:text-[0.82rem] lg:truncate lg:break-normal lg:text-[0.86rem]"
                                title={formatDisplayName(
                                  credential.universityName,
                                )}
                              >
                                {formatDisplayName(credential.universityName)}
                              </p>
                              <p className="text-[0.55rem] leading-tight text-ink-muted sm:text-[0.72rem] lg:text-[0.76rem]">
                                <span className="lg:hidden">
                                  {formatLastSentAt(credential.lastSentAt)}
                                </span>
                                <span className="hidden lg:inline">
                                  Último movimiento:{' '}
                                  {formatLastSentAt(credential.lastSentAt)}
                                </span>
                              </p>
                            </div>
                          </td>
                          <td
                            className={classNames(
                              'overflow-hidden px-1.5 pt-2 sm:px-3 sm:pt-2.75',
                              isLast ? 'pb-2.5 sm:pb-3' : 'pb-2 sm:pb-2.75',
                            )}
                          >
                            <div className="min-w-0 space-y-1">
                              <p
                                className="break-words text-[0.64rem] font-semibold leading-tight text-ink sm:text-[0.82rem] lg:truncate lg:break-normal lg:text-[0.86rem]"
                                title={formatDisplayName(
                                  credential.administratorName,
                                )}
                              >
                                <span className="lg:hidden">
                                  {buildCompactAdministratorLabel(
                                    credential,
                                    relatedUniversity,
                                  )}
                                </span>
                                <span className="hidden lg:inline">
                                  {formatDisplayName(
                                    credential.administratorName,
                                  )}
                                </span>
                              </p>
                              {isEditing ? (
                                <div className="space-y-1 lg:hidden">
                                  <label
                                    className="sr-only"
                                    htmlFor={`credential-email-mobile-${credential.id}`}
                                  >
                                    Correo electrónico móvil de{' '}
                                    {formatDisplayName(
                                      credential.administratorName,
                                    )}
                                  </label>
                                  <input
                                    className="h-7 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-[0.58rem] text-ink transition duration-300 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/10 sm:h-8 sm:text-xs"
                                    id={`credential-email-mobile-${credential.id}`}
                                    type="email"
                                    value={emailDraft}
                                    onChange={(event) => {
                                      setEmailDraft(event.target.value);
                                      setEmailError(null);
                                    }}
                                  />
                                  {emailError ? (
                                    <p className="text-[0.56rem] font-medium leading-tight text-rose-700 sm:text-xs">
                                      {emailError}
                                    </p>
                                  ) : null}
                                </div>
                              ) : (
                                <p
                                  className="block max-w-full break-all text-[0.54rem] leading-tight text-ink-muted sm:text-[0.72rem] lg:hidden"
                                  title={credential.administratorEmail}
                                >
                                  {credential.administratorEmail}
                                </p>
                              )}
                            </div>
                          </td>
                          <td
                            className={classNames(
                              'hidden px-3 pt-2.75 lg:table-cell',
                              isLast ? 'pb-3' : 'pb-2.75',
                            )}
                          >
                            {isEditing ? (
                              <div className="max-w-full space-y-2">
                                <label
                                  className="sr-only"
                                  htmlFor={`credential-email-${credential.id}`}
                                >
                                  Correo electrónico de{' '}
                                  {formatDisplayName(
                                    credential.administratorName,
                                  )}
                                </label>
                                <div className="relative">
                                  <Mail
                                    aria-hidden="true"
                                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost"
                                  />
                                  <input
                                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-[0.82rem] text-ink placeholder:text-ghost/80 transition duration-300 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                                    id={`credential-email-${credential.id}`}
                                    type="email"
                                    value={emailDraft}
                                    onChange={(event) => {
                                      setEmailDraft(event.target.value);
                                      setEmailError(null);
                                    }}
                                  />
                                </div>
                                {emailError ? (
                                  <p className="text-xs font-medium text-rose-700">
                                    {emailError}
                                  </p>
                                ) : null}
                              </div>
                            ) : (
                              <div className="flex max-w-full min-w-0 items-start gap-1.5 text-[0.76rem] leading-tight text-ink-muted">
                                <Mail
                                  aria-hidden="true"
                                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                                />
                                <span
                                  className="block min-w-0 break-all lg:truncate lg:break-normal"
                                  title={credential.administratorEmail}
                                >
                                  {credential.administratorEmail}
                                </span>
                              </div>
                            )}
                          </td>
                          <td
                            className={classNames(
                              'overflow-hidden px-1 pt-2 text-center sm:px-3 sm:pt-2.75',
                              isLast ? 'pb-2.5 sm:pb-3' : 'pb-2 sm:pb-2.75',
                            )}
                          >
                            <div className="flex h-7 items-center justify-center sm:h-auto">
                              <AdminStatusBadge
                                entity="credential"
                                size="micro-mobile"
                                status={credential.deliveryStatus}
                              />
                            </div>
                          </td>
                          <td
                            className={classNames(
                              'overflow-hidden px-1 pt-2 text-center sm:px-4 sm:pt-2.75',
                              isLast ? 'pb-2.5 sm:pb-3' : 'pb-2 sm:pb-2.75',
                            )}
                          >
                            <div
                              className={classNames(
                                'flex items-center justify-center',
                                isEditing
                                  ? 'h-auto flex-col gap-1 sm:items-stretch sm:gap-1.5'
                                  : 'h-7 flex-nowrap gap-0.5 sm:h-auto sm:gap-2',
                              )}
                            >
                              {isEditing ? (
                                <>
                                  <button
                                    aria-label={
                                      adminContent.credentialsPage.actionLabels
                                        .saveEmail
                                    }
                                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition duration-200 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-auto sm:w-full sm:min-w-[7.2rem] sm:gap-1.5 sm:px-2.5 sm:py-1.75 sm:text-[0.68rem] sm:font-semibold"
                                    disabled={isLoading}
                                    type="button"
                                    onClick={() =>
                                      handleSaveEmail(
                                        credential.id,
                                        credential.administratorName,
                                      )
                                    }
                                  >
                                    <Check
                                      aria-hidden="true"
                                      className="h-3 w-3 sm:h-3.5 sm:w-3.5"
                                    />
                                    <span className="hidden sm:inline">
                                      {
                                        adminContent.credentialsPage
                                          .actionLabels.saveEmail
                                      }
                                    </span>
                                  </button>
                                  <button
                                    aria-label="Cancelar"
                                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-ink-muted transition duration-200 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 sm:h-auto sm:w-full sm:min-w-[7.2rem] sm:gap-1.5 sm:px-2.5 sm:py-1.75 sm:text-[0.68rem] sm:font-semibold"
                                    disabled={isLoading}
                                    type="button"
                                    onClick={handleCancelEmailEdit}
                                  >
                                    <X
                                      aria-hidden="true"
                                      className="h-3 w-3 sm:h-3.5 sm:w-3.5"
                                    />
                                    <span className="hidden sm:inline">
                                      Cancelar
                                    </span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    aria-label={
                                      isGenerated
                                        ? adminContent.credentialsPage
                                            .actionLabels.send
                                        : adminContent.credentialsPage
                                            .actionLabels.resend
                                    }
                                    title={
                                      isGenerated
                                        ? adminContent.credentialsPage
                                            .actionLabels.send
                                        : adminContent.credentialsPage
                                            .actionLabels.resend
                                    }
                                    className={classNames(
                                      'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-8 sm:w-8',
                                      isGenerated
                                        ? 'bg-primary/10 text-primary hover:bg-primary/15'
                                        : 'bg-sky-50 text-sky-700 hover:bg-sky-100',
                                    )}
                                    disabled={isLoading}
                                    type="button"
                                    onClick={() => {
                                      setPendingConfirmation({
                                        action: isGenerated ? 'send' : 'resend',
                                        credential,
                                      });
                                    }}
                                  >
                                    {isGenerated ? (
                                      <Send
                                        aria-hidden="true"
                                        className="h-3 w-3 sm:h-3.5 sm:w-3.5"
                                      />
                                    ) : (
                                      <RotateCcw
                                        aria-hidden="true"
                                        className="h-3 w-3 sm:h-3.5 sm:w-3.5"
                                      />
                                    )}
                                  </button>
                                  <button
                                    aria-label={
                                      adminContent.credentialsPage.actionLabels
                                        .editEmail
                                    }
                                    title={
                                      adminContent.credentialsPage.actionLabels
                                        .editEmail
                                    }
                                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-ink-muted transition duration-200 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 sm:h-8 sm:w-8"
                                    disabled={isLoading}
                                    type="button"
                                    onClick={() =>
                                      handleStartEmailEdit(credential)
                                    }
                                  >
                                    <PencilLine
                                      aria-hidden="true"
                                      className="h-3 w-3 sm:h-3.5 sm:w-3.5"
                                    />
                                  </button>
                                  <button
                                    aria-label={
                                      adminContent.credentialsPage.actionLabels
                                        .delete
                                    }
                                    title={
                                      adminContent.credentialsPage.actionLabels
                                        .delete
                                    }
                                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-700 transition duration-200 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200/70 sm:h-8 sm:w-8"
                                    disabled={isLoading}
                                    type="button"
                                    onClick={() => {
                                      setPendingConfirmation({
                                        action: 'delete',
                                        credential,
                                      });
                                    }}
                                  >
                                    <Trash2
                                      aria-hidden="true"
                                      className="h-3 w-3 sm:h-3.5 sm:w-3.5"
                                    />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200/80 bg-white px-3 py-2.5 text-[0.72rem] font-semibold text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:text-[0.8rem]">
              <p className="text-center sm:text-left">
                Mostrando {pageStartLabel}-{pageEndLabel} de{' '}
                {filteredCredentialRows.length} · Página {clampedCurrentPage} de{' '}
                {totalPages}
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  aria-label="Pagina anterior"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-ink transition duration-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={clampedCurrentPage === 1}
                  type="button"
                  onClick={() =>
                    setCurrentPage((currentValue) =>
                      Math.max(1, currentValue - 1),
                    )
                  }
                >
                  <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                </button>
                <span className="min-w-[4.25rem] text-center text-[0.72rem] text-ink">
                  {clampedCurrentPage}/{totalPages}
                </span>
                <button
                  aria-label="Pagina siguiente"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-ink transition duration-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={clampedCurrentPage === totalPages}
                  type="button"
                  onClick={() =>
                    setCurrentPage((currentValue) =>
                      Math.min(totalPages, currentValue + 1),
                    )
                  }
                >
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center px-4 py-8 text-center sm:px-5">
            <p className="text-sm font-medium text-ink-muted">
              {emptyStateMessage}
            </p>
          </div>
        )}
      </AdminPanelCard>
      <AdminConfirmationDialog
        cancelLabel="No, cancelar"
        confirmLabel={confirmationConfirmLabel}
        description={confirmationDescription}
        isOpen={Boolean(pendingConfirmation)}
        isSubmitting={isConfirmationSubmitting}
        title={confirmationTitle}
        tone={pendingConfirmation?.action === 'delete' ? 'danger' : 'primary'}
        onCancel={handleCloseConfirmation}
        onConfirm={handleConfirmPendingAction}
      />
    </div>
  );
}
