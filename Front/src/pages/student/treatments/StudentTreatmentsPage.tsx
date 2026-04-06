import {
  Check,
  MapPin,
  Power,
  PowerOff,
  Search,
  SlidersHorizontal,
  Stethoscope,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { studentContent } from '@/content/studentContent';
import type { PersonOperationalStatus } from '@/content/types';
import { classNames } from '@/lib/classNames';
import { useStudentModuleStore } from '@/lib/studentModuleStore';

type StudentAvailabilityFilter = PersonOperationalStatus | 'all';

export function StudentTreatmentsPage() {
  const {
    errorMessage,
    isLoading,
    practiceSites,
    togglePracticeSiteStatus,
    toggleTreatmentStatus,
    treatments,
  } = useStudentModuleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StudentAvailabilityFilter>('all');
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filterOptions: Array<{ label: string; value: StudentAvailabilityFilter }> = [
    { label: 'Todos', value: 'all' },
    { label: 'Activo', value: 'active' },
    { label: 'Inactivo', value: 'inactive' },
  ];
  const activeTreatmentsCount = useMemo(
    () => treatments.filter((treatment) => treatment.status === 'active').length,
    [treatments],
  );
  const activePracticeSitesCount = useMemo(
    () => practiceSites.filter((practiceSite) => practiceSite.status === 'active').length,
    [practiceSites],
  );
  const filteredTreatments = treatments.filter((treatment) => {
    const matchesSearch =
      treatment.name.toLowerCase().includes(normalizedSearch) ||
      treatment.description.toLowerCase().includes(normalizedSearch);

    return (
      matchesSearch &&
      (statusFilter === 'all' || treatment.status === statusFilter)
    );
  });
  const filteredPracticeSites = practiceSites.filter((practiceSite) => {
    const matchesSearch =
      practiceSite.name.toLowerCase().includes(normalizedSearch) ||
      practiceSite.city.toLowerCase().includes(normalizedSearch) ||
      practiceSite.locality.toLowerCase().includes(normalizedSearch);

    return (
      matchesSearch &&
      (statusFilter === 'all' || practiceSite.status === statusFilter)
    );
  });

  useEffect(() => {
    if (!isStatusMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!statusMenuRef.current?.contains(event.target as Node)) {
        setIsStatusMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsStatusMenuOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isStatusMenuOpen]);

  return (
    <div className="mx-auto flex h-full max-w-[74rem] min-h-0 flex-col gap-4 overflow-hidden">
      <Seo
        description={studentContent.treatmentsPage.meta.description}
        noIndex
        title={studentContent.treatmentsPage.meta.title}
      />
      <AdminPageHeader
        description={studentContent.treatmentsPage.description}
        title={studentContent.treatmentsPage.title}
      />
      {errorMessage ? (
        <SurfaceCard
          className="border border-rose-200 bg-rose-50/90 text-sm font-medium text-rose-800"
          paddingClassName="p-3.5"
        >
          <p role="alert">{errorMessage}</p>
        </SurfaceCard>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <SurfaceCard
          className="min-w-0 overflow-hidden bg-brand-gradient text-white"
          paddingClassName="p-0"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-white/12 text-white ring-1 ring-white/18">
              <Stethoscope aria-hidden="true" className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="font-headline text-[1.55rem] font-extrabold tracking-tight text-white">
                {activeTreatmentsCount}
              </p>
              <p className="text-sm font-semibold text-white/90">Tratamientos activos</p>
            </div>
          </div>
        </SurfaceCard>
        <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-0">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-primary/10 text-primary ring-1 ring-primary/10">
              <MapPin aria-hidden="true" className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="font-headline text-[1.55rem] font-extrabold tracking-tight text-ink">
                {activePracticeSitesCount}
              </p>
              <p className="text-sm font-semibold text-ink-muted">Sedes activas</p>
            </div>
          </div>
        </SurfaceCard>
      </div>
      <AdminPanelCard className="flex-1" panelClassName="bg-[#f4f8ff]">
        <div className="border-b border-slate-200/80 px-4 py-4 sm:px-5 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative min-w-0 flex-1 sm:max-w-[26rem]" htmlFor="student-offer-search">
              <span className="sr-only">Buscar oferta del estudiante</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost"
              />
              <input
                className="h-11 w-full rounded-full border border-slate-200/90 bg-white/98 py-0 pl-11 pr-4 text-sm text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 placeholder:text-ghost/80 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                id="student-offer-search"
                placeholder="Buscar por tratamiento, sede, ciudad o localidad..."
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
            <div className="relative shrink-0" ref={statusMenuRef}>
              <button
                aria-controls="student-offer-status-menu"
                aria-expanded={isStatusMenuOpen}
                aria-haspopup="menu"
                aria-label={
                  statusFilter === 'all'
                    ? 'Filtrar oferta del estudiante por estado'
                    : `Filtrar oferta del estudiante por estado. Actual: ${
                        filterOptions.find((option) => option.value === statusFilter)?.label
                      }`
                }
                className={classNames(
                  'relative inline-flex h-11 w-11 items-center justify-center rounded-full border bg-white/98 text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                  statusFilter === 'all'
                    ? 'border-slate-200/90 hover:border-primary/30 hover:bg-white'
                    : 'border-primary/25 bg-primary/[0.08] text-primary hover:bg-primary/[0.12]',
                )}
                type="button"
                onClick={() => setIsStatusMenuOpen((currentValue) => !currentValue)}
              >
                <SlidersHorizontal aria-hidden="true" className="h-[1.05rem] w-[1.05rem]" />
                {statusFilter !== 'all' ? (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
                ) : null}
              </button>
              {isStatusMenuOpen ? (
                <div
                  className="absolute right-0 top-[calc(100%+0.6rem)] z-20 w-[14rem] overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-white/95 p-2 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] backdrop-blur"
                  id="student-offer-status-menu"
                  role="menu"
                >
                  <div className="px-2.5 pb-2 pt-1">
                    <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-primary/75">
                      Filtrar por estado
                    </p>
                  </div>
                  <div className="space-y-1">
                    {filterOptions.map((option) => {
                      const isSelected = statusFilter === option.value;

                      return (
                        <button
                          key={option.value}
                          aria-checked={isSelected}
                          className={classNames(
                            'flex w-full items-center justify-between rounded-[1rem] px-3 py-2.5 text-left text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                            isSelected
                              ? 'bg-primary text-white shadow-[0_14px_30px_-20px_rgba(22,78,99,0.9)]'
                              : 'bg-slate-50/70 text-ink hover:bg-slate-100',
                          )}
                          role="menuitemradio"
                          type="button"
                          onClick={() => {
                            setStatusFilter(option.value);
                            setIsStatusMenuOpen(false);
                          }}
                        >
                          <span>{option.label}</span>
                          <span
                            className={classNames(
                              'inline-flex h-5 w-5 items-center justify-center rounded-full',
                              isSelected ? 'bg-white/18 text-white' : 'bg-white text-slate-300',
                            )}
                          >
                            <Check aria-hidden="true" className="h-3.5 w-3.5" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <div className="grid gap-4 xl:grid-cols-2">
            <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-5">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                    <Stethoscope aria-hidden="true" className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink">
                      Tratamientos
                    </h2>
                    <p className="text-sm text-ink-muted">
                      Controla que tratamientos quieres mantener visibles y disponibles.
                    </p>
                  </div>
                </div>
                {filteredTreatments.length > 0 ? (
                  <div className="space-y-3">
                    {filteredTreatments.map((treatment) => (
                      <div
                        key={treatment.id}
                        data-testid={`student-treatment-card-${treatment.id}`}
                        className="flex flex-col gap-3 rounded-[1.35rem] border border-slate-200/80 bg-slate-50 px-4 py-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-ink">{treatment.name}</p>
                            <p className="text-sm leading-6 text-ink-muted">
                              {treatment.description}
                            </p>
                          </div>
                          <AdminStatusBadge entity="teacher" status={treatment.status} />
                        </div>
                        <div className="flex justify-end">
                          <button
                            className={classNames(
                              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                              treatment.status === 'active'
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'bg-primary/10 text-primary hover:bg-primary/15',
                            )}
                            type="button"
                            onClick={() => {
                              void toggleTreatmentStatus(treatment.id);
                            }}
                          >
                            {treatment.status === 'active' ? (
                              <PowerOff aria-hidden="true" className="h-3.5 w-3.5" />
                            ) : (
                              <Power aria-hidden="true" className="h-3.5 w-3.5" />
                            )}
                            <span>
                              {treatment.status === 'active'
                                ? studentContent.treatmentsPage.actionLabels.deactivate
                                : studentContent.treatmentsPage.actionLabels.activate}
                            </span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-ink-muted">
                    {isLoading
                      ? 'Cargando tratamientos...'
                      : studentContent.treatmentsPage.emptyTreatmentsState}
                  </div>
                )}
              </div>
            </SurfaceCard>
            <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-5">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                    <MapPin aria-hidden="true" className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink">
                      Sedes de practica
                    </h2>
                    <p className="text-sm text-ink-muted">
                      Gestiona en que sedes de tu universidad quieres mantener tu oferta operativa.
                    </p>
                  </div>
                </div>
                {filteredPracticeSites.length > 0 ? (
                  <div className="space-y-3">
                    {filteredPracticeSites.map((practiceSite) => (
                      <div
                        key={practiceSite.id}
                        data-testid={`student-practice-site-card-${practiceSite.id}`}
                        className="flex flex-col gap-3 rounded-[1.35rem] border border-slate-200/80 bg-slate-50 px-4 py-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-ink">{practiceSite.name}</p>
                            <p className="text-sm text-ink-muted">{practiceSite.address}</p>
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
                              {practiceSite.city} · {practiceSite.locality}
                            </p>
                          </div>
                          <AdminStatusBadge entity="teacher" status={practiceSite.status} />
                        </div>
                        <div className="flex justify-end">
                          <button
                            className={classNames(
                              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                              practiceSite.status === 'active'
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'bg-primary/10 text-primary hover:bg-primary/15',
                            )}
                            type="button"
                            onClick={() => {
                              void togglePracticeSiteStatus(practiceSite.id);
                            }}
                          >
                            {practiceSite.status === 'active' ? (
                              <PowerOff aria-hidden="true" className="h-3.5 w-3.5" />
                            ) : (
                              <Power aria-hidden="true" className="h-3.5 w-3.5" />
                            )}
                            <span>
                              {practiceSite.status === 'active'
                                ? studentContent.treatmentsPage.actionLabels.deactivate
                                : studentContent.treatmentsPage.actionLabels.activate}
                            </span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-ink-muted">
                    {isLoading
                      ? 'Cargando sedes...'
                      : studentContent.treatmentsPage.emptySitesState}
                  </div>
                )}
              </div>
            </SurfaceCard>
          </div>
        </div>
      </AdminPanelCard>
    </div>
  );
}
