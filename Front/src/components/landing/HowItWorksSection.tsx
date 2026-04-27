import { useState } from 'react';
import { ClipboardPlus, LogIn, Search } from 'lucide-react';

import type { HowItWorksRole, LandingContent } from '@/content/types';
import { classNames } from '@/lib/classNames';

import { SectionHeading } from '../ui/SectionHeading';
import { SurfaceCard } from '../ui/SurfaceCard';

type HowItWorksSectionProps = {
  content: LandingContent['howItWorks'];
};

const iconMap = {
  account: LogIn,
  clipboard: ClipboardPlus,
  search: Search,
} as const;

const roleOrder: HowItWorksRole[] = ['patient', 'student'];

export function HowItWorksSection({ content }: HowItWorksSectionProps) {
  const [selectedRole, setSelectedRole] = useState<HowItWorksRole>('patient');
  const activeRole = content.roles[selectedRole];

  return (
    <section
      className="scroll-mt-14 bg-surface-low pb-20 pt-8 sm:scroll-mt-16 sm:py-24 lg:flex lg:min-h-[calc(100svh-5.25rem)] lg:items-center lg:scroll-mt-14 lg:py-[clamp(1.25rem,2.2svh,1.9rem)] xl:min-h-[calc(100svh-5.75rem)] xl:scroll-mt-16 xl:py-[clamp(1.5rem,2.5svh,2.2rem)] 2xl:min-h-[calc(100svh-6rem)] 2xl:py-[clamp(1.75rem,2.8svh,2.45rem)]"
      id="how-it-works"
    >
      <div className="landing-shell mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-10">
        <SectionHeading
          align="center"
          description={content.description}
          descriptionClassName="lg:text-[clamp(0.98rem,0.95vw,1.05rem)] lg:leading-7 xl:text-[clamp(1rem,0.98vw,1.08rem)]"
          title={content.title}
          titleClassName="whitespace-nowrap text-[clamp(1.2rem,7vw,2.25rem)] sm:text-4xl lg:text-[clamp(2rem,2.35vw,2.35rem)] xl:text-[clamp(2.15rem,2.45vw,2.6rem)]"
        />
        <div className="mx-auto mt-8 max-w-2xl sm:mt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            {roleOrder.map((role) => {
              const isSelected = role === selectedRole;

              return (
                <button
                  key={role}
                  aria-pressed={isSelected}
                  className={classNames(
                    'inline-flex min-h-[3.2rem] items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold transition-all duration-300',
                    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 sm:min-w-[10rem]',
                    isSelected
                      ? 'border-primary bg-brand-gradient text-white shadow-ambient'
                      : 'border-slate-200/80 bg-white text-ink hover:border-primary/35 hover:bg-surface-card',
                  )}
                  onClick={() => setSelectedRole(role)}
                  type="button"
                >
                  {content.roles[role].label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-5 lg:mt-[clamp(1.75rem,2.8svh,2.3rem)] lg:grid-cols-3 lg:gap-[clamp(1rem,1.5vw,1.3rem)] xl:mt-[clamp(2rem,3svh,2.55rem)] xl:gap-[clamp(1.1rem,1.7vw,1.55rem)]">
          {activeRole.steps.map((step, index) => {
            const Icon = iconMap[step.icon];

            return (
              <SurfaceCard
                key={`${selectedRole}-${step.title}`}
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
