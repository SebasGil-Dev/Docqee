import { Check, Mail, PencilLine, RotateCcw, Send, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { AdminConfirmationDialog } from '@/components/admin/AdminConfirmationDialog';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { universityAdminContent } from '@/content/universityAdminContent';
import { classNames } from '@/lib/classNames';
import { useUniversityAdminModuleStore } from '@/lib/universityAdminModuleStore';

type CredentialRow = ReturnType<typeof buildCredentialRows>[number];

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
  credentials: ReturnType<typeof useUniversityAdminModuleStore>['credentials'],
  students: ReturnType<typeof useUniversityAdminModuleStore>['students'],
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
        studentName: `${student.firstName} ${student.lastName}`,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

export function UniversityCredentialsPage() {
  const {
    credentials,
    deleteStudentCredential,
    editStudentCredentialEmail,
    errorMessage,
    isLoading,
    resendStudentCredential,
    sendAllStudentCredentials,
    sendStudentCredential,
    students,
  } = useUniversityAdminModuleStore();
  const credentialRows = useMemo(
    () => buildCredentialRows(credentials, students),
    [credentials, students],
  );
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<UniversityCredentialConfirmation | null>(null);
  const [isConfirmationSubmitting, setIsConfirmationSubmitting] = useState(false);
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
      const updated = await editStudentCredentialEmail(credentialId, normalizedEmail);

      if (!updated) {
        setEmailError('No pudimos actualizar el correo en este momento.');
        return;
      }

      setEditingCredentialId(null);
      setEmailDraft('');
      setEmailError(null);
      setFeedbackMessage(`El correo de ${studentName} se actualizo correctamente.`);
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
        const deleted = await deleteStudentCredential(pendingConfirmation.credential.id);

        if (deleted) {
          if (editingCredentialId === pendingConfirmation.credential.id) {
            handleCancelEmailEdit();
          }

          setFeedbackMessage(
            `La credencial de ${pendingConfirmation.credential.studentName} se elimino correctamente.`,
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
              ? `La credencial de ${pendingConfirmation.credential.studentName} quedo enviada correctamente.`
              : `La credencial de ${pendingConfirmation.credential.studentName} se reenvio correctamente.`,
          );
        }
      }

      setIsConfirmationSubmitting(false);
      setPendingConfirmation(null);
    })();
  };

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
      ? `Se eliminara la credencial de ${pendingConfirmation.credential.studentName}.`
      : pendingConfirmation.action === 'send'
        ? `Se enviara la credencial al correo ${pendingConfirmation.credential.studentEmail}.`
        : `Se reenviara la credencial al correo ${pendingConfirmation.credential.studentEmail}.`
    : '';

  return (
    <div className="mx-auto flex h-full max-w-[88rem] min-h-0 flex-col gap-3 overflow-hidden 2xl:max-w-[96rem]">
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
        <div className="flex flex-col gap-3 border-b border-slate-200/80 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="font-headline text-[1.12rem] font-extrabold tracking-tight text-ink sm:text-[1.25rem]">
                {universityAdminContent.credentialsPage.tableTitle}
              </h2>
              {universityAdminContent.credentialsPage.subtitle ? (
                <p className="max-w-3xl text-sm leading-6 text-ink-muted">
                  {universityAdminContent.credentialsPage.subtitle}
                </p>
              ) : null}
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-brand-gradient px-3.5 py-2.5 text-[0.82rem] font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 sm:self-center"
              disabled={isLoading}
              type="button"
              onClick={handleSendAll}
            >
              <Send aria-hidden="true" className="h-4 w-4" />
              <span>{universityAdminContent.credentialsPage.actionLabels.sendAll}</span>
            </button>
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
        {credentialRows.length > 0 ? (
          <div className="admin-scrollbar min-h-0 flex-1 overflow-x-auto overflow-y-auto">
            <table className="min-w-full">
              <thead className="sticky top-0 z-10 bg-slate-100 text-left">
                <tr className="text-[0.64rem] font-bold uppercase tracking-[0.16em] text-ink-muted">
                  <th className="px-4 py-2.5 sm:px-5">Estudiante</th>
                  <th className="px-4 py-2.5">Correo electronico</th>
                  <th className="px-4 py-2.5">Estado</th>
                  <th className="px-4 py-2.5 text-center sm:px-5">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {credentialRows.map((credential, index) => {
                  const isGenerated = credential.deliveryStatus === 'generated';
                  const isEditing = editingCredentialId === credential.id;
                  const isLast = index === credentialRows.length - 1;

                  return (
                    <tr key={credential.id} className="align-top">
                      <td
                        className={classNames(
                          'px-4 pt-3 sm:px-5',
                          isLast ? 'pb-3.5' : 'pb-3',
                        )}
                      >
                        <div className="space-y-1">
                          <p className="text-[0.83rem] font-semibold text-ink">{credential.studentName}</p>
                          <p className="text-[0.72rem] text-ink-muted sm:text-[0.76rem]">
                            {credential.studentDocument}
                          </p>
                          <p className="text-[0.72rem] text-ink-muted sm:text-[0.76rem]">
                            Ultimo movimiento: {formatLastSentAt(credential.lastSentAt)}
                          </p>
                        </div>
                      </td>
                      <td
                        className={classNames(
                          'px-4 pt-3',
                          isLast ? 'pb-3.5' : 'pb-3',
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
                              <p className="text-xs font-medium text-rose-700">{emailError}</p>
                            ) : null}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 text-[0.82rem] text-ink-muted">
                            <Mail aria-hidden="true" className="h-4 w-4 shrink-0" />
                            <span>{credential.studentEmail}</span>
                          </div>
                        )}
                      </td>
                      <td
                        className={classNames(
                          'px-4 pt-3',
                          isLast ? 'pb-3.5' : 'pb-3',
                        )}
                      >
                        <AdminStatusBadge entity="credential" status={credential.deliveryStatus} />
                      </td>
                      <td
                        className={classNames(
                          'px-4 pt-3 text-center sm:px-5',
                          isLast ? 'pb-3.5' : 'pb-3',
                        )}
                      >
                        <div className="mt-0.5 flex flex-nowrap items-center justify-center gap-1.5 sm:gap-2">
                          {isEditing ? (
                            <>
                              <button
                                aria-label={universityAdminContent.credentialsPage.actionLabels.saveEmail}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition duration-200 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-1 sm:text-xs sm:font-semibold"
                                disabled={isLoading}
                                type="button"
                                onClick={() =>
                                  handleSaveEmail(credential.id, credential.studentName)
                                }
                              >
                                <Check aria-hidden="true" className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                  {universityAdminContent.credentialsPage.actionLabels.saveEmail}
                                </span>
                              </button>
                              <button
                                aria-label="Cancelar"
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-ink-muted transition duration-200 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-1 sm:text-xs sm:font-semibold"
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
                                    ? universityAdminContent.credentialsPage.actionLabels.send
                                    : universityAdminContent.credentialsPage.actionLabels.resend
                                }
                                title={
                                  isGenerated
                                    ? universityAdminContent.credentialsPage.actionLabels.send
                                    : universityAdminContent.credentialsPage.actionLabels.resend
                                }
                                className={classNames(
                                  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-1 sm:text-xs sm:font-semibold',
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
                                  <Send aria-hidden="true" className="h-4 w-4" />
                                ) : (
                                  <RotateCcw aria-hidden="true" className="h-4 w-4" />
                                )}
                                <span className="hidden sm:inline">
                                  {isGenerated
                                    ? universityAdminContent.credentialsPage.actionLabels.send
                                    : universityAdminContent.credentialsPage.actionLabels.resend}
                                </span>
                              </button>
                              <button
                                aria-label={universityAdminContent.credentialsPage.actionLabels.editEmail}
                                title={universityAdminContent.credentialsPage.actionLabels.editEmail}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-ink-muted transition duration-200 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-1 sm:text-xs sm:font-semibold"
                                disabled={isLoading}
                                type="button"
                                onClick={() => handleStartEmailEdit(credential)}
                              >
                                <PencilLine aria-hidden="true" className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                  {universityAdminContent.credentialsPage.actionLabels.editEmail}
                                </span>
                              </button>
                              <button
                                aria-label={universityAdminContent.credentialsPage.actionLabels.delete}
                                title={universityAdminContent.credentialsPage.actionLabels.delete}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-700 transition duration-200 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200/70 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-1 sm:text-xs sm:font-semibold"
                                disabled={isLoading}
                                type="button"
                                onClick={() => {
                                  setPendingConfirmation({
                                    action: 'delete',
                                    credential,
                                  });
                                }}
                              >
                                <Trash2 aria-hidden="true" className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                  {universityAdminContent.credentialsPage.actionLabels.delete}
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
              {isLoading ? 'Cargando credenciales...' : universityAdminContent.credentialsPage.emptyState}
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
