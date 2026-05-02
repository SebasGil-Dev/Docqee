import {
  ChevronLeft,
  Check,
  LockKeyhole,
  MessageSquareMore,
  SendHorizontal,
  SlidersHorizontal,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { patientContent } from '@/content/patientContent';
import type {
  PatientConversation,
  PatientConversationStatus,
} from '@/content/types';
import { classNames } from '@/lib/classNames';
import { usePatientModuleStore } from '@/lib/patientModuleStore';

type ConversationStatusFilter = PatientConversationStatus | 'all';

const conversationStatusOptions: Array<{
  label: string;
  value: ConversationStatusFilter;
}> = [
  { label: 'Todas', value: 'all' },
  { label: 'Activa', value: 'ACTIVA' },
  { label: 'Cerrada', value: 'CERRADA' },
];

const CONVERSATION_POLL_INTERVAL_MS = 5_000;

function normalizeConversationText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, ' ') ?? '';
}

function isRequestReasonMessage(
  conversation: PatientConversation,
  message: PatientConversation['messages'][number],
  messageIndex: number,
) {
  const reason = normalizeConversationText(conversation.reason);

  return (
    messageIndex === 0 &&
    message.author === 'PACIENTE' &&
    reason.length > 0 &&
    normalizeConversationText(message.content) === reason
  );
}

function getVisibleMessages(conversation: PatientConversation) {
  return conversation.messages.filter(
    (message, messageIndex) =>
      !isRequestReasonMessage(conversation, message, messageIndex),
  );
}

function getLastMessage(conversation: PatientConversation) {
  const visibleMessages = getVisibleMessages(conversation);

  return visibleMessages[visibleMessages.length - 1] ?? null;
}

function getStudentInitials(studentName: string) {
  const [firstName = '', ...rest] = studentName.trim().split(/\s+/);
  const firstLastName = rest[rest.length - 1] ?? '';
  return `${firstName.charAt(0)}${firstLastName.charAt(0)}`.toUpperCase();
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
  const {
    conversations,
    errorMessage,
    isLoading,
    sendConversationMessage,
    refreshConversation,
  } = usePatientModuleStore();
  const [statusFilter, setStatusFilter] =
    useState<ConversationStatusFilter>('all');
  const [composerValue, setComposerValue] = useState('');
  const [composerError, setComposerError] = useState<string | null>(null);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const selectedConversationId = searchParams.get('conversation');
  const filteredConversations = useMemo(
    () =>
      conversations
        .filter((conversation) => {
          return statusFilter === 'all' || conversation.status === statusFilter;
        })
        .sort((a, b) => {
          const aTime = getLastMessage(a)?.sentAt ?? '';
          const bTime = getLastMessage(b)?.sentAt ?? '';
          return bTime < aTime ? -1 : bTime > aTime ? 1 : 0;
        }),
    [conversations, statusFilter],
  );
  const selectedConversation = useMemo(
    () =>
      filteredConversations.find(
        (conversation) => conversation.id === selectedConversationId,
      ) ??
      filteredConversations[0] ??
      null,
    [filteredConversations, selectedConversationId],
  );
  const visibleSelectedMessages = useMemo(
    () =>
      selectedConversation ? getVisibleMessages(selectedConversation) : [],
    [selectedConversation],
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

    if (
      !selectedConversationId ||
      selectedConversation?.id !== selectedConversationId
    ) {
      setSearchParams(
        { conversation: fallbackConversation.id },
        { replace: true },
      );
    }
  }, [
    filteredConversations,
    selectedConversation,
    selectedConversationId,
    setSearchParams,
  ]);

  useEffect(() => {
    setComposerValue('');
    setComposerError(null);
  }, [selectedConversation?.id]);

  useEffect(() => {
    if (!selectedConversation || selectedConversation.status !== 'ACTIVA') {
      return;
    }

    void refreshConversation(selectedConversation.id);
  }, [
    selectedConversation?.id,
    selectedConversation?.status,
    refreshConversation,
  ]);

  useEffect(() => {
    if (!selectedConversation || selectedConversation.status !== 'ACTIVA') {
      return undefined;
    }

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshConversation(selectedConversation.id);
      }
    }, CONVERSATION_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [
    selectedConversation?.id,
    selectedConversation?.status,
    refreshConversation,
  ]);

  const lastMessageId =
    visibleSelectedMessages[visibleSelectedMessages.length - 1]?.id;

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
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

    setComposerValue('');
    setComposerError(null);

    void (async () => {
      const sent = await sendConversationMessage(
        selectedConversation.id,
        normalizedMessage,
      );

      if (!sent) {
        setComposerValue(normalizedMessage);
      }
    })();
  };

  return (
    <div className="student-page-compact flex h-full min-h-0 w-full flex-col gap-2 overflow-visible lg:overflow-hidden">
      <Seo
        description={patientContent.conversationsPage.meta.description}
        noIndex
        title={patientContent.conversationsPage.meta.title}
      />
      {visibleErrorMessage ? (
        <SurfaceCard
          className="border border-rose-200 bg-rose-50/90 text-sm font-medium text-rose-800"
          paddingClassName="p-3.5"
        >
          <p role="alert">{visibleErrorMessage}</p>
        </SurfaceCard>
      ) : null}
      <AdminPanelCard className="min-h-0 flex-1" panelClassName="bg-[#f4f8ff]">
        <div className="border-b border-slate-200/80 px-2.5 py-2 sm:px-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.9rem] bg-primary/10 text-primary ring-1 ring-primary/10">
                  <MessageSquareMore aria-hidden="true" className="h-4 w-4" />
                </span>
                <h2 className="min-w-0 truncate font-headline text-[1rem] font-extrabold tracking-tight text-ink sm:text-[1.08rem]">
                  Chat con estudiantes
                </h2>
              </div>
              <div className="flex shrink-0 items-center justify-end gap-2">
                <div className="relative shrink-0" ref={statusMenuRef}>
                  <button
                    aria-controls="patient-conversation-status-menu"
                    aria-expanded={isStatusMenuOpen}
                    aria-haspopup="menu"
                    aria-label={
                      statusFilter === 'all'
                        ? 'Filtrar conversaciones por estado'
                        : `Filtrar conversaciones por estado. Actual: ${
                            conversationStatusOptions.find(
                              (option) => option.value === statusFilter,
                            )?.label
                          }`
                    }
                    className={classNames(
                      'relative inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white/98 text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                      statusFilter === 'all'
                        ? 'border-slate-200/90 hover:border-primary/30 hover:bg-white'
                        : 'border-primary/25 bg-primary/[0.08] text-primary hover:bg-primary/[0.12]',
                    )}
                    type="button"
                    onClick={() =>
                      setIsStatusMenuOpen((currentValue) => !currentValue)
                    }
                  >
                    <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
                    {statusFilter !== 'all' ? (
                      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
                    ) : null}
                  </button>
                  {isStatusMenuOpen ? (
                    <div
                      className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-[12.5rem] overflow-hidden rounded-[1.2rem] border border-slate-200/80 bg-white/95 p-1.5 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] backdrop-blur"
                      id="patient-conversation-status-menu"
                      role="menu"
                    >
                      <div className="px-2.5 pb-2 pt-1">
                        <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-primary/75">
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
                                'flex w-full items-center justify-between rounded-[0.85rem] px-2.5 py-2 text-left text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                                isSelected
                                  ? 'bg-primary text-white shadow-[0_14px_30px_-20px_rgba(22,78,99,0.9)]'
                                  : 'bg-slate-50/70 text-ink hover:bg-slate-100',
                              )}
                              role="menuitemradio"
                              type="button"
                              onClick={() => {
                                setStatusFilter(option.value);
                                setIsStatusMenuOpen(false);
                                setIsMobileThreadOpen(false);
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
              </div>
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden px-1.5 py-1.5 sm:px-2 lg:grid lg:grid-cols-[minmax(13.5rem,16rem)_minmax(0,1fr)] xl:grid-cols-[minmax(15rem,17.5rem)_minmax(0,1fr)]">
          <SurfaceCard
            className={classNames(
              'min-h-0 flex-1 border border-slate-200/80 bg-white shadow-none lg:h-full lg:shrink',
              isMobileThreadOpen && 'hidden lg:block',
            )}
            paddingClassName="p-0"
          >
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex shrink-0 items-center justify-between gap-1.5 border-b border-slate-200/80 px-2.5 py-1.5">
                <div className="min-w-0">
                  <h3 className="font-headline text-[0.82rem] font-extrabold tracking-tight text-ink">
                    Chats
                  </h3>
                  <p className="text-[0.62rem] leading-tight text-ink-muted">
                    Selecciona un estudiante.
                  </p>
                </div>
              </div>
              <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
                {filteredConversations.length > 0 ? (
                  <div className="space-y-2">
                    {filteredConversations.map((conversation) => {
                      const lastMessage = getLastMessage(conversation);
                      const isSelected =
                        selectedConversation?.id === conversation.id;
                      const studentInitials = getStudentInitials(
                        conversation.studentName,
                      );

                      return (
                        <button
                          key={conversation.id}
                          aria-current={isSelected ? 'true' : undefined}
                          className={classNames(
                            'w-full rounded-[0.95rem] border px-2.5 py-2 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                            isSelected
                              ? 'border-primary/35 bg-primary/[0.08] shadow-[0_18px_40px_-28px_rgba(22,78,99,0.65)]'
                              : 'border-slate-200/80 bg-slate-50 hover:border-primary/20 hover:bg-slate-100/70',
                          )}
                          data-testid={`patient-conversation-card-${conversation.id}`}
                          type="button"
                          onClick={() => {
                            setSearchParams(
                              { conversation: conversation.id },
                              { replace: true },
                            );
                            setIsMobileThreadOpen(true);
                          }}
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[0.74rem] font-extrabold text-primary ring-1 ring-primary/10">
                              {studentInitials}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="truncate text-[0.78rem] font-semibold leading-tight text-ink">
                                  {conversation.studentName}
                                </p>
                                {conversation.unreadCount > 0 ? (
                                  <span className="inline-flex min-w-[1.1rem] shrink-0 items-center justify-center rounded-full bg-primary px-1 py-0.5 text-[0.52rem] font-bold leading-none text-white">
                                    {conversation.unreadCount}
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 line-clamp-1 break-words text-[0.7rem] leading-4 text-ink-muted">
                                {lastMessage?.content ??
                                  'Sin mensajes todavia.'}
                              </p>
                              <div className="mt-1 flex items-center justify-end gap-1.5">
                                <span className="text-[0.6rem] font-medium leading-none text-ink-muted">
                                  {lastMessage
                                    ? formatTime(lastMessage.sentAt)
                                    : 'Sin hora'}
                                </span>
                              </div>
                            </div>
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
          <SurfaceCard
            className={classNames(
              'min-h-0 flex-1 border border-slate-200/80 bg-white shadow-none lg:h-full',
              !isMobileThreadOpen && 'hidden lg:block',
            )}
            paddingClassName="p-0"
          >
            {selectedConversation ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="shrink-0 border-b border-slate-200/80 px-2.5 py-1.5 sm:px-3">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <button
                        aria-label="Volver a la lista de chats"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-ink transition duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 lg:hidden"
                        type="button"
                        onClick={() => setIsMobileThreadOpen(false)}
                      >
                        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                      </button>
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <h2 className="truncate font-headline text-[0.84rem] font-extrabold tracking-tight text-ink sm:text-[0.9rem]">
                            {selectedConversation.studentName}
                          </h2>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className="admin-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2.5 py-2 sm:px-3"
                  data-testid={`patient-conversation-thread-${selectedConversation.id}`}
                >
                  {visibleSelectedMessages.map((message) => {
                    const isPatientAuthor = message.author === 'PACIENTE';

                    return (
                      <div
                        key={message.id}
                        className={classNames(
                          'flex',
                          isPatientAuthor ? 'justify-end' : 'justify-start',
                        )}
                      >
                        <div
                          className={classNames(
                            'max-w-[88%] rounded-[0.85rem] px-2.5 py-1.5 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.35)] sm:max-w-[72%]',
                            isPatientAuthor
                              ? 'bg-brand-gradient text-white'
                              : 'bg-slate-100 text-ink',
                          )}
                        >
                          <p
                            className={classNames(
                              'text-[0.5rem] font-bold uppercase tracking-[0.1em]',
                              isPatientAuthor
                                ? 'text-white/70'
                                : 'text-primary/75',
                            )}
                          >
                            {message.authorName}
                          </p>
                          <p className="mt-0.5 break-words text-[0.7rem] leading-4">
                            {message.content}
                          </p>
                          <p
                            className={classNames(
                              'mt-1 text-[0.54rem] font-medium leading-none',
                              isPatientAuthor
                                ? 'text-white/75'
                                : 'text-ink-muted',
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
                <div className="shrink-0 border-t border-slate-200/80 px-2.5 py-1.5 sm:px-3">
                  {selectedConversation.status === 'ACTIVA' ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="min-w-0 flex-1">
                          <label
                            className="sr-only"
                            htmlFor="patient-conversation-message"
                          >
                            Mensaje para el estudiante
                          </label>
                          <textarea
                            aria-describedby={
                              composerError
                                ? 'patient-conversation-message-error'
                                : undefined
                            }
                            aria-invalid={Boolean(composerError)}
                            className={classNames(
                              'student-conversation-composer-textarea h-10 min-h-[2.5rem] w-full resize-none rounded-[0.85rem] border bg-surface px-2.5 py-1 text-[0.7rem] text-ink placeholder:text-ghost/80 transition duration-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                              composerError
                                ? 'border-rose-300 focus-visible:border-rose-400 focus-visible:ring-rose-200/70'
                                : 'border-slate-200 focus-visible:border-primary',
                            )}
                            id="patient-conversation-message"
                            placeholder="Escribe un mensaje..."
                            rows={1}
                            value={composerValue}
                            onChange={(event) => {
                              setComposerValue(event.target.value);
                              setComposerError(null);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                handleSendMessage();
                              }
                            }}
                          />
                          {composerError ? (
                            <p
                              className="text-[0.62rem] text-rose-600"
                              id="patient-conversation-message-error"
                            >
                              {composerError}
                            </p>
                          ) : null}
                        </div>
                        <button
                          aria-label={
                            patientContent.conversationsPage.actionLabels
                              .sendMessage
                          }
                          className="student-conversation-send-button inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white shadow-ambient transition duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/12"
                          disabled={isLoading}
                          type="button"
                          onClick={handleSendMessage}
                        >
                          <SendHorizontal
                            aria-hidden="true"
                            className="h-4 w-4"
                          />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[1.25rem] border border-amber-200/80 bg-amber-50/75 px-4 py-3 text-sm text-amber-800">
                      <div className="flex items-center gap-2">
                        <LockKeyhole
                          aria-hidden="true"
                          className="h-4.5 w-4.5"
                        />
                        <p className="font-medium">
                          {selectedConversation.status === 'SOLO_LECTURA'
                            ? 'Esta conversacion sigue visible solo para consulta, pero ya no permite nuevos mensajes.'
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
