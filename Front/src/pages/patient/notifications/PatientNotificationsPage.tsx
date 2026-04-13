import { useSearchParams } from 'react-router-dom';

import { PortalNotificationsPageContent } from '@/components/notifications/PortalNotificationsPageContent';
import { Seo } from '@/components/ui/Seo';
import { patientContent } from '@/content/patientContent';
import { usePatientPortalNotifications } from '@/lib/portalNotifications';
import { usePatientModuleStore } from '@/lib/patientModuleStore';

export function PatientNotificationsPage() {
  const [searchParams] = useSearchParams();
  const { appointments, conversations, isLoading, requests } = usePatientModuleStore();
  const {
    markAllNotificationsAsRead,
    markNotificationAsRead,
    notifications,
  } = usePatientPortalNotifications({
    appointments,
    conversations,
    requests,
  });

  return (
    <>
      <Seo
        description={patientContent.notificationsPage.meta.description}
        noIndex
        title={patientContent.notificationsPage.meta.title}
      />
      <PortalNotificationsPageContent
        description={patientContent.notificationsPage.description}
        emptyState={patientContent.notificationsPage.emptyState}
        isLoading={isLoading}
        markAllReadLabel={patientContent.notificationsPage.markAllReadLabel}
        markReadLabel={patientContent.notificationsPage.markReadLabel}
        notifications={notifications}
        onMarkAllRead={markAllNotificationsAsRead}
        onMarkRead={markNotificationAsRead}
        selectedNotificationId={searchParams.get('notification')}
        title={patientContent.notificationsPage.title}
        unreadLabel={patientContent.notificationsPage.unreadLabel}
        viewDetailLabel={patientContent.notificationsPage.viewDetailLabel}
      />
    </>
  );
}
