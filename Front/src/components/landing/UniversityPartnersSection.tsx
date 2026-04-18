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
      className="py-20 [scroll-margin-top:1.25rem] sm:[scroll-margin-top:0] sm:pt-24 sm:pb-16 lg:pb-12 xl:pt-28 xl:pb-20 2xl:pt-32 2xl:pb-24"
      id="universities"
    >
      <div className="landing-shell mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <SectionHeading
          align="center"
          description="Docqee cuenta con alianzas con diversas universidades, permitiéndote acceder a servicios odontológicos brindados por estudiantes en formación y profesionales calificados."
          title="Universidades aliadas"
          titleClassName="xl:text-[2.75rem]"
        />
        <div className="relative mt-12">
          <div className="pointer-events-none absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/88 p-2 text-primary shadow-ambient sm:hidden">
            <ChevronRight className="h-4 w-4" />
          </div>
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 sm:snap-none xl:grid-cols-4 xl:gap-6 2xl:gap-7">
            {universities.map((university) => {
              const Icon = iconMap[university.icon];

              return (
                <SurfaceCard
                  key={university.label}
                  className="h-full min-w-[60%] shrink-0 snap-start first:ml-[14vw] bg-surface-low px-6 py-7 shadow-none sm:min-w-0 sm:first:ml-0 xl:min-h-[17rem] xl:px-7 xl:py-8"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-card text-primary shadow-ambient xl:h-16 xl:w-16">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-6 font-headline text-xl font-extrabold text-ink xl:text-[1.45rem]">
                    {university.label}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-ink-muted xl:text-[0.98rem] xl:leading-7">
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
