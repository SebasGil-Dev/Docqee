import { Bell, CheckCheck, Circle, ExternalLink } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import type { PortalNotification } from '@/content/types';
import { classNames } from '@/lib/classNames';

type PortalNotificationsPageContentProps = {
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
    <div className="mx-auto flex h-full max-w-[88rem] min-h-0 flex-col gap-4 overflow-hidden 2xl:max-w-[96rem]">
      <AdminPageHeader
        action={
          <button
            className={classNames(
              'inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition duration-200',
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
      <div className="grid gap-3 md:grid-cols-2">
        <SurfaceCard className="min-w-0 overflow-hidden bg-brand-gradient text-white" paddingClassName="p-0">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-white/12 text-white ring-1 ring-white/18">
              <Bell aria-hidden="true" className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="font-headline text-[1.55rem] font-extrabold tracking-tight text-white">
                {unreadCount}
              </p>
              <p className="text-sm font-semibold text-white/90">Notificaciones sin leer</p>
            </div>
          </div>
        </SurfaceCard>
        <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-0">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-primary/10 text-primary ring-1 ring-primary/10">
              <CheckCheck aria-hidden="true" className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="font-headline text-[1.55rem] font-extrabold tracking-tight text-ink">
                {notifications.length}
              </p>
              <p className="text-sm font-semibold text-ink-muted">Total de notificaciones</p>
            </div>
          </div>
        </SurfaceCard>
      </div>
      <AdminPanelCard className="flex-1" panelClassName="bg-[#f4f8ff]">
        {notifications.length > 0 ? (
          <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  className={classNames(
                    'rounded-[1.5rem] border p-4 transition duration-200',
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
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={classNames(
                            'inline-flex h-7 w-7 items-center justify-center rounded-full ring-1',
                            getToneClasses(notification),
                          )}
                        >
                          <Circle aria-hidden="true" className="h-3.5 w-3.5 fill-current" />
                        </span>
                        <h3 className="text-base font-semibold text-ink">
                          {notification.title}
                        </h3>
                        {notification.isRead ? null : (
                          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[0.68rem] font-semibold text-amber-700 ring-1 ring-amber-200">
                            {unreadLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-6 text-ink-muted">
                        {notification.description}
                      </p>
                    </div>
                    <p className="shrink-0 text-[0.78rem] font-medium text-ink-muted">
                      {formatNotificationDate(notification.createdAt)}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {notification.isRead ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                        <CheckCheck aria-hidden="true" className="h-3.5 w-3.5" />
                        <span>Leida</span>
                      </span>
                    ) : (
                      <button
                        className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition duration-200 hover:bg-primary/15"
                        type="button"
                        onClick={() => onMarkRead(notification.id)}
                      >
                        <CheckCheck aria-hidden="true" className="h-3.5 w-3.5" />
                        <span>{markReadLabel}</span>
                      </button>
                    )}
                    {notification.to ? (
                      <Link
                        className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition duration-200 hover:bg-slate-200"
                        to={notification.to}
                        onClick={() => onMarkRead(notification.id)}
                      >
                        <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                        <span>{viewDetailLabel}</span>
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-10 text-center sm:px-5">
            <p className="text-sm font-medium text-ink-muted">
              {isLoading ? 'Cargando notificaciones...' : emptyState}
            </p>
          </div>
        )}
      </AdminPanelCard>
    </div>
  );
}
