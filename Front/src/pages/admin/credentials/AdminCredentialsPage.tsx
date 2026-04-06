import { Mail, RotateCcw, Send, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { Seo } from '@/components/ui/Seo';
import { adminContent } from '@/content/adminContent';
import type { PendingCredential } from '@/content/types';
import { classNames } from '@/lib/classNames';
import { useAdminModuleStore } from '@/lib/adminModuleStore';

type CredentialRow = PendingCredential & {
  administratorEmail: string;
  administratorName: string;
  universityName: string;
};

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
  const { credentials, deleteCredential, errorMessage, isLoading, resendCredential, sendCredential, universities } =
    useAdminModuleStore();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const credentialRows: CredentialRow[] = credentials
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
      };
    })
    .filter((row): row is CredentialRow => row !== null);
  const shouldEnableTableScroll = credentialRows.length > 2;

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
      <Seo
        description={adminContent.credentialsPage.meta.description}
        noIndex
        title={adminContent.credentialsPage.meta.title}
      />
      <AdminPageHeader
        description=""
        eyebrow={adminContent.credentialsPage.eyebrow}
        title={adminContent.credentialsPage.title}
      />
      {feedbackMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status">
          {feedbackMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
          {errorMessage}
        </div>
      ) : null}
      <AdminPanelCard className="flex-1" panelClassName="bg-white">
        <div className="border-b border-slate-200/80 px-6 py-6 sm:px-7">
          <h2 className="font-headline text-2xl font-extrabold tracking-tight text-ink">
            Credenciales pendientes
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
            {adminContent.credentialsPage.subtitle}
          </p>
        </div>
        {credentialRows.length > 0 ? (
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
                    <th className="px-6 py-4 sm:px-7">Universidad</th>
                    <th className="px-6 py-4">Administrador</th>
                    <th className="px-6 py-4">Correo electronico</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right sm:px-7">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {credentialRows.map((credential) => {
                    const isGenerated = credential.deliveryStatus === 'generated';

                    return (
                      <tr key={credential.id} className="align-top">
                        <td className="px-6 py-5 sm:px-7">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-ink">
                              {credential.universityName}
                            </p>
                            <p className="text-sm text-ink-muted">
                              Ultimo movimiento: {formatLastSentAt(credential.lastSentAt)}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-sm font-medium text-ink">
                          {credential.administratorName}
                        </td>
                        <td className="px-6 py-5">
                          <div className="inline-flex items-center gap-2 text-sm text-ink-muted">
                            <Mail aria-hidden="true" className="h-4 w-4" />
                            <span>{credential.administratorEmail}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <AdminStatusBadge entity="credential" status={credential.deliveryStatus} />
                        </td>
                        <td className="px-6 py-5 sm:px-7">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              className={classNames(
                                'inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                                isGenerated
                                  ? 'bg-primary/10 text-primary hover:bg-primary/15'
                                  : 'bg-sky-50 text-sky-700 hover:bg-sky-100',
                              )}
                              type="button"
                              onClick={() => {
                                void (async () => {
                                  if (isGenerated) {
                                    const temporaryPassword = await sendCredential(credential.id);
                                    if (temporaryPassword) {
                                      setFeedbackMessage(
                                        `Credencial enviada. Contrasena temporal: ${temporaryPassword}`,
                                      );
                                    }
                                    return;
                                  }

                                  const temporaryPassword = await resendCredential(credential.id);
                                  if (temporaryPassword) {
                                    setFeedbackMessage(
                                      `Credencial reenviada. Contrasena temporal: ${temporaryPassword}`,
                                    );
                                  }
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
                                  ? adminContent.credentialsPage.actionLabels.send
                                  : adminContent.credentialsPage.actionLabels.resend}
                              </span>
                            </button>
                            <button
                              className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition duration-200 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200/70"
                              type="button"
                              onClick={() => {
                                void (async () => {
                                  const deleted = await deleteCredential(credential.id);

                                  if (deleted) {
                                    setFeedbackMessage('La credencial pendiente se elimino correctamente.');
                                  }
                                })();
                              }}
                            >
                              <Trash2 aria-hidden="true" className="h-4 w-4" />
                              <span>{adminContent.credentialsPage.actionLabels.delete}</span>
                            </button>
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
          <div className="px-6 py-10 text-center sm:px-7">
            <p className="text-sm font-medium text-ink-muted">
              {isLoading ? 'Cargando credenciales...' : adminContent.credentialsPage.emptyState}
            </p>
          </div>
        )}
      </AdminPanelCard>
    </div>
  );
}
