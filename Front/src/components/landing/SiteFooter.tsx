import type { LandingContent } from '@/content/types';

import { LogoMark } from '../ui/LogoMark';

type SiteFooterProps = {
  footer: LandingContent['footer'];
};

export function SiteFooter({ footer }: SiteFooterProps) {
  return (
    <footer className="border-t border-transparent bg-surface-low/75 py-10">
      <div className="landing-shell mx-auto flex flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 xl:px-10">
        <div className="max-w-md space-y-4">
          <LogoMark />
          {footer.blurb ? (
            <p className="text-sm leading-6 text-ink-muted">{footer.blurb}</p>
          ) : null}
          {footer.legalNote ? (
            <p className="text-xs uppercase tracking-[0.24em] text-ink-muted/80">
              {footer.legalNote}
            </p>
          ) : null}
        </div>
        <div className="space-y-4 lg:text-right">
          {footer.links.length > 0 ? (
            <nav
              aria-label="Enlaces del pie de página"
              className="flex flex-wrap gap-4 text-sm font-medium text-ink-muted lg:justify-end"
            >
              {footer.links.map((link) => (
                <a
                  key={link.href}
                  className="transition-colors duration-300 hover:text-primary"
                  href={link.href}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          ) : null}
          <p className="text-sm text-ink-muted">
            © {new Date().getFullYear()} Docqee. Atención odontológica universitaria en
            un entorno institucional.
          </p>
        </div>
      </div>
    </footer>
  );
}
