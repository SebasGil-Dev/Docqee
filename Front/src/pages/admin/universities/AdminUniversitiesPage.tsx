import { Building2, ChevronDown, Plus, Power, PowerOff, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { ROUTES } from '@/constants/routes';
import { adminContent } from '@/content/adminContent';
import type { AdminUniversity, UniversityStatus } from '@/content/types';
import { classNames } from '@/lib/classNames';
import { useAdminModuleStore } from '@/lib/adminModuleStore';

type UniversitiesLocationState = {
  successNotice?: string;
} | null;

type UniversityStatusFilter = 'all' | UniversityStatus;

const universityStatusFilterOptions: Array<{
  label: string;
  value: UniversityStatusFilter;
}> = [
  { label: 'Todos', value: 'all' },
  { label: 'Pendiente', value: 'pending' },
  { label: 'Activa', value: 'active' },
  { label: 'Inactiva', value: 'inactive' },
];

function buildAdministratorLabel(university: AdminUniversity) {
  return `${university.adminFirstName} ${university.adminLastName}`;
}

function getLocationState(locationState: unknown): UniversitiesLocationState {
  if (!locationState || typeof locationState !== 'object') {
    return null;
  }

  return locationState as UniversitiesLocationState;
}

export function AdminUniversitiesPage() {
  const { errorMessage, isLoading, toggleUniversityStatus, universities } = useAdminModuleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<UniversityStatusFilter>('all');
  const location = useLocation();
  const navigate = useNavigate();
  const successNotice = getLocationState(location.state)?.successNotice ?? null;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredUniversities = universities.filter((university) =>
    university.name.toLowerCase().includes(normalizedSearch) &&
    (statusFilter === 'all' || university.status === statusFilter),
  );
  const shouldEnableTableScroll = filteredUniversities.length > 3;
  const emptyStateMessage = isLoading
    ? 'Cargando universidades...'
    : normalizedSearch || statusFilter !== 'all'
      ? 'No encontramos universidades con los filtros seleccionados.'
      : adminContent.universitiesPage.emptyState;

  useEffect(() => {
    if (!successNotice) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      navigate(location.pathname, { replace: true, state: null });
    }, 3500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [location.pathname, navigate, successNotice]);

  return (
    <div className="mx-auto flex h-full max-w-[72rem] min-h-0 flex-col gap-4 overflow-hidden">
      <Seo
        description={adminContent.universitiesPage.meta.description}
        noIndex
        title={adminContent.universitiesPage.meta.title}
      />
      <AdminPageHeader
        className="gap-3"
        description=""
        descriptionClassName="max-w-3xl text-sm leading-6 sm:text-[0.95rem]"
        title={adminContent.universitiesPage.title}
        titleClassName="whitespace-nowrap text-[clamp(1.25rem,6vw,1.85rem)] leading-none sm:text-[2.2rem]"
      />
      {successNotice ? (
        <SurfaceCard
          className="border border-emerald-200 bg-emerald-50/90 text-sm font-medium text-emerald-800"
          paddingClassName="p-3.5"
        >
          <p role="status">
            <span className="font-semibold">
              {adminContent.universitiesPage.successNoticePrefix}
            </span>{' '}
            {successNotice}
          </p>
        </SurfaceCard>
      ) : null}
      {errorMessage ? (
        <SurfaceCard
          className="border border-rose-200 bg-rose-50/90 text-sm font-medium text-rose-800"
          paddingClassName="p-3.5"
        >
          <p role="alert">{errorMessage}</p>
        </SurfaceCard>
      ) : null}
      <div className="flex items-stretch gap-2.5 md:gap-3">
        <SurfaceCard
          className="min-w-0 flex-1 overflow-hidden bg-brand-gradient text-white md:flex-[1.75]"
          paddingClassName="p-0"
        >
          <div className="flex items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.25">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/12 text-white sm:h-11 sm:w-11">
              <Building2 aria-hidden="true" className="h-4.5 w-4.5 sm:h-5.5 sm:w-5.5" />
            </span>
            <span className="font-headline text-[1.05rem] font-extrabold tracking-tight text-white sm:text-[1.4rem]">
              {universities.length}
            </span>
            <p className="min-w-0 text-[0.68rem] font-semibold leading-tight text-white/90 sm:text-[0.86rem]">
              {adminContent.universitiesPage.summaryLabel}
            </p>
          </div>
        </SurfaceCard>
        <Link
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[1.35rem] bg-brand-gradient px-3 py-2 text-[0.78rem] font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm md:min-w-[13.25rem] md:flex-none"
          to={ROUTES.adminRegisterUniversity}
        >
          <Plus aria-hidden="true" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="leading-none">{adminContent.universitiesPage.actionLabels.register}</span>
        </Link>
      </div>
      <AdminPanelCard className="flex-1" panelClassName="bg-[#f4f8ff]">
        <div className="border-b border-slate-200/80 px-4 py-4 sm:px-5 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <h2 className="min-w-[5.75rem] max-w-[6.9rem] text-balance font-headline text-[0.92rem] font-extrabold leading-[1.05] tracking-tight text-ink sm:min-w-[9rem] sm:max-w-none sm:text-[1.45rem]">
              {adminContent.universitiesPage.tableTitle}
            </h2>
            <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-2.5">
              <label className="relative min-w-0 flex-[1.05] sm:flex-[1.2]" htmlFor="admin-university-search">
                <span className="sr-only">{adminContent.universitiesPage.searchLabel}</span>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ghost sm:left-3.5 sm:h-4 sm:w-4"
                />
                <input
                  className="h-10 w-full rounded-full border border-slate-200/90 bg-white/95 py-0 pl-8 pr-3 text-[0.76rem] text-ink shadow-sm shadow-slate-200/60 transition duration-300 placeholder:text-ghost/80 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-11 sm:pl-10 sm:pr-4 sm:text-sm"
                  id="admin-university-search"
                  placeholder={adminContent.universitiesPage.searchPlaceholder}
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>
              <label className="relative block w-[5.8rem] shrink-0 sm:w-[8rem]" htmlFor="admin-university-status-filter">
                <span className="sr-only">Filtrar por estado</span>
                <SlidersHorizontal
                  aria-hidden="true"
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ghost sm:left-3 sm:h-4 sm:w-4"
                />
                <select
                  className="h-10 w-full appearance-none rounded-full border border-slate-200/90 bg-white/95 py-0 pl-7.5 pr-7 text-[0.72rem] font-medium text-ink shadow-sm shadow-slate-200/60 transition duration-300 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-11 sm:pl-9 sm:pr-8 sm:text-sm"
                  id="admin-university-status-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as UniversityStatusFilter)}
                >
                  {universityStatusFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ghost sm:right-3 sm:h-4 sm:w-4"
                />
              </label>
            </div>
          </div>
        </div>
        {filteredUniversities.length > 0 ? (
          <div
            className={classNames(
              'admin-scrollbar min-h-0 overflow-x-auto',
              shouldEnableTableScroll && 'h-[15.75rem] overflow-y-auto sm:h-[16.5rem]',
            )}
          >
            <div>
              <table className="min-w-full">
                <thead className="sticky top-0 z-10 bg-slate-100 text-left">
                  <tr className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-ink-muted">
                    <th className="px-4 py-3 sm:px-5">Universidad</th>
                    <th className="px-4 py-3">Localidad</th>
                    <th className="px-4 py-3">Administrador</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right sm:px-5">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {filteredUniversities.map((university, index) => {
                    const isPending = university.status === 'pending';
                    const isLast = index === filteredUniversities.length - 1;

                    return (
                      <tr key={university.id} className="align-top">
                        <td
                          className={classNames(
                            'px-4 pt-3.5 sm:px-5',
                            isLast ? 'pb-4' : 'pb-3.5',
                          )}
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-ink">{university.name}</p>
                            <p className="text-xs text-ink-muted sm:text-[0.82rem]">
                              Registrada {new Date(university.createdAt).toLocaleDateString('es-CO')}
                            </p>
                          </div>
                        </td>
                        <td
                          className={classNames(
                            'px-4 pt-3.5',
                            isLast ? 'pb-4' : 'pb-3.5',
                          )}
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-ink">{university.mainCity}</p>
                            <p className="text-xs text-ink-muted sm:text-[0.82rem]">
                              {university.mainLocality}
                            </p>
                          </div>
                        </td>
                        <td
                          className={classNames(
                            'px-4 pt-3.5',
                            isLast ? 'pb-4' : 'pb-3.5',
                          )}
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-ink">
                              {buildAdministratorLabel(university)}
                            </p>
                            <p className="text-xs text-ink-muted sm:text-[0.82rem]">{university.adminEmail}</p>
                          </div>
                        </td>
                        <td
                          className={classNames(
                            'px-4 pt-3.5',
                            isLast ? 'pb-4' : 'pb-3.5',
                          )}
                        >
                          <AdminStatusBadge entity="university" status={university.status} />
                        </td>
                        <td
                          className={classNames(
                            'px-4 pt-3.5 text-right sm:px-5',
                            isLast ? 'pb-4' : 'pb-3.5',
                          )}
                        >
                          {isPending ? (
                            <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1.5 text-[0.72rem] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                              {adminContent.universitiesPage.pendingActionLabel}
                            </span>
                          ) : (
                            <button
                              className={classNames(
                                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[0.72rem] font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                                university.status === 'active'
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                  : 'bg-primary/10 text-primary hover:bg-primary/15',
                              )}
                              type="button"
                              onClick={() => {
                                void toggleUniversityStatus(university.id);
                              }}
                            >
                              {university.status === 'active' ? (
                                <PowerOff aria-hidden="true" className="h-3.5 w-3.5" />
                              ) : (
                                <Power aria-hidden="true" className="h-3.5 w-3.5" />
                              )}
                              <span>
                                {university.status === 'active'
                                  ? adminContent.universitiesPage.actionLabels.deactivate
                                  : adminContent.universitiesPage.actionLabels.activate}
                              </span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="px-4 py-8 text-center sm:px-5">
            <p className="text-sm font-medium text-ink-muted">{emptyStateMessage}</p>
          </div>
        )}
      </AdminPanelCard>
    </div>
  );
}
