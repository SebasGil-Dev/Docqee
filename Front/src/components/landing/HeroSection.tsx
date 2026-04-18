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
    <section className="relative overflow-hidden pb-16 pt-4 sm:pb-20 sm:pt-6 lg:min-h-[calc(100svh-5.75rem)] lg:py-[clamp(1rem,2.6svh,2rem)] xl:min-h-[calc(100svh-6.25rem)] xl:py-[clamp(1.35rem,2.8svh,2.4rem)] 2xl:min-h-[calc(100svh-6.75rem)]">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_top_left,_rgba(108,211,247,0.16),_transparent_42%),radial-gradient(circle_at_88%_14%,_rgba(0,100,124,0.08),_transparent_34%)] xl:h-[620px] 2xl:h-[700px]"
      />
      <div className="landing-shell mx-auto grid gap-12 px-4 sm:gap-14 sm:px-6 lg:min-h-full lg:grid-cols-[minmax(0,1.02fr)_minmax(22rem,0.92fr)] lg:items-center lg:gap-[clamp(2rem,3.6vw,3.25rem)] lg:px-8 xl:gap-[clamp(2.5rem,4vw,4rem)] xl:px-10 2xl:grid-cols-[minmax(0,1fr)_minmax(34rem,0.92fr)]">
        <div className="space-y-6 lg:space-y-[clamp(1.2rem,2.4svh,1.9rem)] xl:space-y-[clamp(1.4rem,2.6svh,2.2rem)]">
          <div className="space-y-5">
            <div className="flex justify-center lg:justify-start">
              <div className="inline-flex min-w-0 items-start gap-1.5 rounded-full bg-secondary/80 px-3 py-1.5 text-[11px] font-semibold leading-tight text-secondary-ink shadow-ambient sm:items-center sm:gap-2 sm:px-4 sm:py-2 sm:text-sm">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 sm:mt-0 sm:h-4 sm:w-4" />
                <span className="min-w-0">{hero.badge}</span>
              </div>
            </div>
            <h1 className="mx-auto max-w-[20ch] text-center font-headline text-[clamp(1.7rem,8vw,2.55rem)] font-extrabold leading-[1.1] tracking-tight text-ink [text-wrap:balance] sm:max-w-3xl sm:text-5xl sm:leading-[1.06] lg:mx-0 lg:max-w-[13ch] lg:text-left lg:text-[clamp(2.8rem,3.7vw,4rem)] lg:leading-[1.02] xl:max-w-[12ch] xl:text-[clamp(3.15rem,3.9vw,4.5rem)] 2xl:text-[clamp(3.35rem,3.6vw,4.85rem)]">
              {hero.titleStart}{' '}
              <span className="text-primary">{hero.titleAccent}</span> {hero.titleEnd}
            </h1>
            <p className="hidden max-w-2xl text-base leading-7 text-ink-muted sm:block sm:text-lg lg:max-w-[34rem] lg:text-[clamp(0.98rem,1vw,1.08rem)] lg:leading-7 xl:max-w-[37rem] xl:text-[clamp(1.02rem,1.05vw,1.14rem)] xl:leading-[1.8]">
              {hero.description}
            </p>
          </div>
          <div className="hidden flex-col gap-3 sm:flex-row sm:items-center lg:flex xl:gap-4">
            <ButtonLink cta={hero.primaryCta} variant="primary" />
            <ButtonLink cta={hero.secondaryCta} variant="secondary" />
          </div>
        </div>
        <div className="relative mx-auto -mt-4 w-full max-w-[28rem] sm:mt-0 sm:max-w-[31rem] lg:ml-auto lg:mr-0 lg:max-w-[min(33rem,44vw)] xl:max-w-[min(37rem,42vw)] 2xl:max-w-[min(40rem,40vw)]">
          <div
            aria-hidden="true"
            className="absolute -right-6 top-8 hidden h-44 w-44 rounded-full bg-glow/45 blur-3xl sm:block xl:h-48 xl:w-48"
          />
          <div className="relative py-2 sm:py-3 xl:py-3.5">
            <div
              aria-hidden="true"
              className="absolute inset-y-[0.1rem] left-[0.75%] right-[0.75%] rounded-[1.9rem] bg-surface-card shadow-float xl:rounded-[2.15rem]"
            />
            <div className="relative z-10 mx-auto w-[96%] rounded-[1.6rem] bg-surface-low p-2 sm:w-[95%] sm:p-2.5 xl:w-[94%] xl:rounded-[1.75rem] xl:p-[clamp(0.7rem,0.95vw,0.9rem)]">
              <img
                {...heroImagePriorityProps}
                alt={hero.image.alt}
                className="block h-auto w-full rounded-[1.3rem] lg:max-h-[min(29rem,52svh)] xl:max-h-[min(34rem,60svh)] 2xl:max-h-[min(38rem,64svh)]"
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
