import {
  BookOpenCheck,
  ChevronRight,
  GraduationCap,
  Landmark,
  ShieldCheck,
} from 'lucide-react';

import type { LandingContent } from '@/content/types';

import { SectionHeading } from '../ui/SectionHeading';
import { SurfaceCard } from '../ui/SurfaceCard';

type UniversityPartnersSectionProps = {
  universities: LandingContent['universities'];
};

const iconMap = {
  book: BookOpenCheck,
  graduation: GraduationCap,
  landmark: Landmark,
  shield: ShieldCheck,
} as const;

export function UniversityPartnersSection({
  universities,
}: UniversityPartnersSectionProps) {
  return (
    <section
      className="scroll-mt-28 py-20 sm:scroll-mt-32 sm:pt-24 sm:pb-16 lg:flex lg:min-h-[calc(100svh-5.25rem)] lg:items-center lg:scroll-mt-20 lg:py-[clamp(1.25rem,2.2svh,1.95rem)] xl:min-h-[calc(100svh-5.75rem)] xl:py-[clamp(1.5rem,2.45svh,2.2rem)] 2xl:min-h-[calc(100svh-6rem)] 2xl:py-[clamp(1.75rem,2.7svh,2.45rem)]"
      id="universities"
    >
      <div className="landing-shell mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-10">
        <SectionHeading
          align="center"
          description="Docqee cuenta con alianzas institucionales orientadas a facilitar la conexión entre pacientes voluntarios y estudiantes de odontología en formación clínica, bajo acompañamiento académico y supervisión profesional."
          descriptionClassName="lg:text-[clamp(0.98rem,0.92vw,1.04rem)] lg:leading-7 xl:text-[clamp(1rem,0.96vw,1.08rem)]"
          title="Universidades aliadas"
          titleClassName="lg:text-[clamp(2rem,2.3vw,2.35rem)] xl:text-[clamp(2.15rem,2.45vw,2.65rem)]"
        />
        <div className="relative mt-10 lg:mt-[clamp(1.85rem,2.8svh,2.35rem)] xl:mt-[clamp(2rem,3svh,2.6rem)]">
          <div className="pointer-events-none absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/88 p-2 text-primary shadow-ambient sm:hidden">
            <ChevronRight className="h-4 w-4" />
          </div>
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 sm:snap-none lg:grid-cols-4 lg:gap-[clamp(0.95rem,1.45vw,1.2rem)] xl:gap-[clamp(1.05rem,1.6vw,1.4rem)]">
            {universities.map((university) => {
              const Icon = iconMap[university.icon];

              return (
                <SurfaceCard
                  key={university.label}
                  className="h-full min-w-[60%] shrink-0 snap-start first:ml-[14vw] bg-surface-low px-6 py-7 shadow-none sm:min-w-0 sm:first:ml-0 lg:min-h-[12.5rem] lg:px-[clamp(1rem,1.05vw,1.2rem)] lg:py-[clamp(1rem,1.5svh,1.2rem)] xl:min-h-[13.4rem] xl:px-[clamp(1.1rem,1.1vw,1.3rem)] xl:py-[clamp(1.1rem,1.6svh,1.35rem)] 2xl:min-h-[14.1rem]"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-card text-primary shadow-ambient lg:h-[3.15rem] lg:w-[3.15rem] xl:h-[3.3rem] xl:w-[3.3rem]">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 font-headline text-xl font-extrabold text-ink lg:mt-4 lg:text-[clamp(1.05rem,1.1vw,1.18rem)] xl:text-[clamp(1.1rem,1.16vw,1.28rem)] 2xl:text-[1.34rem]">
                    {university.label}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-ink-muted lg:mt-2.5 lg:text-[0.9rem] lg:leading-6 xl:text-[0.94rem] xl:leading-[1.65] 2xl:text-[0.97rem]">
                    {university.supportText}
                  </p>
                </SurfaceCard>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
