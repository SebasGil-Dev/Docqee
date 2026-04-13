import {
  Check,
  LockKeyhole,
  MessageSquareMore,
  Search,
  SendHorizontal,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { patientContent } from '@/content/patientContent';
import type { PatientConversation, PatientConversationStatus } from '@/content/types';
import { classNames } from '@/lib/classNames';
import { usePatientModuleStore } from '@/lib/patientModuleStore';

type ConversationStatusFilter = PatientConversationStatus | 'all';

const conversationStatusOptions: Array<{ label: string; value: ConversationStatusFilter }> = [
  { label: 'Todas', value: 'all' },
  { label: 'Activa', value: 'ACTIVA' },
  { label: 'Solo lectura', value: 'SOLO_LECTURA' },
  { label: 'Cerrada', value: 'CERRADA' },
];

function getStatusBadgeClasses(status: PatientConversationStatus) {
  switch (status) {
    case 'ACTIVA':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'SOLO_LECTURA':
      return 'bg-amber-50 text-amber-700 ring-amber-200';
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200';
  }
}

function getStatusLabel(status: PatientConversationStatus) {
  switch (status) {
    case 'ACTIVA':
      return 'Activa';
    case 'SOLO_LECTURA':
      return 'Solo lectura';
    default:
      return 'Cerrada';
  }
}

function getLastMessage(conversation: PatientConversation) {
  return conversation.messages[conversation.messages.length - 1] ?? null;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

export function PatientConversationsPage() {
  const { conversations, errorMessage, isLoading, sendConversationMessage, refreshConversation } = usePatientModuleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ConversationStatusFilter>('all');
  const [composerValue, setComposerValue] = useState('');
  const [composerError, setComposerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const selectedConversationId = searchParams.get('conversation');
  const filteredConversations = useMemo(
    () =>
      conversations.filter((conversation) => {
        const lastMessage = getLastMessage(conversation);
        const matchesSearch =
          conversation.studentName.toLowerCase().includes(normalizedSearch) ||
          conversation.universityName.toLowerCase().includes(normalizedSearch) ||
          (conversation.reason ?? '').toLowerCase().includes(normalizedSearch) ||
          (lastMessage?.content ?? '').toLowerCase().includes(normalizedSearch);

        return matchesSearch && (statusFilter === 'all' || conversation.status === statusFilter);
      }),
    [conversations, normalizedSearch, statusFilter],
  );
  const selectedConversation = useMemo(
    () =>
      filteredConversations.find((conversation) => conversation.id === selectedConversationId) ??
      filteredConversations[0] ??
      null,
    [filteredConversations, selectedConversationId],
  );
  const visibleErrorMessage =
    errorMessage && errorMessage.trim() !== 'No pudimos completar la solicitud.'
      ? errorMessage
      : null;

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
    if (!filteredConversations.length) {
      if (selectedConversationId) {
        setSearchParams({}, { replace: true });
      }
      return;
    }

    const fallbackConversation = filteredConversations[0];

    if (!fallbackConversation) {
      return;
    }

    if (!selectedConversationId || selectedConversation?.id !== selectedConversationId) {
      setSearchParams({ conversation: fallbackConversation.id }, { replace: true });
    }
  }, [filteredConversations, selectedConversation, selectedConversationId, setSearchParams]);

  useEffect(() => {
    setComposerValue('');
    setComposerError(null);
    setSuccessMessage(null);
  }, [selectedConversation?.id]);

  useEffect(() => {
    if (!selectedConversation || selectedConversation.status !== 'ACTIVA') {
      return undefined;
    }
    const interval = setInterval(() => {
      void refreshConversation(selectedConversation.id);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedConversation?.id, selectedConversation?.status, refreshConversation]);

  const lastMessageId = selectedConversation?.messages[selectedConversation.messages.length - 1]?.id;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lastMessageId]);

  const handleSendMessage = () => {
    if (!selectedConversation || selectedConversation.status !== 'ACTIVA') {
      return;
    }

    const normalizedMessage = composerValue.trim();

    if (!normalizedMessage) {
      setComposerError('Ingresa un mensaje antes de enviarlo.');
      return;
    }

    void (async () => {
      const sent = await sendConversationMessage(selectedConversation.id, normalizedMessage);

      if (!sent) {
        return;
      }

      setComposerValue('');
      setComposerError(null);
      setSuccessMessage('Tu mensaje fue enviado correctamente.');
    })();
  };

  return (
    <div className="student-page-compact mx-auto flex h-full max-w-[90rem] min-h-0 flex-col gap-3 overflow-hidden 2xl:max-w-[98rem]">
      <Seo
        description={patientContent.conversationsPage.meta.description}
        noIndex
        title={patientContent.conversationsPage.meta.title}
      />
      <AdminPageHeader
        className="gap-3"
        description={patientContent.conversationsPage.description}
        descriptionClassName="text-sm leading-6 sm:text-base"
        headingAlign="center"
        title={patientContent.conversationsPage.title}
        titleClassName="text-[2rem] sm:text-[2.35rem]"
      />
      {successMessage ? (
        <SurfaceCard
          className="border border-emerald-200 bg-emerald-50/90 text-sm font-medium text-emerald-800"
          paddingClassName="p-3.5"
        >
          <p role="status">
            <span className="font-semibold">
              {patientContent.conversationsPage.successNoticePrefix}
            </span>{' '}
            {successMessage}
          </p>
        </SurfaceCard>
      ) : null}
      {visibleErrorMessage ? (
        <SurfaceCard
          className="border border-rose-200 bg-rose-50/90 text-sm font-medium text-rose-800"
          paddingClassName="p-3.5"
        >
          <p role="alert">{visibleErrorMessage}</p>
        </SurfaceCard>
      ) : null}
      <AdminPanelCard className="flex-1" panelClassName="bg-[#f4f8ff]">
        <div className="border-b border-slate-200/80 px-4 py-3.5 sm:px-5 sm:py-3.5">
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex min-w-0 shrink-0 items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[1.1rem] bg-primary/10 text-primary ring-1 ring-primary/10">
                  <MessageSquareMore aria-hidden="true" className="h-5 w-5" />
                </span>
                <h2 className="min-w-0 font-headline text-[1.2rem] font-extrabold tracking-tight text-ink sm:text-[1.35rem]">
                  Chat con estudiantes
                </h2>
              </div>
              <div className="flex w-full items-center justify-end gap-2.5 sm:w-auto">
                <label
                  className="relative min-w-0 flex-1 sm:w-[22rem] sm:flex-none xl:w-[26rem]"
                  htmlFor="patient-conversation-search"
                >
                  <span className="sr-only">{patientContent.conversationsPage.searchLabel}</span>
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost"
                  />
                  <input
                    className="h-11 w-full rounded-full border border-slate-200/90 bg-white/98 py-0 pl-11 pr-4 text-sm text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 placeholder:text-ghost/80 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                    id="patient-conversation-search"
                    placeholder={patientContent.conversationsPage.searchPlaceholder}
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </label>
                <div className="relative shrink-0" ref={statusMenuRef}>
                  <button
                    aria-controls="patient-conversation-status-menu"
                    aria-expanded={isStatusMenuOpen}
                    aria-haspopup="menu"
                    aria-label={
                      statusFilter === 'all'
                        ? 'Filtrar conversaciones por estado'
                        : `Filtrar conversaciones por estado. Actual: ${
                            conversationStatusOptions.find((option) => option.value === statusFilter)?.label
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
                      id="patient-conversation-status-menu"
                      role="menu"
                    >
                      <div className="px-2.5 pb-2 pt-1">
                        <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-primary/75">
                          Filtrar por estado
                        </p>
                      </div>
                      <div className="space-y-1">
                        {conversationStatusOptions.map((option) => {
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
            {selectedConversation ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex max-w-full items-center rounded-full bg-slate-100 px-3 py-1 text-[0.72rem] font-semibold text-ink">
                  {selectedConversation.studentName}
                </span>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[0.72rem] font-semibold text-ink-muted">
                  Solicitud {selectedConversation.requestId}
                </span>
                <span
                  className={classNames(
                    'inline-flex rounded-full px-3 py-1 text-[0.72rem] font-semibold ring-1 ring-inset',
                    getStatusBadgeClasses(selectedConversation.status),
                  )}
                >
                  {getStatusLabel(selectedConversation.status)}
                </span>
              </div>
            ) : null}
          </div>
        </div>
        <div className="grid min-h-0 flex-1 gap-3 px-4 py-3.5 sm:px-5 sm:py-4 xl:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]">
          <SurfaceCard className="min-h-0 border border-slate-200/80 bg-white shadow-none" paddingClassName="p-0">
            <div className="flex h-full min-h-[17rem] flex-col">
              <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto p-2.5">
                {filteredConversations.length > 0 ? (
                  <div className="space-y-2.5">
                    {filteredConversations.map((conversation) => {
                      const lastMessage = getLastMessage(conversation);
                      const isSelected = selectedConversation?.id === conversation.id;

                      return (
                        <button
                          key={conversation.id}
                          className={classNames(
                            'w-full rounded-[1.35rem] border px-3.5 py-2.5 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                            isSelected
                              ? 'border-primary/35 bg-primary/[0.08] shadow-[0_18px_40px_-28px_rgba(22,78,99,0.65)]'
                              : 'border-slate-200/80 bg-slate-50 hover:border-primary/20 hover:bg-slate-100/70',
                          )}
                          data-testid={`patient-conversation-card-${conversation.id}`}
                          type="button"
                          onClick={() =>
                            setSearchParams({ conversation: conversation.id }, { replace: true })
                          }
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink">
                                {conversation.studentName}
                              </p>
                              <p className="text-xs text-ink-muted">{conversation.universityName}</p>
                            </div>
                            {conversation.unreadCount > 0 ? (
                              <span className="inline-flex min-w-[1.45rem] items-center justify-center rounded-full bg-primary px-2 py-1 text-[0.68rem] font-bold text-white">
                                {conversation.unreadCount}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-muted">
                            {lastMessage?.content ?? conversation.reason ?? 'Sin mensajes todavia.'}
                          </p>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <span
                              className={classNames(
                                'inline-flex rounded-full px-3 py-1 text-[0.68rem] font-semibold ring-1 ring-inset',
                                getStatusBadgeClasses(conversation.status),
                              )}
                            >
                              {getStatusLabel(conversation.status)}
                            </span>
                            <span className="text-[0.72rem] font-medium text-ink-muted">
                              {lastMessage ? formatTime(lastMessage.sentAt) : 'Sin hora'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-ink-muted">
                    {isLoading
                      ? 'Cargando conversaciones...'
                      : patientContent.conversationsPage.emptyState}
                  </div>
                )}
              </div>
            </div>
          </SurfaceCard>
          <SurfaceCard className="min-h-0 border border-slate-200/80 bg-white shadow-none" paddingClassName="p-0">
            {selectedConversation ? (
              <div className="flex h-full min-h-[22rem] flex-col">
                <div className="border-b border-slate-200/80 px-4 py-3.5 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink">
                          {selectedConversation.studentName}
                        </h2>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[0.72rem] font-semibold text-ink-muted">
                          Solicitud {selectedConversation.requestId}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[0.72rem] font-semibold text-ink-muted">
                          {selectedConversation.universityName}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-ink-muted">
                        {selectedConversation.reason ?? 'Conversacion asociada a tu proceso de atencion.'}
                      </p>
                    </div>
                    <span
                      className={classNames(
                        'inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
                        getStatusBadgeClasses(selectedConversation.status),
                      )}
                    >
                      {getStatusLabel(selectedConversation.status)}
                    </span>
                  </div>
                </div>
                <div
                  className="admin-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3.5 sm:px-5"
                  data-testid={`patient-conversation-thread-${selectedConversation.id}`}
                >
                  {selectedConversation.messages.map((message) => {
                    const isPatientAuthor = message.author === 'PACIENTE';

                    return (
                      <div
                        key={message.id}
                        className={classNames('flex', isPatientAuthor ? 'justify-end' : 'justify-start')}
                      >
                        <div
                          className={classNames(
                            'max-w-[90%] rounded-[1.45rem] px-3.5 py-2.5 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.35)] sm:max-w-[78%]',
                            isPatientAuthor ? 'bg-brand-gradient text-white' : 'bg-slate-100 text-ink',
                          )}
                        >
                          <p
                            className={classNames(
                              'text-[0.68rem] font-bold uppercase tracking-[0.18em]',
                              isPatientAuthor ? 'text-white/70' : 'text-primary/75',
                            )}
                          >
                            {message.authorName}
                          </p>
                          <p className="mt-1 text-sm leading-6">{message.content}</p>
                          <p
                            className={classNames(
                              'mt-2 text-[0.72rem] font-medium',
                              isPatientAuthor ? 'text-white/75' : 'text-ink-muted',
                            )}
                          >
                            {formatTimestamp(message.sentAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
                <div className="border-t border-slate-200/80 px-4 py-3.5 sm:px-5">
                  {selectedConversation.status === 'ACTIVA' ? (
                    <div className="space-y-3">
                      <div className="rounded-[1.25rem] border border-emerald-200/80 bg-emerald-50/75 px-4 py-3 text-sm text-emerald-800">
                        <div className="flex items-center gap-2">
                          <ShieldCheck aria-hidden="true" className="h-4.5 w-4.5" />
                          <p className="font-medium">
                            Conversacion activa. Puedes responder al estudiante desde aqui.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <label className="block text-sm font-semibold text-ink" htmlFor="patient-conversation-message">
                            Mensaje para el estudiante
                          </label>
                          <textarea
                            aria-describedby={composerError ? 'patient-conversation-message-error' : undefined}
                            aria-invalid={Boolean(composerError)}
                            className={classNames(
                              'min-h-[5.5rem] w-full rounded-[1.35rem] border bg-surface px-4 py-3 text-sm text-ink placeholder:text-ghost/80 transition duration-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                              composerError
                                ? 'border-rose-300 focus-visible:border-rose-400 focus-visible:ring-rose-200/70'
                                : 'border-slate-200 focus-visible:border-primary',
                            )}
                            id="patient-conversation-message"
                            placeholder="Escribe aqui una respuesta clara para continuar la atencion."
                            value={composerValue}
                            onChange={(event) => {
                              setComposerValue(event.target.value);
                              setComposerError(null);
                              setSuccessMessage(null);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                handleSendMessage();
                              }
                            }}
                          />
                          {composerError ? (
                            <p className="text-sm text-rose-600" id="patient-conversation-message-error">
                              {composerError}
                            </p>
                          ) : null}
                        </div>
                        <button
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 sm:min-w-[10rem]"
                          disabled={isLoading}
                          type="button"
                          onClick={handleSendMessage}
                        >
                          <SendHorizontal aria-hidden="true" className="h-4 w-4" />
                          <span>{patientContent.conversationsPage.actionLabels.sendMessage}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[1.25rem] border border-amber-200/80 bg-amber-50/75 px-4 py-3 text-sm text-amber-800">
                      <div className="flex items-center gap-2">
                        <LockKeyhole aria-hidden="true" className="h-4.5 w-4.5" />
                        <p className="font-medium">
                          {selectedConversation.status === 'SOLO_LECTURA'
                            ? 'Esta conversacion sigue disponible para consulta, pero ya no admite nuevos mensajes.'
                            : 'La conversacion fue cerrada y no admite nuevas respuestas.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[22rem] items-center justify-center px-5 py-8 text-center">
                <div className="max-w-md space-y-3">
                  <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-primary/10 text-primary">
                    <MessageSquareMore aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink">
                    Sin conversacion seleccionada
                  </h2>
                  <p className="text-sm leading-6 text-ink-muted">
                    {patientContent.conversationsPage.emptyState}
                  </p>
                </div>
              </div>
            )}
          </SurfaceCard>
        </div>
      </AdminPanelCard>
    </div>
  );
}
