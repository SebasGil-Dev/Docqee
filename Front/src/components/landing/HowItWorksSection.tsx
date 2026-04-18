import { ClipboardPlus, LogIn, Search } from 'lucide-react';

import type { LandingContent } from '@/content/types';

import { SectionHeading } from '../ui/SectionHeading';
import { SurfaceCard } from '../ui/SurfaceCard';

type HowItWorksSectionProps = {
  steps: LandingContent['steps'];
};

const iconMap = {
  account: LogIn,
  clipboard: ClipboardPlus,
  search: Search,
} as const;

export function HowItWorksSection({ steps }: HowItWorksSectionProps) {
  return (
    <section
      className="scroll-mt-20 bg-surface-low pb-20 pt-8 sm:scroll-mt-24 sm:py-24 lg:flex lg:min-h-[calc(100svh-5.25rem)] lg:items-center lg:scroll-mt-8 lg:py-[clamp(1.25rem,2.2svh,1.9rem)] xl:min-h-[calc(100svh-5.75rem)] xl:py-[clamp(1.5rem,2.5svh,2.2rem)] 2xl:min-h-[calc(100svh-6rem)] 2xl:py-[clamp(1.75rem,2.8svh,2.45rem)]"
      id="how-it-works"
    >
      <div className="landing-shell mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-10">
        <SectionHeading
          align="center"
          description="Sigue estos pasos para comenzar tu proceso en Docqee"
          descriptionClassName="lg:text-[clamp(0.98rem,0.95vw,1.05rem)] lg:leading-7 xl:text-[clamp(1rem,0.98vw,1.08rem)]"
          titleClassName="whitespace-nowrap text-[clamp(1.2rem,7vw,2.25rem)] sm:text-4xl lg:text-[clamp(2rem,2.35vw,2.35rem)] xl:text-[clamp(2.15rem,2.45vw,2.6rem)]"
          title={'\u00BFC\u00F3mo funciona Docqee?'}
        />
        <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-5 lg:mt-[clamp(1.75rem,2.8svh,2.3rem)] lg:grid-cols-3 lg:gap-[clamp(1rem,1.5vw,1.3rem)] xl:mt-[clamp(2rem,3svh,2.55rem)] xl:gap-[clamp(1.1rem,1.7vw,1.55rem)]">
          {steps.map((step, index) => {
            const Icon = iconMap[step.icon];

            return (
              <SurfaceCard
                key={step.title}
                className="flex h-full flex-col p-5 sm:p-6 lg:min-h-[13.25rem] lg:p-[clamp(1.05rem,1.25vw,1.3rem)] xl:min-h-[14.25rem] xl:p-[clamp(1.15rem,1.35vw,1.5rem)] 2xl:min-h-[15rem]"
                interactive
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/6 text-primary sm:h-[3.25rem] sm:w-[3.25rem] lg:h-[3.2rem] lg:w-[3.2rem] xl:h-[3.35rem] xl:w-[3.35rem]">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="font-headline text-[1.7rem] font-extrabold text-primary/18 sm:text-[1.9rem] lg:text-[2rem] xl:text-[2.15rem]">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-5 font-headline text-[1.22rem] font-extrabold leading-snug text-ink sm:text-[1.35rem] lg:mt-5 lg:text-[clamp(1.3rem,1.55vw,1.58rem)] lg:leading-tight xl:mt-6 xl:text-[clamp(1.38rem,1.5vw,1.7rem)]">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-ink-muted sm:mt-4 sm:text-[0.97rem] sm:leading-6 lg:mt-3 lg:text-[0.92rem] lg:leading-6 xl:text-[0.97rem] xl:leading-[1.7]">
                  {step.description}
                </p>
              </SurfaceCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/*

import { ClipboardPlus, LogIn, Search } from 'lucide-react';

import type { LandingContent } from '@/content/types';

import { SectionHeading } from '../ui/SectionHeading';
import { SurfaceCard } from '../ui/SurfaceCard';

type HowItWorksSectionProps = {
  steps: LandingContent['steps'];
};

const iconMap = {
  account: LogIn,
  clipboard: ClipboardPlus,
  search: Search,
} as const;

export function HowItWorksSection({ steps }: HowItWorksSectionProps) {
  return (
    <section
      className="scroll-mt-20 bg-surface-low pb-20 pt-8 sm:scroll-mt-24 lg:scroll-mt-8 sm:py-24"
      id="how-it-works"
    >
      <div className="mx-auto max-w-layout px-4 sm:px-6 lg:px-8">
        <SectionHeading
          align="center"
          description="Sigue estos pasos para comenzar tu proceso en Docqee"
          titleClassName="whitespace-nowrap text-[clamp(1.2rem,7vw,2.25rem)] sm:text-4xl"
          title="¿Cómo funciona Docqee?"
          {...{ title: '¿Cómo funciona Docqee?' }}
        />
        <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-5 lg:mt-12 lg:grid-cols-3 lg:gap-6">
          {steps.map((step, index) => {
            const Icon = iconMap[step.icon];

            return (
              <SurfaceCard key={step.title} className="flex h-full flex-col p-4 sm:p-6 lg:p-7" interactive>
                <div className="flex items-start gap-3 lg:hidden">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    0{index + 1}
                  </span>
                  <h3 className="pt-1 font-headline text-base font-extrabold leading-snug text-ink sm:text-lg">
                    {step.title}
                  </h3>
                </div>
                <div className="hidden items-center justify-between gap-4 lg:flex">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/6 text-primary">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="font-headline text-3xl font-extrabold text-primary/18">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-8 hidden font-headline text-2xl font-extrabold leading-tight text-ink lg:block">
                  {step.title}
                </h3>
                <p className="mt-3 text-[0.95rem] leading-6 text-ink-muted sm:mt-4 sm:text-base sm:leading-7 lg:mt-4">
                  {step.description}
                </p>
              </SurfaceCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}

*/
