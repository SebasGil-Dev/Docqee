import {
  Check,
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
import type { PendingCredential } from '@/content/types';
import { classNames } from '@/lib/classNames';
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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formatLastSentAt(value: string | null) {
  if (!value) {
    return 'Sin envio previo';
  }

  return new Date(value).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
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
    sendCredential,
  } = useAdminModuleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CredentialFilterValue>('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingCredentialConfirmation | null>(null);
  const [isConfirmationSubmitting, setIsConfirmationSubmitting] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const lastAutoRefreshAtRef = useRef(0);
  const credentialRows = useMemo<CredentialRow[]>(() => credentials, [credentials]);
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
    const normalizedEmail = emailDraft.trim().toLowerCase();

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
      setFeedbackMessage(`El correo de ${administratorName} se actualizo correctamente.`);
    })();
  };

  const handleConfirmPendingAction = () => {
    if (!pendingConfirmation) {
      return;
    }

    setIsConfirmationSubmitting(true);

    void (async () => {
      if (pendingConfirmation.action === 'delete') {
        const deleted = await deleteCredential(pendingConfirmation.credential.id);

        if (deleted) {
          if (editingCredentialId === pendingConfirmation.credential.id) {
            handleCancelEmailEdit();
          }

          setFeedbackMessage('La credencial pendiente se elimino correctamente.');
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
      ? 'Quieres eliminar esta credencial?'
      : pendingConfirmation?.action === 'send'
        ? 'Quieres enviar la credencial?'
        : 'Quieres reenviar la credencial?';

  const confirmationConfirmLabel =
    pendingConfirmation?.action === 'delete'
      ? 'Si, eliminar'
      : pendingConfirmation?.action === 'send'
        ? 'Si, enviar'
        : 'Si, reenviar';

  const confirmationDescription = pendingConfirmation
    ? pendingConfirmation.action === 'delete'
      ? `Se eliminara la credencial pendiente de ${pendingConfirmation.credential.universityName}.`
      : pendingConfirmation.action === 'send'
        ? `Se enviara la credencial al correo ${pendingConfirmation.credential.administratorEmail}.`
        : `Se reenviara la credencial al correo ${pendingConfirmation.credential.administratorEmail}.`
    : '';

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
      <Seo
        description={adminContent.credentialsPage.meta.description}
        noIndex
        title={adminContent.credentialsPage.meta.title}
      />
      <AdminPageHeader
        className="items-center gap-3"
        description=""
        titleClassName="mx-auto whitespace-nowrap text-center text-[clamp(1.25rem,6vw,1.85rem)] leading-none sm:mx-0 sm:text-left sm:text-[2.2rem]"
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
      <AdminPanelCard className="flex-1" panelClassName="bg-white">
        <div className="border-b border-slate-200/80 px-4 py-4 sm:px-5 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h2 className="whitespace-nowrap text-center font-headline text-[1rem] font-extrabold leading-none tracking-tight text-ink sm:text-left sm:text-[1.45rem]">
              Credenciales pendientes
            </h2>
            <div className="flex min-w-0 items-center gap-2 sm:w-full sm:max-w-[26rem] sm:justify-end sm:gap-2.5 xl:max-w-[30rem]">
              <label className="relative min-w-0 flex-1" htmlFor="admin-credential-search">
                <span className="sr-only">Buscar universidad</span>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ghost sm:left-4 sm:h-4 sm:w-4"
                />
                <input
                  className="h-10 w-full rounded-full border border-slate-200/90 bg-white/98 py-0 pl-8 pr-4 text-[0.77rem] text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 placeholder:text-ghost/80 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-11 sm:pl-11 sm:text-sm"
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
                          credentialFilterOptions.find((option) => option.value === statusFilter)?.label
                        }`
                  }
                  className={classNames(
                    'relative inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white/98 text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-11 sm:w-11',
                    statusFilter === 'all'
                      ? 'border-slate-200/90 hover:border-primary/30 hover:bg-white'
                      : 'border-primary/25 bg-primary/[0.08] text-primary hover:bg-primary/[0.12]',
                  )}
                  type="button"
                  onClick={() => setIsFilterMenuOpen((current) => !current)}
                >
                  <SlidersHorizontal aria-hidden="true" className="h-4 w-4 sm:h-[1.05rem] sm:w-[1.05rem]" />
                  {statusFilter !== 'all' ? (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
                  ) : null}
                </button>
                {isFilterMenuOpen ? (
                  <div
                    className="absolute right-0 top-[calc(100%+0.6rem)] z-20 w-[13.5rem] overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-white/95 p-2 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] backdrop-blur sm:w-[14.5rem]"
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
        </div>
        {filteredCredentialRows.length > 0 ? (
          <div className="admin-scrollbar min-h-0 flex-1 overflow-x-auto overflow-y-auto lg:overflow-x-visible">
            <div className="min-w-full">
              <table className="min-w-[63rem] w-full lg:min-w-0 lg:table-fixed">
                <thead className="sticky top-0 z-10 bg-surface text-left">
                  <tr className="text-xs font-bold uppercase tracking-[0.22em] text-ink-muted">
                    <th className="px-4 py-3.5 lg:w-[26%] sm:px-5">Universidad</th>
                    <th className="px-4 py-3.5 lg:w-[16%] lg:pr-7">Administrador</th>
                    <th className="px-4 py-3.5 lg:w-[26%] lg:pl-7">Correo electronico</th>
                    <th className="px-4 py-3.5 text-center lg:w-[10%] lg:pl-6">Estado</th>
                    <th className="px-4 py-3.5 text-center lg:w-[22%] lg:pl-5 sm:px-5">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {filteredCredentialRows.map((credential, index) => {
                    const isGenerated = credential.deliveryStatus === 'generated';
                    const isEditing = editingCredentialId === credential.id;
                    const isLast = index === filteredCredentialRows.length - 1;

                    return (
                      <tr key={credential.id} className="align-middle">
                        <td
                          className={classNames(
                            'px-4 pt-3.5 sm:px-5',
                            isLast ? 'pb-4' : 'pb-3.5',
                          )}
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-ink lg:text-[0.92rem]">
                              {credential.universityName}
                            </p>
                            <p className="text-xs text-ink-muted sm:text-[0.82rem]">
                              Ultimo movimiento: {formatLastSentAt(credential.lastSentAt)}
                            </p>
                          </div>
                        </td>
                        <td
                          className={classNames(
                            'px-4 pt-3.5 lg:pr-7',
                            isLast ? 'pb-4' : 'pb-3.5',
                          )}
                        >
                          <p className="text-sm font-medium text-ink lg:text-[0.92rem]">
                            {credential.administratorName}
                          </p>
                        </td>
                        <td
                          className={classNames(
                            'px-4 pt-3.5 lg:pl-7',
                            isLast ? 'pb-4' : 'pb-3.5',
                          )}
                        >
                          {isEditing ? (
                            <div className="max-w-[20rem] space-y-2">
                              <label className="sr-only" htmlFor={`credential-email-${credential.id}`}>
                                Correo electronico de {credential.administratorName}
                              </label>
                              <div className="relative">
                                <Mail
                                  aria-hidden="true"
                                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost"
                                />
                                <input
                                  className="w-full rounded-xl border border-slate-200 bg-white py-2.25 pl-10 pr-4 text-sm text-ink placeholder:text-ghost/80 transition duration-300 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
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
                                <p className="text-xs font-medium text-rose-700">{emailError}</p>
                              ) : null}
                            </div>
                          ) : (
                            <div className="inline-flex max-w-full items-center gap-2 text-sm text-ink-muted">
                              <Mail aria-hidden="true" className="h-4 w-4 shrink-0" />
                              <span
                                className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                                title={credential.administratorEmail}
                              >
                                {credential.administratorEmail}
                              </span>
                            </div>
                          )}
                        </td>
                        <td
                          className={classNames(
                            'px-4 pt-3.5 text-center lg:pl-6',
                            isLast ? 'pb-4' : 'pb-3.5',
                          )}
                        >
                          <div className="flex justify-center">
                            <AdminStatusBadge entity="credential" status={credential.deliveryStatus} />
                          </div>
                        </td>
                        <td
                          className={classNames(
                            'px-4 pt-3.5 lg:pl-5 sm:px-5',
                            isLast ? 'pb-4' : 'pb-3.5',
                          )}
                        >
                          <div className="flex flex-nowrap items-center justify-center gap-1.5 sm:gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  aria-label={adminContent.credentialsPage.actionLabels.saveEmail}
                                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition duration-200 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-auto sm:w-auto sm:min-w-[7.2rem] sm:gap-1.5 sm:px-2.5 sm:py-1.75 sm:text-[0.68rem] sm:font-semibold"
                                  disabled={isLoading}
                                  type="button"
                                  onClick={() =>
                                    handleSaveEmail(credential.id, credential.administratorName)
                                  }
                                >
                                  <Check aria-hidden="true" className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">
                                    {adminContent.credentialsPage.actionLabels.saveEmail}
                                  </span>
                                </button>
                                <button
                                  aria-label="Cancelar"
                                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-ink-muted transition duration-200 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 sm:h-auto sm:w-auto sm:min-w-[7.2rem] sm:gap-1.5 sm:px-2.5 sm:py-1.75 sm:text-[0.68rem] sm:font-semibold"
                                  disabled={isLoading}
                                  type="button"
                                  onClick={handleCancelEmailEdit}
                                >
                                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">Cancelar</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  aria-label={
                                    isGenerated
                                      ? adminContent.credentialsPage.actionLabels.send
                                      : adminContent.credentialsPage.actionLabels.resend
                                  }
                                  title={
                                    isGenerated
                                      ? adminContent.credentialsPage.actionLabels.send
                                      : adminContent.credentialsPage.actionLabels.resend
                                  }
                                  className={classNames(
                                    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
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
                                    <Send aria-hidden="true" className="h-3.5 w-3.5" />
                                  ) : (
                                    <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                                  )}
                                </button>
                                <button
                                  aria-label={adminContent.credentialsPage.actionLabels.editEmail}
                                  title={adminContent.credentialsPage.actionLabels.editEmail}
                                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-ink-muted transition duration-200 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
                                  disabled={isLoading}
                                  type="button"
                                  onClick={() => handleStartEmailEdit(credential)}
                                >
                                  <PencilLine aria-hidden="true" className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  aria-label={adminContent.credentialsPage.actionLabels.delete}
                                  title={adminContent.credentialsPage.actionLabels.delete}
                                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-700 transition duration-200 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200/70"
                                  disabled={isLoading}
                                  type="button"
                                  onClick={() => {
                                    setPendingConfirmation({
                                      action: 'delete',
                                      credential,
                                    });
                                  }}
                                >
                                  <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
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
        ) : (
          <div className="flex flex-1 items-center justify-center px-4 py-8 text-center sm:px-5">
            <p className="text-sm font-medium text-ink-muted">{emptyStateMessage}</p>
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
