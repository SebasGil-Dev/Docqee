import { Check, Mail, PencilLine, RotateCcw, Send, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { universityAdminContent } from '@/content/universityAdminContent';
import { classNames } from '@/lib/classNames';
import { useUniversityAdminModuleStore } from '@/lib/universityAdminModuleStore';

type CredentialRow = ReturnType<typeof buildCredentialRows>[number];

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

  return (
    <div className="mx-auto flex h-full max-w-[88rem] min-h-0 flex-col gap-4 overflow-hidden 2xl:max-w-[96rem]">
      <Seo
        description={universityAdminContent.credentialsPage.meta.description}
        noIndex
        title={universityAdminContent.credentialsPage.meta.title}
      />
      <AdminPageHeader
        action={
          <button
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-4 py-3 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
            disabled={isLoading}
            type="button"
            onClick={handleSendAll}
          >
            <Send aria-hidden="true" className="h-4 w-4" />
            <span>{universityAdminContent.credentialsPage.actionLabels.sendAll}</span>
          </button>
        }
        description=""
        title={universityAdminContent.credentialsPage.title}
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
        <div className="flex flex-col gap-3 border-b border-slate-200/80 px-4 py-4 sm:px-5 sm:py-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-start lg:gap-5">
          <div className={classNames('space-y-1', !universityAdminContent.credentialsPage.subtitle && 'lg:self-center')}>
            <h2 className="font-headline text-[1.35rem] font-extrabold tracking-tight text-ink sm:text-[1.5rem]">
              {universityAdminContent.credentialsPage.tableTitle}
            </h2>
            {universityAdminContent.credentialsPage.subtitle ? (
              <p className="max-w-3xl text-sm leading-6 text-ink-muted">
                {universityAdminContent.credentialsPage.subtitle}
              </p>
            ) : null}
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
                <tr className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-ink-muted">
                  <th className="px-4 py-3 sm:px-5">Estudiante</th>
                  <th className="px-4 py-3">Correo electronico</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right sm:px-5">Acciones</th>
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
                          'px-4 pt-3.5 sm:px-5',
                          isLast ? 'pb-4' : 'pb-3.5',
                        )}
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-ink">{credential.studentName}</p>
                          <p className="text-xs text-ink-muted sm:text-[0.82rem]">
                            {credential.studentDocument}
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
                        {isEditing ? (
                          <div className="max-w-[20rem] space-y-2">
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
                            <span>{credential.studentEmail}</span>
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
                          'px-4 pt-3.5 text-right sm:px-5',
                          isLast ? 'pb-4' : 'pb-3.5',
                        )}
                      >
                        <div className="flex flex-wrap justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition duration-200 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                                disabled={isLoading}
                                type="button"
                                onClick={() =>
                                  handleSaveEmail(credential.id, credential.studentName)
                                }
                              >
                                <Check aria-hidden="true" className="h-4 w-4" />
                                <span>
                                  {universityAdminContent.credentialsPage.actionLabels.saveEmail}
                                </span>
                              </button>
                              <button
                                className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-ink-muted transition duration-200 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
                                disabled={isLoading}
                                type="button"
                                onClick={handleCancelEmailEdit}
                              >
                                <X aria-hidden="true" className="h-4 w-4" />
                                <span>Cancelar</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className={classNames(
                                  'inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                                  isGenerated
                                    ? 'bg-primary/10 text-primary hover:bg-primary/15'
                                    : 'bg-sky-50 text-sky-700 hover:bg-sky-100',
                                )}
                                disabled={isLoading}
                                type="button"
                                onClick={() => {
                                  void (async () => {
                                    const updated = isGenerated
                                      ? await sendStudentCredential(credential.id)
                                      : await resendStudentCredential(credential.id);

                                    if (!updated) {
                                      return;
                                    }

                                    setFeedbackMessage(
                                      isGenerated
                                        ? `La credencial de ${credential.studentName} quedo enviada correctamente.`
                                        : `La credencial de ${credential.studentName} se reenvio correctamente.`,
                                    );
                                  })();
                                }}
                              >
                                {isGenerated ? (
                                  <Send aria-hidden="true" className="h-4 w-4" />
                                ) : (
                                  <RotateCcw aria-hidden="true" className="h-4 w-4" />
                                )}
                                <span>
                                  {isGenerated
                                    ? universityAdminContent.credentialsPage.actionLabels.send
                                    : universityAdminContent.credentialsPage.actionLabels.resend}
                                </span>
                              </button>
                              <button
                                className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-ink-muted transition duration-200 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
                                disabled={isLoading}
                                type="button"
                                onClick={() => handleStartEmailEdit(credential)}
                              >
                                <PencilLine aria-hidden="true" className="h-4 w-4" />
                                <span>
                                  {universityAdminContent.credentialsPage.actionLabels.editEmail}
                                </span>
                              </button>
                              <button
                                className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition duration-200 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200/70"
                                disabled={isLoading}
                                type="button"
                                onClick={() => {
                                  void (async () => {
                                    const deleted = await deleteStudentCredential(credential.id);

                                    if (!deleted) {
                                      return;
                                    }

                                    if (editingCredentialId === credential.id) {
                                      handleCancelEmailEdit();
                                    }

                                    setFeedbackMessage(
                                      `La credencial de ${credential.studentName} se elimino correctamente.`,
                                    );
                                  })();
                                }}
                              >
                                <Trash2 aria-hidden="true" className="h-4 w-4" />
                                <span>
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
    </div>
  );
}
