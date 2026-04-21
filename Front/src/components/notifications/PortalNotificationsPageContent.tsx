import { Bell, CheckCheck, Circle, ExternalLink } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import type { PortalNotification } from '@/content/types';
import { classNames } from '@/lib/classNames';

type PortalNotificationsPageContentProps = {
  compact?: boolean;
  description: string;
  emptyState: string;
  isLoading?: boolean;
  markAllReadLabel: string;
  markReadLabel: string;
  notifications: PortalNotification[];
  onMarkAllRead: () => void;
  onMarkRead: (notificationId: string) => void;
  selectedNotificationId: string | null;
  title: string;
  unreadLabel: string;
  viewDetailLabel: string;
};

function formatNotificationDate(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsedDate);
}

function getToneClasses(notification: PortalNotification) {
  switch (notification.tone) {
    case 'danger':
      return 'bg-rose-50 text-rose-700 ring-rose-200';
    case 'success':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'warning':
      return 'bg-amber-50 text-amber-700 ring-amber-200';
    default:
      return 'bg-primary/10 text-primary ring-primary/15';
  }
}

export function PortalNotificationsPageContent({
  compact = false,
  description,
  emptyState,
  isLoading = false,
  markAllReadLabel,
  markReadLabel,
  notifications,
  onMarkAllRead,
  onMarkRead,
  selectedNotificationId,
  title,
  unreadLabel,
  viewDetailLabel,
}: PortalNotificationsPageContentProps) {
  const unreadCount = notifications.filter(
    (notification) => notification.isRead !== true,
  ).length;

  useEffect(() => {
    if (
      !selectedNotificationId ||
      !notifications.some(
        (notification) => notification.id === selectedNotificationId,
      )
    ) {
      return;
    }

    onMarkRead(selectedNotificationId);

    if (typeof document === 'undefined') {
      return;
    }

    const selectedElement = document.getElementById(
      `portal-notification-${selectedNotificationId}`,
    );

    if (typeof selectedElement?.scrollIntoView === 'function') {
      selectedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [notifications, onMarkRead, selectedNotificationId]);

  return (
    <div
      className={classNames(
        'mx-auto flex h-full max-w-[88rem] min-h-0 flex-col overflow-hidden 2xl:max-w-[96rem]',
        compact ? 'gap-3' : 'gap-4',
      )}
    >
      <AdminPageHeader
        action={
          <button
            className={classNames(
              'inline-flex items-center gap-2 rounded-full font-semibold transition duration-200',
              compact ? 'px-3.5 py-2 text-[0.84rem]' : 'px-4 py-2.5 text-sm',
              unreadCount > 0
                ? 'bg-primary text-white shadow-ambient hover:brightness-110'
                : 'cursor-not-allowed bg-slate-200 text-slate-500',
            )}
            disabled={unreadCount === 0}
            type="button"
            onClick={onMarkAllRead}
          >
            <CheckCheck aria-hidden="true" className="h-4 w-4" />
            <span>{markAllReadLabel}</span>
          </button>
        }
        description={description}
        title={title}
      />
      <div className={classNames('grid md:grid-cols-2', compact ? 'gap-2.5' : 'gap-3')}>
        <SurfaceCard className="min-w-0 overflow-hidden bg-brand-gradient text-white" paddingClassName="p-0">
          <div className={classNames('flex items-center gap-3', compact ? 'px-3.5 py-2.5' : 'px-4 py-3')}>
            <span
              className={classNames(
                'inline-flex shrink-0 items-center justify-center rounded-[1rem] bg-white/12 text-white ring-1 ring-white/18',
                compact ? 'h-8 w-8' : 'h-9 w-9',
              )}
            >
              <Bell aria-hidden="true" className={compact ? 'h-4 w-4' : 'h-4.5 w-4.5'} />
            </span>
            <div>
              <p
                className={classNames(
                  'font-headline font-extrabold tracking-tight text-white',
                  compact ? 'text-[1.35rem]' : 'text-[1.55rem]',
                )}
              >
                {unreadCount}
              </p>
              <p className={compact ? 'text-[0.82rem] font-semibold text-white/90' : 'text-sm font-semibold text-white/90'}>
                Notificaciones sin leer
              </p>
            </div>
          </div>
        </SurfaceCard>
        <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-0">
          <div className={classNames('flex items-center gap-3', compact ? 'px-3.5 py-2.5' : 'px-4 py-3')}>
            <span
              className={classNames(
                'inline-flex shrink-0 items-center justify-center rounded-[1rem] bg-primary/10 text-primary ring-1 ring-primary/10',
                compact ? 'h-8 w-8' : 'h-9 w-9',
              )}
            >
              <CheckCheck aria-hidden="true" className={compact ? 'h-4 w-4' : 'h-4.5 w-4.5'} />
            </span>
            <div>
              <p
                className={classNames(
                  'font-headline font-extrabold tracking-tight text-ink',
                  compact ? 'text-[1.35rem]' : 'text-[1.55rem]',
                )}
              >
                {notifications.length}
              </p>
              <p className={compact ? 'text-[0.82rem] font-semibold text-ink-muted' : 'text-sm font-semibold text-ink-muted'}>
                Total de notificaciones
              </p>
            </div>
          </div>
        </SurfaceCard>
      </div>
      <AdminPanelCard className="flex-1" panelClassName="bg-[#f4f8ff]">
        {notifications.length > 0 ? (
          <div
            className={classNames(
              'admin-scrollbar min-h-0 flex-1 overflow-y-auto',
              compact ? 'p-3 sm:p-4' : 'p-4 sm:p-5',
            )}
          >
            <div className={compact ? 'space-y-2.5' : 'space-y-3'}>
              {notifications.map((notification) => (
                <div
                  className={classNames(
                    'rounded-[1.5rem] border transition duration-200',
                    compact ? 'p-3.5' : 'p-4',
                    notification.isRead
                      ? 'border-slate-200/80 bg-white'
                      : 'border-primary/15 bg-primary/[0.045]',
                    selectedNotificationId === notification.id &&
                      'ring-2 ring-primary/20',
                  )}
                  data-testid={`portal-notification-card-${notification.id}`}
                  id={`portal-notification-${notification.id}`}
                  key={notification.id}
                >
                  <div className={classNames('flex flex-col sm:flex-row sm:items-start sm:justify-between', compact ? 'gap-2.5' : 'gap-3')}>
                    <div className={classNames('min-w-0', compact ? 'space-y-1.5' : 'space-y-2')}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={classNames(
                            'inline-flex items-center justify-center rounded-full ring-1',
                            compact ? 'h-6 w-6' : 'h-7 w-7',
                            getToneClasses(notification),
                          )}
                        >
                          <Circle
                            aria-hidden="true"
                            className={classNames('fill-current', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')}
                          />
                        </span>
                        <h3 className={compact ? 'text-[0.92rem] font-semibold text-ink' : 'text-base font-semibold text-ink'}>
                          {notification.title}
                        </h3>
                        {notification.isRead ? null : (
                          <span
                            className={classNames(
                              'inline-flex rounded-full bg-amber-50 font-semibold text-amber-700 ring-1 ring-amber-200',
                              compact ? 'px-2 py-0.5 text-[0.62rem]' : 'px-2.5 py-1 text-[0.68rem]',
                            )}
                          >
                            {unreadLabel}
                          </span>
                        )}
                      </div>
                      <p className={compact ? 'text-[0.82rem] leading-5 text-ink-muted' : 'text-sm leading-6 text-ink-muted'}>
                        {notification.description}
                      </p>
                    </div>
                    <p className={compact ? 'shrink-0 text-[0.72rem] font-medium text-ink-muted' : 'shrink-0 text-[0.78rem] font-medium text-ink-muted'}>
                      {formatNotificationDate(notification.createdAt)}
                    </p>
                  </div>
                  <div className={classNames('flex flex-wrap items-center gap-2', compact ? 'mt-3' : 'mt-4')}>
                    {notification.isRead ? (
                      <span
                        className={classNames(
                          'inline-flex items-center gap-2 rounded-full bg-slate-100 font-semibold text-slate-700',
                          compact ? 'px-2.5 py-1 text-[0.72rem]' : 'px-3 py-1.5 text-xs',
                        )}
                      >
                        <CheckCheck aria-hidden="true" className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
                        <span>Leida</span>
                      </span>
                    ) : (
                      <button
                        className={classNames(
                          'inline-flex items-center gap-2 rounded-full bg-primary/10 font-semibold text-primary transition duration-200 hover:bg-primary/15',
                          compact ? 'px-2.5 py-1 text-[0.72rem]' : 'px-3 py-1.5 text-xs',
                        )}
                        type="button"
                        onClick={() => onMarkRead(notification.id)}
                      >
                        <CheckCheck aria-hidden="true" className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
                        <span>{markReadLabel}</span>
                      </button>
                    )}
                    {notification.to ? (
                      <Link
                        className={classNames(
                          'inline-flex items-center gap-2 rounded-full bg-slate-100 font-semibold text-slate-700 transition duration-200 hover:bg-slate-200',
                          compact ? 'px-2.5 py-1 text-[0.72rem]' : 'px-3 py-1.5 text-xs',
                        )}
                        to={notification.to}
                        onClick={() => onMarkRead(notification.id)}
                      >
                        <ExternalLink aria-hidden="true" className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
                        <span>{viewDetailLabel}</span>
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            className={classNames(
              'flex min-h-0 flex-1 items-center justify-center text-center',
              compact ? 'px-3.5 py-8 sm:px-4' : 'px-4 py-10 sm:px-5',
            )}
          >
            <p className={compact ? 'text-[0.82rem] font-medium text-ink-muted' : 'text-sm font-medium text-ink-muted'}>
              {isLoading ? 'Cargando notificaciones...' : emptyState}
            </p>
          </div>
        )}
      </AdminPanelCard>
    </div>
  );
}
