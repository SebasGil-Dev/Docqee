import {
  Badge,
  Building2,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  KeyRound,
  LogOut,
  Stethoscope,
  Upload,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import type {
  AdminShellNavigationIcon,
  AdminShellNavigationItem,
} from '@/content/types';
import { classNames } from '@/lib/classNames';

type AdminMobileBottomNavigationProps = {
  activePathname: string;
  items: readonly AdminShellNavigationItem[];
  logoutLabel: string;
  logoutTo: `/${string}`;
  onLogout: () => void;
};

const navigationIcons: Record<AdminShellNavigationIcon, LucideIcon> = {
  badge: Badge,
  building2: Building2,
  'calendar-days': CalendarDays,
  'clipboard-list': ClipboardList,
  'graduation-cap': GraduationCap,
  'key-round': KeyRound,
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

type ActionContentProps = {
  compact?: boolean;
  icon: LucideIcon;
  isActive?: boolean;
};

function ActionContent({
  compact = false,
  icon: Icon,
  isActive = false,
}: ActionContentProps) {
  return (
    <span
      className={classNames(
        'inline-flex items-center justify-center rounded-full transition-colors duration-200',
        compact ? 'h-8 w-8' : 'h-9 w-9',
        isActive ? 'bg-primary/10 text-primary' : 'bg-white/12 text-white',
      )}
    >
      <Icon aria-hidden="true" className={classNames('shrink-0', compact ? 'h-4 w-4' : 'h-4.5 w-4.5')} />
    </span>
  );
}

export function AdminMobileBottomNavigation({
  activePathname,
  items,
  logoutLabel,
  logoutTo,
  onLogout,
}: AdminMobileBottomNavigationProps) {
  const navigate = useNavigate();
  const totalActions = items.length + 1;
  const isCompact = totalActions > 4;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-2 pb-2 [padding-bottom:calc(env(safe-area-inset-bottom)+0.5rem)] lg:hidden">
      <nav
        aria-label="Navegacion inferior administrativa"
        className="w-full rounded-[1.35rem] bg-primary p-1.5 shadow-[0_-10px_28px_rgba(0,100,124,0.2)]"
      >
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${totalActions}, minmax(0, 1fr))` }}
        >
          {items.map((item) => {
            const Icon = navigationIcons[item.icon];
            const isActive = isNavigationItemActive(
              item.to,
              activePathname,
              item.matchPrefix,
            );

            return (
              <Link
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                key={item.to}
                className={classNames(
                  'flex min-w-0 items-center justify-center rounded-[1rem] px-1.5 py-2 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/25',
                  isActive
                    ? 'bg-white text-primary shadow-[0_10px_24px_rgba(255,255,255,0.16)]'
                    : 'text-white/86 hover:bg-white/10 hover:text-white',
                )}
                to={item.to}
              >
                <ActionContent compact={isCompact} icon={Icon} isActive={isActive} />
              </Link>
            );
          })}
          <button
            aria-label={logoutLabel}
            className="flex min-w-0 items-center justify-center rounded-[1rem] px-1.5 py-2 text-center text-white/86 transition-all duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/25"
            type="button"
            onClick={() => {
              onLogout();
              navigate(logoutTo);
            }}
          >
            <ActionContent compact={isCompact} icon={LogOut} />
          </button>
        </div>
      </nav>
    </div>
  );
}
