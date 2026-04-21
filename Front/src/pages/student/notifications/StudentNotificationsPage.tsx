import { useSearchParams } from 'react-router-dom';

import { PortalNotificationsPageContent } from '@/components/notifications/PortalNotificationsPageContent';
import { Seo } from '@/components/ui/Seo';
import { studentContent } from '@/content/studentContent';
import { useStudentPortalNotifications } from '@/lib/portalNotifications';
import { useStudentModuleStore } from '@/lib/studentModuleStore';

export function StudentNotificationsPage() {
  const [searchParams] = useSearchParams();
  const { appointments, conversations, isLoading, requests } = useStudentModuleStore();
  const {
    markAllNotificationsAsRead,
    markNotificationAsRead,
    notifications,
  } = useStudentPortalNotifications({
    appointments,
    conversations,
    requests,
  });

  return (
    <>
      <Seo
        description={studentContent.notificationsPage.meta.description}
        noIndex
        title={studentContent.notificationsPage.meta.title}
      />
      <div className="student-page-compact flex h-full min-h-0 flex-col overflow-hidden">
        <PortalNotificationsPageContent
          compact
          description={studentContent.notificationsPage.description}
          emptyState={studentContent.notificationsPage.emptyState}
          isLoading={isLoading}
          markAllReadLabel={studentContent.notificationsPage.markAllReadLabel}
          markReadLabel={studentContent.notificationsPage.markReadLabel}
          notifications={notifications}
          onMarkAllRead={markAllNotificationsAsRead}
          onMarkRead={markNotificationAsRead}
          selectedNotificationId={searchParams.get('notification')}
          title={studentContent.notificationsPage.title}
          unreadLabel={studentContent.notificationsPage.unreadLabel}
          viewDetailLabel={studentContent.notificationsPage.viewDetailLabel}
        />
      </div>
    </>
  );
}
