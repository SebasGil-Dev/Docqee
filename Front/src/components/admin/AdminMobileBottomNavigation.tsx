import {
  Badge,
  Building2,
  GraduationCap,
  KeyRound,
  LogOut,
  Upload,
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
  'graduation-cap': GraduationCap,
  'key-round': KeyRound,
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
  icon: LucideIcon;
  isActive?: boolean;
};

function ActionContent({ icon: Icon, isActive = false }: ActionContentProps) {
  return (
    <span
      className={classNames(
        'inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-200',
        isActive ? 'bg-primary/10 text-primary' : 'bg-white/12 text-white',
      )}
    >
      <Icon aria-hidden="true" className="h-4.5 w-4.5 shrink-0" />
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

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-2 pb-2 [padding-bottom:calc(env(safe-area-inset-bottom)+0.5rem)] lg:hidden">
      <nav
        aria-label="Navegacion inferior administrativa"
        className="w-full rounded-[1.35rem] bg-primary p-1.5 shadow-[0_-10px_28px_rgba(0,100,124,0.2)]"
      >
        <div className="grid grid-cols-3 gap-1">
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
                <ActionContent icon={Icon} isActive={isActive} />
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
            <ActionContent icon={LogOut} />
          </button>
        </div>
      </nav>
    </div>
  );
}
