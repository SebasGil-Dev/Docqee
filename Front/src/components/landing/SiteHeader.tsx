import { Menu, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { LandingContent } from '@/content/types';
import { classNames } from '@/lib/classNames';

import { ButtonLink } from '../ui/ButtonLink';
import { LogoMark } from '../ui/LogoMark';

type SiteHeaderProps = {
  navigation: LandingContent['navigation'];
};

function YouTubeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      viewBox="0 0 24 24"
    >
      <path
        d="M23.5 6.2a2.97 2.97 0 0 0-2.1-2.1C19.6 3.6 12 3.6 12 3.6s-7.6 0-9.4.5a2.97 2.97 0 0 0-2.1 2.1A31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 2.97 2.97 0 0 0 2.1 2.1c1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5a2.97 2.97 0 0 0 2.1-2.1A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8Z"
        fill="#FF0000"
      />
      <path d="M9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" fill="#FFFFFF" />
    </svg>
  );
}

export function SiteHeader({ navigation }: SiteHeaderProps) {
  const sectionLinks = useMemo(
    () => navigation.items.filter((item) => item.href.startsWith('#')),
    [navigation.items],
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeHref, setActiveHref] = useState(sectionLinks[0]?.href ?? '#top');
  const youtubeLink =
    navigation.youtube.kind === 'external' ? navigation.youtube : null;

  useEffect(() => {
    if (sectionLinks.length === 0) {
      return undefined;
    }

    const updateActiveHref = () => {
      const scrollPosition = window.scrollY + 156;
      let nextActiveHref = sectionLinks[0]?.href ?? '#top';

      for (const item of sectionLinks) {
        const targetId = item.href.replace('#', '');
        const section = document.getElementById(targetId);

        if (section && section.offsetTop <= scrollPosition) {
          nextActiveHref = item.href;
        }
      }

      setActiveHref((currentHref) =>
        currentHref === nextActiveHref ? currentHref : nextActiveHref,
      );
    };

    updateActiveHref();
    window.addEventListener('scroll', updateActiveHref, { passive: true });
    window.addEventListener('resize', updateActiveHref);
    window.addEventListener('hashchange', updateActiveHref);

    return () => {
      window.removeEventListener('scroll', updateActiveHref);
      window.removeEventListener('resize', updateActiveHref);
      window.removeEventListener('hashchange', updateActiveHref);
    };
  }, [sectionLinks]);

  const youtubeLinkClassName =
    'inline-flex h-12 w-12 items-center justify-center transition-transform duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15';

  return (
    <header className="sticky top-0 z-50">
      <div className="landing-shell mx-auto px-4 pt-2 sm:px-6 sm:pt-3 lg:px-8 xl:px-10">
        <div className="rounded-full bg-[#FFFFFF] px-4 py-3 shadow-ambient backdrop-blur-xl sm:px-6 xl:px-7 xl:py-3.5">
          <div className="flex items-center justify-between gap-4">
            <a href="#top">
              <LogoMark />
            </a>
            <nav
              aria-label="Navegación principal"
              className="hidden items-center gap-7 text-sm font-medium md:flex"
            >
              {navigation.items.map((item) => (
                <a
                  key={item.href}
                  aria-current={
                    activeHref === item.href ? 'location' : undefined
                  }
                  className={classNames(
                    'relative transition-colors duration-300 hover:text-primary',
                    activeHref === item.href
                      ? 'text-primary after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-primary'
                      : 'text-ink-muted',
                  )}
                  href={item.href}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="hidden items-center gap-3 md:flex">
              {youtubeLink ? (
                <a
                  aria-label={youtubeLink.label}
                  className={youtubeLinkClassName}
                  href={youtubeLink.href}
                  rel={youtubeLink.newTab ? 'noreferrer noopener' : undefined}
                  target={youtubeLink.newTab ? '_blank' : undefined}
                >
                  <YouTubeIcon />
                </a>
              ) : null}
              <ButtonLink cta={navigation.login} variant="ghost" />
              <ButtonLink cta={navigation.register} variant="primary" />
            </div>
            <button
              aria-controls="mobile-navigation"
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface-low text-secondary-ink transition-colors duration-300 hover:text-primary md:hidden"
              type="button"
              onClick={() => setIsMenuOpen((current) => !current)}
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
        {isMenuOpen ? (
          <div
            className="mt-3 rounded-[1.75rem] bg-[#FFFFFF] p-5 shadow-float backdrop-blur-2xl md:hidden"
            id="mobile-navigation"
          >
            <nav className="flex flex-col gap-3" aria-label="Navegación móvil">
              {navigation.items.map((item) => (
                <a
                  key={item.href}
                  aria-current={
                    activeHref === item.href ? 'location' : undefined
                  }
                  className={classNames(
                    'rounded-2xl px-4 py-3 font-medium transition-colors duration-300 hover:bg-surface-low hover:text-primary',
                    activeHref === item.href
                      ? 'bg-surface-low text-primary'
                      : 'text-ink-muted',
                  )}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              {youtubeLink ? (
                <a
                  aria-label={youtubeLink.label}
                  className="mt-2 inline-flex w-full items-center gap-3 rounded-2xl px-4 py-3 font-medium text-ink-muted transition-colors duration-300 hover:bg-surface-low hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                  href={youtubeLink.href}
                  rel={youtubeLink.newTab ? 'noreferrer noopener' : undefined}
                  target={youtubeLink.newTab ? '_blank' : undefined}
                >
                  <YouTubeIcon />
                  <span>{youtubeLink.label}</span>
                </a>
              ) : null}
              <div className="mt-2 flex items-center gap-3">
                <ButtonLink
                  className="flex-1"
                  cta={navigation.login}
                  variant="secondary"
                />
                <ButtonLink
                  className="flex-1"
                  cta={navigation.register}
                  variant="primary"
                />
              </div>
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  );
}
