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
      className="py-20 [scroll-margin-top:1.25rem] sm:[scroll-margin-top:0] sm:pt-24 sm:pb-16 lg:flex lg:min-h-[calc(100svh-5.75rem)] lg:items-center lg:pb-10 lg:pt-10 xl:min-h-[calc(100svh-6rem)] xl:py-12 2xl:min-h-[calc(100svh-6.25rem)] 2xl:py-14"
      id="universities"
    >
      <div className="landing-shell mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-10">
        <SectionHeading
          align="center"
          description="Docqee cuenta con alianzas con diversas universidades, permitiéndote acceder a servicios odontológicos brindados por estudiantes en formación y profesionales calificados."
          title="Universidades aliadas"
          titleClassName="xl:text-[2.75rem]"
        />
        <div className="relative mt-10 xl:mt-12">
          <div className="pointer-events-none absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/88 p-2 text-primary shadow-ambient sm:hidden">
            <ChevronRight className="h-4 w-4" />
          </div>
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 sm:snap-none xl:grid-cols-4 xl:gap-6 2xl:gap-7">
            {universities.map((university) => {
              const Icon = iconMap[university.icon];

              return (
                <SurfaceCard
                  key={university.label}
                  className="h-full min-w-[60%] shrink-0 snap-start first:ml-[14vw] bg-surface-low px-6 py-7 shadow-none sm:min-w-0 sm:first:ml-0 xl:min-h-[15.25rem] xl:px-6 xl:py-7 2xl:min-h-[16rem]"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-card text-primary shadow-ambient xl:h-[3.75rem] xl:w-[3.75rem]">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 font-headline text-xl font-extrabold text-ink xl:text-[1.32rem] 2xl:text-[1.42rem]">
                    {university.label}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-ink-muted xl:text-[0.95rem] xl:leading-6 2xl:text-[0.98rem] 2xl:leading-7">
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
