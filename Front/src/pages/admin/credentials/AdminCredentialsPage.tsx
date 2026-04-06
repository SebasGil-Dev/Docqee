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

import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { adminContent } from '@/content/adminContent';
import type { PendingCredential } from '@/content/types';
import { classNames } from '@/lib/classNames';
import { useAdminModuleStore } from '@/lib/adminModuleStore';

type CredentialRow = PendingCredential & {
  administratorEmail: string;
  administratorName: string;
  universityStatus: 'active' | 'inactive' | 'pending';
  universityName: string;
};

type CredentialFilterValue = 'all' | 'generated' | 'pending' | 'sent';

const credentialFilterOptions: Array<{
  label: string;
  value: CredentialFilterValue;
}> = [
  { label: 'Todos', value: 'all' },
  { label: 'Generada', value: 'generated' },
  { label: 'Pendiente', value: 'pending' },
  { label: 'Enviada', value: 'sent' },
];

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
    sendCredential,
    universities,
  } = useAdminModuleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CredentialFilterValue>('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const credentialRows = useMemo<CredentialRow[]>(
    () =>
      credentials
        .map((credential) => {
          const university = universities.find((item) => item.id === credential.universityId);

          if (!university) {
            return null;
          }

          return {
            ...credential,
            administratorEmail: university.adminEmail,
            administratorName: `${university.adminFirstName} ${university.adminLastName}`,
            universityName: university.name,
            universityStatus: university.status,
          };
        })
        .filter((row): row is CredentialRow => row !== null),
    [credentials, universities],
  );
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
  const shouldEnableTableScroll = filteredCredentialRows.length > 2;
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

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
      <Seo
        description={adminContent.credentialsPage.meta.description}
        noIndex
        title={adminContent.credentialsPage.meta.title}
      />
      <AdminPageHeader
        description=""
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
            <div className="flex min-w-0 items-center gap-2 sm:w-full sm:max-w-[23rem] sm:justify-end sm:gap-2.5">
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
          <div
            className={classNames(
              'admin-scrollbar min-h-0 overflow-x-auto',
              shouldEnableTableScroll && 'h-[15.25rem] overflow-y-auto sm:h-[16rem]',
            )}
          >
            <div className={classNames(shouldEnableTableScroll && 'pb-5 sm:pb-6')}>
              <table className="min-w-full">
                <thead className="sticky top-0 z-10 bg-surface text-left">
                  <tr className="text-xs font-bold uppercase tracking-[0.22em] text-ink-muted">
                    <th className="px-4 py-3.5 sm:px-5">Universidad</th>
                    <th className="px-4 py-3.5">Administrador</th>
                    <th className="px-4 py-3.5">Correo electronico</th>
                    <th className="px-4 py-3.5">Estado</th>
                    <th className="px-4 py-3.5 text-center sm:px-5">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {filteredCredentialRows.map((credential, index) => {
                    const isGenerated = credential.deliveryStatus === 'generated';
                    const isEditing = editingCredentialId === credential.id;
                    const isLast = index === filteredCredentialRows.length - 1;

                    return (
                      <tr key={credential.id} className="align-top">
                        <td
                          className={classNames(
                            'px-4 pt-3.5 sm:px-5',
                            isLast ? 'pb-4' : 'pb-3.5',
                          )}
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-ink">
                              {credential.universityName}
                            </p>
                            <p className="text-xs text-ink-muted sm:text-[0.82rem]">
                              Ultimo movimiento: {formatLastSentAt(credential.lastSentAt)}
                            </p>
                          </div>
                        </td>
                        <td
                          className={classNames(
                            'px-4 pt-3.5',
                            isLast ? 'pb-4' : 'pb-3.5',
                          )}
                        >
                          <p className="text-sm font-medium text-ink">{credential.administratorName}</p>
                        </td>
                        <td
                          className={classNames(
                            'px-4 pt-3.5',
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
                            <div className="inline-flex items-center gap-2 text-sm text-ink-muted">
                              <Mail aria-hidden="true" className="h-4 w-4 shrink-0" />
                              <span>{credential.administratorEmail}</span>
                            </div>
                          )}
                        </td>
                        <td
                          className={classNames(
                            'px-4 pt-3.5',
                            isLast ? 'pb-4' : 'pb-3.5',
                          )}
                        >
                          <AdminStatusBadge entity="credential" status={credential.deliveryStatus} />
                        </td>
                        <td
                          className={classNames(
                            'px-4 pt-3.5 sm:px-5',
                            isLast ? 'pb-4' : 'pb-3.5',
                          )}
                        >
                          <div className="flex flex-nowrap items-center justify-center gap-1.5 sm:gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  aria-label={adminContent.credentialsPage.actionLabels.saveEmail}
                                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition duration-200 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-auto sm:w-auto sm:min-w-[8.25rem] sm:gap-2 sm:px-3 sm:py-2 sm:text-xs sm:font-semibold"
                                  disabled={isLoading}
                                  type="button"
                                  onClick={() =>
                                    handleSaveEmail(credential.id, credential.administratorName)
                                  }
                                >
                                  <Check aria-hidden="true" className="h-4 w-4" />
                                  <span className="hidden sm:inline">
                                    {adminContent.credentialsPage.actionLabels.saveEmail}
                                  </span>
                                </button>
                                <button
                                  aria-label="Cancelar"
                                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-ink-muted transition duration-200 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 sm:h-auto sm:w-auto sm:min-w-[8.25rem] sm:gap-2 sm:px-3 sm:py-2 sm:text-xs sm:font-semibold"
                                  disabled={isLoading}
                                  type="button"
                                  onClick={handleCancelEmailEdit}
                                >
                                  <X aria-hidden="true" className="h-4 w-4" />
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
                                  className={classNames(
                                    'inline-flex h-9 shrink-0 items-center justify-center rounded-full transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-auto sm:min-w-[6.9rem] sm:gap-1.5 sm:px-2.75 sm:py-2 sm:text-[0.7rem] sm:font-semibold lg:min-w-[7.5rem] lg:gap-2 lg:px-3',
                                    isGenerated
                                      ? 'w-9 bg-primary/10 text-primary hover:bg-primary/15 sm:w-auto'
                                      : 'w-9 bg-sky-50 text-sky-700 hover:bg-sky-100 sm:w-auto',
                                  )}
                                  disabled={isLoading}
                                  type="button"
                                  onClick={() => {
                                    void (async () => {
                                      const temporaryPassword = isGenerated
                                        ? await sendCredential(credential.id)
                                        : await resendCredential(credential.id);

                                      if (!temporaryPassword) {
                                        return;
                                      }

                                      setFeedbackMessage(
                                        isGenerated
                                          ? `Credencial enviada. Contrasena temporal: ${temporaryPassword}`
                                          : `Credencial reenviada. Contrasena temporal: ${temporaryPassword}`,
                                      );
                                    })();
                                  }}
                                >
                                  {isGenerated ? (
                                    <Send aria-hidden="true" className="h-4 w-4" />
                                  ) : (
                                    <RotateCcw aria-hidden="true" className="h-4 w-4" />
                                  )}
                                  <span className="hidden sm:inline whitespace-nowrap">
                                    {isGenerated
                                      ? adminContent.credentialsPage.actionLabels.send
                                      : adminContent.credentialsPage.actionLabels.resend}
                                  </span>
                                </button>
                                <button
                                  aria-label={adminContent.credentialsPage.actionLabels.editEmail}
                                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-ink-muted transition duration-200 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 sm:h-auto sm:w-auto sm:min-w-[8.2rem] sm:gap-1.5 sm:px-2.75 sm:py-2 sm:text-[0.7rem] sm:font-semibold lg:min-w-[8.9rem] lg:gap-2 lg:px-3"
                                  disabled={isLoading}
                                  type="button"
                                  onClick={() => handleStartEmailEdit(credential)}
                                >
                                  <PencilLine aria-hidden="true" className="h-4 w-4" />
                                  <span className="hidden sm:inline whitespace-nowrap">
                                    {adminContent.credentialsPage.actionLabels.editEmail}
                                  </span>
                                </button>
                                <button
                                  aria-label={adminContent.credentialsPage.actionLabels.delete}
                                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-700 transition duration-200 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200/70 sm:h-auto sm:w-auto sm:min-w-[6.7rem] sm:gap-1.5 sm:px-2.75 sm:py-2 sm:text-[0.7rem] sm:font-semibold lg:min-w-[7.3rem] lg:gap-2 lg:px-3"
                                  disabled={isLoading}
                                  type="button"
                                  onClick={() => {
                                    void (async () => {
                                      const deleted = await deleteCredential(credential.id);

                                      if (!deleted) {
                                        return;
                                      }

                                      if (editingCredentialId === credential.id) {
                                        handleCancelEmailEdit();
                                      }

                                      setFeedbackMessage(
                                        'La credencial pendiente se elimino correctamente.',
                                      );
                                    })();
                                  }}
                                >
                                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                                  <span className="hidden sm:inline whitespace-nowrap">
                                    {adminContent.credentialsPage.actionLabels.delete}
                                  </span>
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
              {shouldEnableTableScroll ? <div aria-hidden="true" className="h-2 sm:h-2.5" /> : null}
            </div>
          </div>
        ) : (
          <div className="px-4 py-8 text-center sm:px-5">
            <p className="text-sm font-medium text-ink-muted">{emptyStateMessage}</p>
          </div>
        )}
      </AdminPanelCard>
    </div>
  );
}
