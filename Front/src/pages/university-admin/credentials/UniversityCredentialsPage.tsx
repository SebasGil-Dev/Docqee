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
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { universityAdminContent } from '@/content/universityAdminContent';
import { classNames } from '@/lib/classNames';
import { formatDisplayName } from '@/lib/formatDisplayName';
import { useUniversityAdminStudentRecordsStore } from '@/lib/universityAdminStudentRecordsStore';

type StudentRecordsStore = ReturnType<
  typeof useUniversityAdminStudentRecordsStore
>;
type CredentialRow = ReturnType<typeof buildCredentialRows>[number];
type UniversityCredentialFilterValue = 'all' | 'generated' | 'sent';

type UniversityCredentialConfirmation =
  | {
      action: 'delete';
      credential: CredentialRow;
    }
  | {
      action: 'resend' | 'send';
      credential: CredentialRow;
    };

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

function buildCredentialRows(
  credentials: StudentRecordsStore['credentials'],
  students: StudentRecordsStore['students'],
) {
  return credentials
    .map((credential) => {
      const student = students.find((item) => item.id === credential.studentId);

      if (!student) {
        return null;
      }

      return {
        ...credential,
        studentDocument: `${student.documentTypeCode} ${student.documentNumber}`,
        studentEmail: student.email,
        studentName: formatDisplayName(
          `${student.firstName} ${student.lastName}`,
        ),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

const credentialFilterOptions: Array<{
  label: string;
  value: UniversityCredentialFilterValue;
}> = [
  { label: 'Todas', value: 'all' },
  { label: 'Generada', value: 'generated' },
  { label: 'Enviada', value: 'sent' },
];

const AUTO_REFRESH_MIN_INTERVAL_MS = 5000;

export function UniversityCredentialsPage() {
  const {
    credentials,
    deleteStudentCredential,
    editStudentCredentialEmail,
    errorMessage,
    isLoading,
    resendStudentCredential,
    refresh,
    sendAllStudentCredentials,
    sendStudentCredential,
    students,
  } = useUniversityAdminStudentRecordsStore();
  const credentialRows = useMemo(
    () => buildCredentialRows(credentials, students),
    [credentials, students],
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<UniversityCredentialFilterValue>('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(
    null,
  );
  const [emailDraft, setEmailDraft] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<UniversityCredentialConfirmation | null>(null);
  const [isConfirmationSubmitting, setIsConfirmationSubmitting] =
    useState(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const lastAutoRefreshAtRef = useRef(0);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredCredentialRows = credentialRows.filter((credential) => {
    const matchesSearch =
      credential.studentName.toLowerCase().includes(normalizedSearch) ||
      credential.studentEmail.toLowerCase().includes(normalizedSearch) ||
      credential.studentDocument.toLowerCase().includes(normalizedSearch);

    if (!matchesSearch) {
      return false;
    }

    if (statusFilter === 'all') {
      return true;
    }

    return credential.deliveryStatus === statusFilter;
  });
  const emptyStateMessage =
    normalizedSearch || statusFilter !== 'all'
      ? 'No encontramos credenciales con los filtros seleccionados.'
      : universityAdminContent.credentialsPage.emptyState;
  const handleStartEmailEdit = (row: CredentialRow) => {
    setEditingCredentialId(row.id);
    setEmailDraft(row.studentEmail);
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

  const handleSaveEmail = (credentialId: string, studentName: string) => {
    const normalizedEmail = emailDraft.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setEmailError(universityAdminContent.credentialsPage.emailInvalidMessage);
      return;
    }

    void (async () => {
      const updated = await editStudentCredentialEmail(
        credentialId,
        normalizedEmail,
      );

      if (!updated) {
        setEmailError('No pudimos actualizar el correo en este momento.');
        return;
      }

      setEditingCredentialId(null);
      setEmailDraft('');
      setEmailError(null);
      setFeedbackMessage(
        `El correo de ${studentName} se actualizo correctamente.`,
      );
    })();
  };

  const handleSendAll = () => {
    void (async () => {
      const sentCount = await sendAllStudentCredentials();

      setFeedbackMessage(
        sentCount > 0
          ? `Se enviaron ${sentCount} credenciales pendientes.`
          : 'No hay credenciales generated por enviar en este momento.',
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
        const deleted = await deleteStudentCredential(
          pendingConfirmation.credential.id,
        );

        if (deleted) {
          if (editingCredentialId === pendingConfirmation.credential.id) {
            handleCancelEmailEdit();
          }

          setFeedbackMessage(
            `La credencial de ${pendingConfirmation.credential.studentName} se eliminó correctamente.`,
          );
        }
      } else {
        const updated =
          pendingConfirmation.action === 'send'
            ? await sendStudentCredential(pendingConfirmation.credential.id)
            : await resendStudentCredential(pendingConfirmation.credential.id);

        if (updated) {
          setFeedbackMessage(
            pendingConfirmation.action === 'send'
              ? `La credencial de ${pendingConfirmation.credential.studentName} quedó enviada correctamente.`
              : `La credencial de ${pendingConfirmation.credential.studentName} se reenvió correctamente.`,
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
      ? `Se eliminará la credencial de ${pendingConfirmation.credential.studentName}.`
      : pendingConfirmation.action === 'send'
        ? `La credencial será enviada al correo ${pendingConfirmation.credential.studentEmail}`
        : `La credencial será reenviada al correo ${pendingConfirmation.credential.studentEmail}`
    : '';

  return (
    <div className="flex h-full w-full min-h-0 flex-col gap-3 overflow-hidden">
      <Seo
        description={universityAdminContent.credentialsPage.meta.description}
        noIndex
        title={universityAdminContent.credentialsPage.meta.title}
      />
      <AdminPageHeader
        description=""
        headingAlign="center"
        title={universityAdminContent.credentialsPage.title}
        titleClassName="text-center text-[1.7rem] sm:text-[2rem]"
      />
      <button
        className="inline-flex self-center items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.25 text-[0.8rem] font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 sm:hidden"
        disabled={isLoading}
        type="button"
        onClick={handleSendAll}
      >
        <Send aria-hidden="true" className="h-4 w-4" />
        <span>
          {universityAdminContent.credentialsPage.actionLabels.sendAll}
        </span>
      </button>
      {feedbackMessage ? (
        <SurfaceCard
          className="border border-emerald-200 bg-emerald-50/90 text-sm font-medium text-emerald-800"
          paddingClassName="p-3.5"
        >
          <p role="status">
            <span className="font-semibold">
              {universityAdminContent.credentialsPage.successNoticePrefix}
            </span>{' '}
            {feedbackMessage}
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
      <AdminPanelCard className="flex-1" panelClassName="bg-[#f4f8ff]">
        <div className="flex flex-col gap-2 border-b border-slate-200/80 px-3 py-2 sm:gap-3 sm:px-5 sm:py-3.5">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 space-y-0.5 sm:space-y-1">
              <h2 className="hidden font-headline text-[1.12rem] font-extrabold tracking-tight text-ink sm:block sm:text-[1.25rem]">
                {universityAdminContent.credentialsPage.tableTitle}
              </h2>
              {universityAdminContent.credentialsPage.subtitle ? (
                <p className="max-w-3xl text-sm leading-6 text-ink-muted">
                  {universityAdminContent.credentialsPage.subtitle}
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <label className="relative min-w-0 sm:w-[22rem] lg:w-[26rem] xl:w-[30rem]">
                <span className="sr-only">
                  Buscar por nombres, documento o correo
                </span>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ghost sm:left-3.5 sm:h-4 sm:w-4"
                />
                <input
                  className="h-9 w-full rounded-full border border-slate-200/90 bg-white/98 py-0 pl-8.5 pr-3 text-[0.78rem] text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 placeholder:text-ghost/80 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-10 sm:pl-10 sm:pr-4 sm:text-[0.82rem]"
                  placeholder="Buscar por nombres, documento o correo"
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>
              <div ref={filterMenuRef} className="relative shrink-0">
                <button
                  aria-controls="university-credential-status-menu"
                  aria-expanded={isFilterMenuOpen}
                  aria-haspopup="menu"
                  aria-label={
                    statusFilter === 'all'
                      ? 'Filtrar credenciales por estado'
                      : `Filtrar credenciales por estado. Actual: ${
                          credentialFilterOptions.find(
                            (option) => option.value === statusFilter,
                          )?.label
                        }`
                  }
                  className={classNames(
                    'relative inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white/98 text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-10 sm:w-10',
                    statusFilter === 'all'
                      ? 'border-slate-200/90 hover:border-primary/30 hover:bg-white'
                      : 'border-primary/25 bg-primary/[0.08] text-primary hover:bg-primary/[0.12]',
                  )}
                  type="button"
                  onClick={() =>
                    setIsFilterMenuOpen((currentValue) => !currentValue)
                  }
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
                    className="absolute right-0 top-[calc(100%+0.55rem)] z-20 w-[13rem] overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-white/95 p-2 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] backdrop-blur sm:w-[14rem]"
                    id="university-credential-status-menu"
                    role="menu"
                  >
                    <div className="px-2.5 pb-2 pt-1">
                      <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-primary/75">
                        Filtrar por estado
                      </p>
                    </div>
                    <div className="space-y-1">
                      {credentialFilterOptions.map((option) => {
                        const isSelected = statusFilter === option.value;

                        return (
                          <button
                            key={option.value}
                            className={classNames(
                              'flex w-full items-center justify-between rounded-[0.95rem] px-3 py-2 text-left text-[0.82rem] font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                              isSelected
                                ? 'bg-primary text-white shadow-[0_14px_30px_-20px_rgba(22,78,99,0.9)]'
                                : 'bg-slate-50/70 text-ink hover:bg-slate-100',
                            )}
                            role="menuitemradio"
                            type="button"
                            aria-checked={isSelected}
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
                className="hidden items-center justify-center gap-2 rounded-xl bg-brand-gradient px-3.5 py-2.5 text-[0.82rem] font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 sm:inline-flex"
                disabled={isLoading}
                type="button"
                onClick={handleSendAll}
              >
                <Send aria-hidden="true" className="h-4 w-4" />
                <span>
                  {universityAdminContent.credentialsPage.actionLabels.sendAll}
                </span>
              </button>
            </div>
          </div>
          {universityAdminContent.credentialsPage.editEmailHelp ? (
            <SurfaceCard
              className="border border-slate-200/80 bg-white text-sm leading-6 text-ink-muted shadow-none"
              paddingClassName="p-4"
            >
              <p>{universityAdminContent.credentialsPage.editEmailHelp}</p>
            </SurfaceCard>
          ) : null}
        </div>
        {filteredCredentialRows.length > 0 ? (
          <div className="admin-scrollbar min-h-0 flex-1 overflow-x-auto overflow-y-auto">
            <table className="min-w-full">
              <thead className="sticky top-0 z-10 bg-slate-100 text-left">
                <tr className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-ink-muted sm:text-[0.64rem] sm:tracking-[0.16em]">
                  <th className="px-3 py-2 sm:px-5 sm:py-2.5">Estudiante</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-2.5">
                    Correo electronico
                  </th>
                  <th className="px-3 py-2 text-center sm:px-4 sm:py-2.5">
                    Estado
                  </th>
                  <th className="px-3 py-2 text-center sm:px-5 sm:py-2.5">
                    Acciones
                  </th>
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
                          'px-3 pt-2.5 sm:px-5 sm:pt-3',
                          isLast ? 'pb-3 sm:pb-3.5' : 'pb-2.5 sm:pb-3',
                        )}
                      >
                        <div className="space-y-0.5 sm:space-y-1">
                          <p className="text-[0.78rem] font-semibold text-ink sm:text-[0.83rem]">
                            {credential.studentName}
                          </p>
                          <p className="text-[0.68rem] text-ink-muted sm:text-[0.76rem]">
                            {credential.studentDocument}
                          </p>
                          <p className="text-[0.68rem] text-ink-muted sm:text-[0.76rem]">
                            {formatLastSentAt(credential.lastSentAt)}
                          </p>
                        </div>
                      </td>
                      <td
                        className={classNames(
                          'px-3 pt-2.5 sm:px-4 sm:pt-3',
                          isLast ? 'pb-3 sm:pb-3.5' : 'pb-2.5 sm:pb-3',
                        )}
                      >
                        {isEditing ? (
                          <div className="max-w-[20rem] space-y-1.5">
                            <label
                              className="sr-only"
                              htmlFor={`credential-email-${credential.id}`}
                            >
                              Correo electronico de {credential.studentName}
                            </label>
                            <div className="relative">
                              <Mail
                                aria-hidden="true"
                                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ghost sm:left-3.5 sm:h-4 sm:w-4"
                              />
                              <input
                                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8.5 pr-3 text-[0.78rem] text-ink placeholder:text-ghost/80 transition duration-300 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:pl-10 sm:pr-4 sm:text-[0.82rem]"
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
                          <div className="inline-flex items-center gap-1.5 text-[0.76rem] text-ink-muted sm:gap-2 sm:text-[0.82rem]">
                            <Mail
                              aria-hidden="true"
                              className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4"
                            />
                            <span>{credential.studentEmail}</span>
                          </div>
                        )}
                      </td>
                      <td
                        className={classNames(
                          'px-3 pt-2.5 text-center sm:px-4 sm:pt-3',
                          isLast ? 'pb-3 sm:pb-3.5' : 'pb-2.5 sm:pb-3',
                        )}
                      >
                        <div className="flex items-center justify-center">
                          <AdminStatusBadge
                            entity="credential"
                            size="compact-mobile"
                            status={credential.deliveryStatus}
                          />
                        </div>
                      </td>
                      <td
                        className={classNames(
                          'px-3 pt-2.5 text-center sm:px-5 sm:pt-3',
                          isLast ? 'pb-3 sm:pb-3.5' : 'pb-2.5 sm:pb-3',
                        )}
                      >
                        <div className="mt-0.5 flex flex-nowrap items-center justify-center gap-1 sm:gap-2">
                          {isEditing ? (
                            <>
                              <button
                                aria-label={
                                  universityAdminContent.credentialsPage
                                    .actionLabels.saveEmail
                                }
                                className="inline-flex h-[1.875rem] w-[1.875rem] shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition duration-200 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-1 sm:text-xs sm:font-semibold"
                                disabled={isLoading}
                                type="button"
                                onClick={() =>
                                  handleSaveEmail(
                                    credential.id,
                                    credential.studentName,
                                  )
                                }
                              >
                                <Check aria-hidden="true" className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                  {
                                    universityAdminContent.credentialsPage
                                      .actionLabels.saveEmail
                                  }
                                </span>
                              </button>
                              <button
                                aria-label="Cancelar"
                                className="inline-flex h-[1.875rem] w-[1.875rem] shrink-0 items-center justify-center rounded-full bg-slate-100 text-ink-muted transition duration-200 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-1 sm:text-xs sm:font-semibold"
                                disabled={isLoading}
                                type="button"
                                onClick={handleCancelEmailEdit}
                              >
                                <X aria-hidden="true" className="h-4 w-4" />
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
                                    ? universityAdminContent.credentialsPage
                                        .actionLabels.send
                                    : universityAdminContent.credentialsPage
                                        .actionLabels.resend
                                }
                                title={
                                  isGenerated
                                    ? universityAdminContent.credentialsPage
                                        .actionLabels.send
                                    : universityAdminContent.credentialsPage
                                        .actionLabels.resend
                                }
                                className={classNames(
                                  'inline-flex h-[1.875rem] w-[1.875rem] shrink-0 items-center justify-center rounded-full transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-1 sm:text-xs sm:font-semibold',
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
                                    className="h-4 w-4"
                                  />
                                ) : (
                                  <RotateCcw
                                    aria-hidden="true"
                                    className="h-4 w-4"
                                  />
                                )}
                                <span className="hidden sm:inline">
                                  {isGenerated
                                    ? universityAdminContent.credentialsPage
                                        .actionLabels.send
                                    : universityAdminContent.credentialsPage
                                        .actionLabels.resend}
                                </span>
                              </button>
                              <button
                                aria-label={
                                  universityAdminContent.credentialsPage
                                    .actionLabels.editEmail
                                }
                                title={
                                  universityAdminContent.credentialsPage
                                    .actionLabels.editEmail
                                }
                                className="inline-flex h-[1.875rem] w-[1.875rem] shrink-0 items-center justify-center rounded-full bg-slate-100 text-ink-muted transition duration-200 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-1 sm:text-xs sm:font-semibold"
                                disabled={isLoading}
                                type="button"
                                onClick={() => handleStartEmailEdit(credential)}
                              >
                                <PencilLine
                                  aria-hidden="true"
                                  className="h-4 w-4"
                                />
                                <span className="hidden sm:inline">
                                  {
                                    universityAdminContent.credentialsPage
                                      .actionLabels.editEmail
                                  }
                                </span>
                              </button>
                              <button
                                aria-label={
                                  universityAdminContent.credentialsPage
                                    .actionLabels.delete
                                }
                                title={
                                  universityAdminContent.credentialsPage
                                    .actionLabels.delete
                                }
                                className="inline-flex h-[1.875rem] w-[1.875rem] shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-700 transition duration-200 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200/70 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-1 sm:text-xs sm:font-semibold"
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
                                  className="h-4 w-4"
                                />
                                <span className="hidden sm:inline">
                                  {
                                    universityAdminContent.credentialsPage
                                      .actionLabels.delete
                                  }
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
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center px-4 py-8 text-center sm:px-5">
            <p className="text-sm font-medium text-ink-muted">
              {isLoading ? 'Cargando credenciales...' : emptyStateMessage}
            </p>
          </div>
        )}
      </AdminPanelCard>
      <AdminConfirmationDialog
        cancelLabel="No, cancelar"
        confirmLabel={confirmationConfirmLabel}
        description={confirmationDescription}
        isOpen={pendingConfirmation !== null}
        isSubmitting={isConfirmationSubmitting}
        title={confirmationTitle}
        tone={pendingConfirmation?.action === 'delete' ? 'danger' : 'primary'}
        onCancel={handleCloseConfirmation}
        onConfirm={handleConfirmPendingAction}
      />
    </div>
  );
}
