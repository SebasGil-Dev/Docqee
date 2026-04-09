import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';

import { LogoMark } from '@/components/ui/LogoMark';
import { ROUTES } from '@/constants/routes';
import { classNames } from '@/lib/classNames';

type AuthShellProps = PropsWithChildren<{
  footerClassName?: string;
  headerLogoCompact?: boolean;
  mainClassName?: string;
}>;

export function AuthShell({
  children,
  footerClassName,
  headerLogoCompact = false,
  mainClassName,
}: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-surface">
      <div
        aria-hidden="true"
        className="absolute left-[-8%] top-[20%] h-[18rem] w-[18rem] rounded-full bg-primary-soft/12 blur-[110px] sm:h-[24rem] sm:w-[24rem]"
      />
      <div
        aria-hidden="true"
        className="absolute right-[-10%] top-[8%] h-[20rem] w-[20rem] rounded-full bg-glow/35 blur-[120px] sm:h-[28rem] sm:w-[28rem]"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-[-12%] left-1/2 h-[18rem] w-[18rem] -translate-x-1/2 rounded-full bg-secondary/22 blur-[140px] sm:h-[22rem] sm:w-[22rem]"
      />
      <header className="relative z-10 bg-white/84">
        <div className="mx-auto max-w-layout px-4 py-4 sm:px-6 lg:px-8">
          <Link
            aria-label="Volver al inicio"
            className="flex w-fit items-center justify-center"
            to={ROUTES.home}
          >
            <LogoMark compact={headerLogoCompact} />
          </Link>
        </div>
      </header>
      <main
        className={classNames(
          'relative z-10 flex flex-1 items-center justify-center px-4 py-5 sm:px-6 sm:py-7 lg:px-8',
          mainClassName,
        )}
      >
        {children}
      </main>
      <footer
        className={classNames(
          'relative z-10 px-4 pb-5 pt-2 text-center text-[10px] font-medium uppercase tracking-[0.22em] text-ink-muted/65 sm:text-[11px]',
          footerClassName,
        )}
      >
        {`\u00A9 ${new Date().getFullYear()} Docqee. Atenci\u00F3n odontol\u00F3gica universitaria con tono institucional.`}
      </footer>
    </div>
  );
}

/*

import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';

import { LogoMark } from '@/components/ui/LogoMark';
import { ROUTES } from '@/constants/routes';
import { classNames } from '@/lib/classNames';

type AuthShellProps = PropsWithChildren<{
  mainClassName?: string;
}>;

export function AuthShell({ children, mainClassName }: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-surface">
      <div
        aria-hidden="true"
        className="absolute left-[-8%] top-[20%] h-[18rem] w-[18rem] rounded-full bg-primary-soft/12 blur-[110px] sm:h-[24rem] sm:w-[24rem]"
      />
      <div
        aria-hidden="true"
        className="absolute right-[-10%] top-[8%] h-[20rem] w-[20rem] rounded-full bg-glow/35 blur-[120px] sm:h-[28rem] sm:w-[28rem]"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-[-12%] left-1/2 h-[18rem] w-[18rem] -translate-x-1/2 rounded-full bg-secondary/22 blur-[140px] sm:h-[22rem] sm:w-[22rem]"
      />
      <header className="relative z-10 bg-white/84">
        <div className="mx-auto max-w-layout px-4 py-4 sm:px-6 lg:px-8">
          <Link
            aria-label="Volver al inicio"
            className="flex w-fit items-center justify-center"
            to={ROUTES.home}
          >
            <LogoMark />
          </Link>
        </div>
      </header>
      <main
        className={classNames(
          'relative z-10 flex flex-1 items-center justify-center px-4 py-5 sm:px-6 sm:py-7 lg:px-8',
          mainClassName,
        )}
      >
        {children}
      </main>
      <footer className="relative z-10 px-4 pb-5 pt-2 text-center text-[10px] font-medium uppercase tracking-[0.22em] text-ink-muted/65 sm:text-[11px]">
        © {new Date().getFullYear()} Docqee. Atención odontológica universitaria.
      </footer>
    </div>
  );
}

*/
