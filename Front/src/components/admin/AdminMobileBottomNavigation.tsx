import {
  Badge,
  Bell,
  Building2,
  CalendarCheck2,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  House,
  KeyRound,
  MessageSquareMore,
  Presentation,
  Search,
  Stethoscope,
  Upload,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import type {
  AdminShellNavigationIcon,
  AdminShellNavigationItem,
} from '@/content/types';
import { classNames } from '@/lib/classNames';

type AdminMobileBottomNavigationProps = {
  activePathname: string;
  density?: 'regular' | 'compact';
  items: readonly AdminShellNavigationItem[];
  landscapeCompact?: boolean;
};

const navigationIcons: Record<AdminShellNavigationIcon, LucideIcon> = {
  badge: Badge,
  bell: Bell,
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

type ActionContentProps = {
  compact?: boolean;
  icon: LucideIcon;
  isActive?: boolean;
  landscapeCompact?: boolean;
};

function ActionContent({
  compact = false,
  icon: Icon,
  isActive = false,
  landscapeCompact = false,
}: ActionContentProps) {
  return (
    <span
      className={classNames(
        'inline-flex items-center justify-center rounded-full transition-colors duration-200',
        landscapeCompact ? 'h-6 w-6' : compact ? 'h-8 w-8' : 'h-9 w-9',
        isActive ? 'bg-primary/10 text-primary' : 'bg-white/12 text-white',
      )}
    >
      <Icon
        aria-hidden="true"
        className={classNames(
          'shrink-0',
          landscapeCompact
            ? 'h-3.5 w-3.5'
            : compact
              ? 'h-4 w-4'
              : 'h-4.5 w-4.5',
        )}
      />
    </span>
  );
}

export function AdminMobileBottomNavigation({
  activePathname,
  density = 'regular',
  items,
  landscapeCompact = false,
}: AdminMobileBottomNavigationProps) {
  const totalActions = items.length;
  const isCompact = totalActions > 4;
  const isCompactHeight = density === 'compact';

  return (
    <div
      className={classNames(
        'fixed inset-x-0 bottom-0 z-30 lg:hidden',
        landscapeCompact
          ? 'px-1 pb-0.5 [padding-bottom:calc(env(safe-area-inset-bottom)+0.125rem)]'
          : isCompactHeight
            ? 'px-2 pb-1 [padding-bottom:calc(env(safe-area-inset-bottom)+0.25rem)]'
            : 'px-2 pb-2 [padding-bottom:calc(env(safe-area-inset-bottom)+0.5rem)]',
      )}
    >
      <nav
        aria-label="Navegacion inferior administrativa"
        className={classNames(
          'w-full bg-primary shadow-[0_-6px_16px_rgba(0,100,124,0.12)]',
          landscapeCompact
            ? 'rounded-[1rem] p-0.5'
            : isCompactHeight
              ? 'rounded-[1.35rem] p-1'
              : 'rounded-[1.35rem] p-1.5',
        )}
      >
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${totalActions}, minmax(0, 1fr))`,
          }}
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
                  'flex min-w-0 items-center justify-center rounded-[1rem] px-1.5 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/25',
                  landscapeCompact
                    ? 'py-0.5'
                    : isCompactHeight
                      ? 'py-1'
                      : 'py-2',
                  isActive
                    ? 'bg-white text-primary shadow-[0_5px_12px_rgba(255,255,255,0.08)]'
                    : 'text-white/86 hover:bg-white/10 hover:text-white',
                )}
                to={item.to}
              >
                <ActionContent
                  compact={isCompact}
                  icon={Icon}
                  isActive={isActive}
                  landscapeCompact={landscapeCompact}
                />
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
