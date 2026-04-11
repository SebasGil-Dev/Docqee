import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import {
  Badge,
  Building2,
  CalendarCheck2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  House,
  KeyRound,
  LogOut,
  MessageSquareMore,
  Presentation,
  Search,
  Stethoscope,
  Upload,
  UserRound,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { useAuth } from '@/app/providers/AuthProvider';
import { AdminMobileBottomNavigation } from '@/components/admin/AdminMobileBottomNavigation';
import { LogoMark } from '@/components/ui/LogoMark';
import { ROUTES } from '@/constants/routes';
import { adminContent } from '@/content/adminContent';
import type {
  AdminShellContent,
  AdminShellNavigationIcon,
} from '@/content/types';
import { classNames } from '@/lib/classNames';

type AdminShellProps = PropsWithChildren<{
  avatarSrc?: string | null;
  content?: AdminShellContent;
  overrideName?: { firstName: string; lastName: string };
}>;

const SIDEBAR_STATE_STORAGE_KEY = 'docqee-admin-sidebar-collapsed';
const MOBILE_ADMIN_MEDIA_QUERY = '(max-width: 1023px)';

const navigationIcons: Record<AdminShellNavigationIcon, typeof Building2> = {
  badge: Badge,
  building2: Building2,
  'calendar-check-2': CalendarCheck2,
  'calendar-days': CalendarDays,
  'clipboard-list': ClipboardList,
  'graduation-cap': GraduationCap,
  house: House,
  'key-round': KeyRound,
  'message-square-more': MessageSquareMore,
  presentation: Presentation,
  search: Search,
  stethoscope: Stethoscope,
  'user-round': UserRound,
  upload: Upload,
};

function isNavigationItemActive(
  targetPath: string,
  pathname: string,
  matchPrefix?: string,
) {
  return pathname.startsWith(matchPrefix ?? targetPath);
}

function getStoredSidebarState() {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(SIDEBAR_STATE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function getInitialMobileViewportState() {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false;
  }

  return window.matchMedia(MOBILE_ADMIN_MEDIA_QUERY).matches;
}

function useIsMobileViewport() {
  const [isMobileViewport, setIsMobileViewport] = useState(
    getInitialMobileViewportState,
  );

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return undefined;
    }

    const mediaQueryList = window.matchMedia(MOBILE_ADMIN_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
    };

    setIsMobileViewport(mediaQueryList.matches);

    mediaQueryList.addEventListener('change', handleChange);

    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, []);

  return isMobileViewport;
}

function formatNamePart(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('es-CO')
    .split('-')
    .map((part) =>
      part.length > 0
        ? `${part.charAt(0).toLocaleUpperCase('es-CO')}${part.slice(1)}`
        : part,
    )
    .join('-');
}

function formatDisplayName(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(formatNamePart)
    .join(' ');
}

export function AdminShell({
  avatarSrc,
  children,
  content = adminContent.shell,
  overrideName,
}: AdminShellProps) {
  const { logout, session } = useAuth();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    getStoredSidebarState,
  );
  const isMobileViewport = useIsMobileViewport();
  const adminFirstName = overrideName?.firstName || session?.user.firstName || content.adminUser.firstName;
  const adminLastName = overrideName?.lastName || session?.user.lastName || content.adminUser.lastName;
  const adminInitials =
    `${adminFirstName.charAt(0)}${adminLastName.charAt(0)}`.toUpperCase();
  const adminFullName = formatDisplayName(`${adminFirstName} ${adminLastName}`);
  const sidebarToggleLabel = isSidebarCollapsed
    ? 'Abrir menu lateral'
    : 'Cerrar menu lateral';
  const homePath = content.homePath ?? ROUTES.home;
  const showMobileBottomNavigation = isMobileViewport;

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SIDEBAR_STATE_STORAGE_KEY,
        String(isSidebarCollapsed),
      );
    } catch {
      // Ignore storage write failures and keep the UI interactive.
    }
  }, [isSidebarCollapsed]);

  return (
    <div className="admin-shell-density relative h-screen overflow-hidden bg-[#f4f8ff]">
      <a className="skip-link" href="#admin-main-content">
        Saltar al contenido principal
      </a>
      <div className="relative z-10 mx-auto flex h-full max-w-[98rem] flex-col px-4 py-4 sm:px-6 lg:px-5 lg:py-3 xl:px-7">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-[2.25rem] bg-[#f4f8ff] p-1 sm:p-1.5 lg:gap-3">
          <header className="overflow-hidden rounded-[1.5rem] bg-[#ffffff] px-4 py-2 shadow-ambient backdrop-blur-sm sm:px-5 sm:py-2.5 lg:px-5 lg:py-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="-translate-y-0.5 min-w-0">
                <Link
                  aria-label="Volver al inicio"
                  className="flex w-fit items-center gap-2.5"
                  to={homePath}
                >
                  <LogoMark compact size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-headline text-[0.96rem] font-extrabold leading-none tracking-tight text-ink sm:text-[1rem]">
                      Docqee
                    </p>
                    <p className="mt-[0.2rem] truncate whitespace-nowrap text-[0.58rem] font-extrabold uppercase leading-none tracking-[0.16em] text-primary sm:text-[0.62rem] sm:tracking-[0.18em]">
                      <span className="sm:hidden">{content.mobileTitle ?? content.title}</span>
                      <span className="hidden sm:inline">{content.title}</span>
                    </p>
                  </div>
                </Link>
              </div>
              <div className="inline-flex max-w-full items-center gap-2 self-start sm:self-center">
                {avatarSrc ? (
                  <img
                    alt={adminFullName}
                    className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-primary/20 sm:h-8 sm:w-8"
                    src={avatarSrc}
                  />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[0.8rem] font-extrabold uppercase tracking-[0.12em] text-white sm:h-8 sm:w-8 sm:text-[0.72rem]">
                    {adminInitials}
                  </span>
                )}
                <p className="hidden truncate text-[0.78rem] font-semibold text-ink sm:block sm:text-[0.82rem]">
                  {adminFullName}
                </p>
              </div>
            </div>
          </header>
          <div
            className={classNames(
              'flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row lg:items-stretch',
              showMobileBottomNavigation ? 'gap-0 lg:gap-4' : 'gap-4',
            )}
          >
            {!showMobileBottomNavigation ? (
              <aside
                className={classNames(
                  'min-h-0 w-full overflow-hidden transition-[max-height,opacity,width] duration-300 ease-out lg:shrink-0',
                  isSidebarCollapsed
                    ? 'max-h-[4.75rem] opacity-100 lg:max-h-none lg:w-[5.25rem]'
                    : 'max-h-[32rem] opacity-100 lg:max-h-none lg:w-[17rem] xl:w-[17.5rem]',
                )}
                id="admin-sidebar"
              >
                <div
                  className={classNames(
                    'flex h-full flex-col overflow-hidden rounded-[2rem] bg-[#ffffff] shadow-none transition-[padding,background-color,box-shadow] duration-300 lg:h-full',
                    isSidebarCollapsed ? 'p-4 lg:p-3' : 'p-5 sm:p-6 lg:p-4.5 xl:p-5',
                  )}
                >
                  <div
                    className={classNames(
                      'relative flex items-center justify-center transition-all duration-200',
                    )}
                  >
                    <span
                      className={classNames(
                        'text-center text-[0.68rem] font-bold uppercase tracking-[0.18em] text-ink-muted transition-[max-width,opacity] duration-200',
                        isSidebarCollapsed
                          ? 'max-w-0 opacity-0'
                          : 'max-w-[9rem] opacity-100',
                      )}
                    >
                      MENÚ
                    </span>
                    <button
                      aria-controls="admin-sidebar-navigation"
                      aria-expanded={!isSidebarCollapsed}
                      aria-label={sidebarToggleLabel}
                      className={classNames(
                        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-ink-muted transition-colors duration-200 hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/12',
                        isSidebarCollapsed
                          ? 'absolute left-1/2 -translate-x-1/2'
                          : 'absolute right-0',
                      )}
                      title={sidebarToggleLabel}
                      type="button"
                      onClick={() =>
                        setIsSidebarCollapsed((currentValue) => !currentValue)
                      }
                    >
                      {isSidebarCollapsed ? (
                        <ChevronRight
                          aria-hidden="true"
                          className="h-4.5 w-4.5"
                        />
                      ) : (
                        <ChevronLeft
                          aria-hidden="true"
                          className="h-4.5 w-4.5"
                        />
                      )}
                    </button>
                  </div>
                  <nav
                    aria-label="Navegacion administrativa"
                    className={classNames(
                      'space-y-2 transition-all duration-200',
                      isSidebarCollapsed
                        ? 'mt-0 hidden lg:mt-4 lg:block'
                        : 'mt-4',
                    )}
                    id="admin-sidebar-navigation"
                  >
                    {content.navigation.map((item) => {
                      const Icon = navigationIcons[item.icon];
                      const isActive = isNavigationItemActive(
                        item.to,
                        location.pathname,
                        item.matchPrefix,
                      );

                      return (
                        <Link
                          aria-current={isActive ? 'page' : undefined}
                          key={item.to}
                          className={classNames(
                            'flex items-center rounded-2xl text-sm font-semibold transition-all duration-200',
                            isSidebarCollapsed
                              ? 'justify-center px-0 py-2.5'
                              : 'gap-3 px-4 py-2.5',
                            isActive
                              ? 'bg-primary text-white shadow-ambient'
                              : 'text-ink-muted hover:bg-surface hover:text-primary',
                          )}
                          title={isSidebarCollapsed ? item.label : undefined}
                          to={item.to}
                        >
                          <Icon
                            aria-hidden="true"
                            className="h-4.5 w-4.5 shrink-0"
                          />
                          <span
                            className={classNames(
                              'truncate transition-[max-width,opacity] duration-200',
                              isSidebarCollapsed
                                ? 'lg:max-w-0 lg:opacity-0'
                                : 'lg:max-w-[12rem] lg:opacity-100',
                            )}
                          >
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </nav>
                  <div
                    className={classNames(
                      'mt-auto transition-all duration-200',
                      isSidebarCollapsed
                        ? 'hidden pt-0 lg:block lg:pt-4'
                        : 'block pt-4',
                    )}
                  >
                    <Link
                      className={classNames(
                        'flex items-center rounded-2xl text-sm font-semibold text-ink-muted transition-all duration-200 hover:bg-surface hover:text-primary',
                        isSidebarCollapsed
                          ? 'justify-center px-0 py-2.5'
                          : 'gap-3 px-4 py-2.5',
                      )}
                      title={
                        isSidebarCollapsed ? content.logoutCta.label : undefined
                      }
                      to={content.logoutCta.to}
                      onClick={() => logout()}
                    >
                      <LogOut
                        aria-hidden="true"
                        className="h-4.5 w-4.5 shrink-0"
                      />
                      <span
                        className={classNames(
                          'truncate transition-[max-width,opacity] duration-200',
                          isSidebarCollapsed
                            ? 'lg:max-w-0 lg:opacity-0'
                            : 'lg:max-w-[12rem] lg:opacity-100',
                        )}
                      >
                        {content.logoutCta.label}
                      </span>
                    </Link>
                  </div>
                </div>
              </aside>
            ) : null}
            <div className="min-h-0 min-w-0 flex-1 transition-[width] duration-300">
              <main
                className={classNames(
                  'h-full overflow-y-auto pt-1 lg:pt-0',
                  showMobileBottomNavigation && 'pb-[7.75rem]',
                )}
                id="admin-main-content"
                tabIndex={-1}
              >
                {children}
              </main>
            </div>
          </div>
        </div>
      </div>
      {showMobileBottomNavigation ? (
        <AdminMobileBottomNavigation
          activePathname={location.pathname}
          items={content.navigation}
          logoutLabel={content.logoutCta.label}
          logoutTo={content.logoutCta.to}
          onLogout={logout}
        />
      ) : null}
    </div>
  );
}
