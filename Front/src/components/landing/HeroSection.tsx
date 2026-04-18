import { ShieldCheck } from 'lucide-react';

import type { LandingContent } from '@/content/types';

import { ButtonLink } from '../ui/ButtonLink';
import { SurfaceCard } from '../ui/SurfaceCard';

type HeroSectionProps = {
  hero: LandingContent['hero'];
};

const heroImagePriorityProps = {
  fetchpriority: 'high',
} as Record<string, string>;

export function HeroSection({ hero }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden pb-16 pt-4 sm:pb-20 sm:pt-6 lg:min-h-[calc(100svh-6.5rem)] lg:pb-14 lg:pt-8 xl:min-h-[calc(100svh-7rem)] xl:py-10 2xl:min-h-[calc(100svh-7.5rem)]">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_top_left,_rgba(108,211,247,0.16),_transparent_42%),radial-gradient(circle_at_88%_14%,_rgba(0,100,124,0.08),_transparent_34%)] xl:h-[700px] 2xl:h-[760px]"
      />
      <div className="landing-shell mx-auto grid gap-12 px-4 sm:gap-14 sm:px-6 lg:min-h-full lg:grid-cols-[minmax(0,1.02fr)_minmax(24rem,0.98fr)] lg:items-center lg:gap-16 lg:px-8 xl:gap-20 xl:px-10 2xl:grid-cols-[minmax(0,1fr)_minmax(40rem,0.98fr)]">
        <div className="space-y-6 lg:space-y-8 xl:space-y-10">
          <div className="space-y-5">
            <div className="flex justify-center lg:justify-start">
              <div className="inline-flex min-w-0 items-start gap-1.5 rounded-full bg-secondary/80 px-3 py-1.5 text-[11px] font-semibold leading-tight text-secondary-ink shadow-ambient sm:items-center sm:gap-2 sm:px-4 sm:py-2 sm:text-sm">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 sm:mt-0 sm:h-4 sm:w-4" />
                <span className="min-w-0">{hero.badge}</span>
              </div>
            </div>
            <h1 className="mx-auto max-w-[20ch] text-center font-headline text-[clamp(1.7rem,8vw,2.55rem)] font-extrabold leading-[1.1] tracking-tight text-ink [text-wrap:balance] sm:max-w-3xl sm:text-5xl sm:leading-[1.06] lg:mx-0 lg:max-w-[14ch] lg:text-left lg:text-6xl lg:leading-[1.04] xl:max-w-[13ch] xl:text-[4.35rem] 2xl:text-[4.85rem]">
              {hero.titleStart}{' '}
              <span className="text-primary">{hero.titleAccent}</span> {hero.titleEnd}
            </h1>
            <p className="hidden max-w-2xl text-base leading-7 text-ink-muted sm:block sm:text-lg xl:max-w-[40rem] xl:text-[1.18rem] xl:leading-8">
              {hero.description}
            </p>
          </div>
          <div className="hidden flex-col gap-3 sm:flex-row sm:items-center lg:flex xl:gap-4">
            <ButtonLink cta={hero.primaryCta} variant="primary" />
            <ButtonLink cta={hero.secondaryCta} variant="secondary" />
          </div>
        </div>
        <div className="relative mx-auto -mt-4 w-full max-w-[28rem] sm:mt-0 sm:max-w-[31rem] lg:ml-auto lg:mr-0 lg:max-w-[35rem] xl:max-w-[39rem] 2xl:max-w-[42rem]">
          <div
            aria-hidden="true"
            className="absolute -right-6 top-8 hidden h-44 w-44 rounded-full bg-glow/45 blur-3xl sm:block xl:h-56 xl:w-56"
          />
          <div className="relative py-3 sm:py-4 xl:py-5">
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-[2.5%] right-[2.5%] rounded-[2.2rem] bg-surface-card shadow-float xl:rounded-[2.5rem]"
            />
            <div className="relative z-10 mx-auto w-[88%] rounded-[1.85rem] bg-surface-low p-3 sm:w-[86%] sm:p-5 xl:w-[84%] xl:rounded-[2.1rem] xl:p-6">
              <img
                {...heroImagePriorityProps}
                alt={hero.image.alt}
                className="aspect-[9/10] w-full rounded-[1.45rem] object-cover"
                decoding="async"
                height={hero.image.height}
                loading="eager"
                sizes="(min-width: 1024px) 42rem, 100vw"
                src={hero.image.src}
                width={hero.image.width}
              />
            </div>
            {hero.highlights.length > 0 ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-3 xl:mt-6 xl:gap-5">
                {hero.highlights.map((item) => (
                  <SurfaceCard
                    key={item.title}
                    className="h-full bg-surface px-5 py-5 shadow-none xl:px-6 xl:py-6"
                  >
                    <p className="font-headline text-base font-extrabold text-ink xl:text-[1.08rem]">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-ink-muted xl:text-[0.95rem] xl:leading-7">
                      {item.description}
                    </p>
                  </SurfaceCard>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <p className="-mt-8 text-left text-base leading-7 text-ink-muted sm:hidden">
          {hero.description}
        </p>
        <div className="-mt-6 flex flex-row items-center justify-center gap-3 lg:hidden">
          <ButtonLink cta={hero.primaryCta} variant="primary" />
          <ButtonLink cta={hero.secondaryCta} variant="secondary" />
        </div>
      </div>
    </section>
  );
}
