import {
  Building2,
  Check,
  Plus,
  Power,
  PowerOff,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
import { formatDisplayName } from '@/lib/formatDisplayName';
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
  return formatDisplayName(
    `${university.adminFirstName} ${university.adminLastName}`,
  );
}

function getLocationState(locationState: unknown): UniversitiesLocationState {
  if (!locationState || typeof locationState !== 'object') {
    return null;
  }

  return locationState as UniversitiesLocationState;
}

export function AdminUniversitiesPage() {
  const { errorMessage, isLoading, toggleUniversityStatus, universities } =
    useAdminModuleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<UniversityStatusFilter>('all');
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [pendingStatusUniversityIds, setPendingStatusUniversityIds] = useState<
    string[]
  >([]);
  const pendingStatusUniversityIdsRef = useRef(new Set<string>());
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const successNotice = getLocationState(location.state)?.successNotice ?? null;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredUniversities = universities.filter(
    (university) =>
      university.name.toLowerCase().includes(normalizedSearch) &&
      (statusFilter === 'all' || university.status === statusFilter),
  );
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

  function handleToggleUniversityStatus(universityId: string) {
    if (pendingStatusUniversityIdsRef.current.has(universityId)) {
      return;
    }

    pendingStatusUniversityIdsRef.current.add(universityId);
    setPendingStatusUniversityIds((currentIds) => [
      ...currentIds,
      universityId,
    ]);

    void toggleUniversityStatus(universityId).finally(() => {
      pendingStatusUniversityIdsRef.current.delete(universityId);
      setPendingStatusUniversityIds((currentIds) =>
        currentIds.filter((currentId) => currentId !== universityId),
      );
    });
  }

  return (
    <div className="mx-auto flex h-full max-w-[88rem] min-h-0 flex-col gap-2.5 overflow-hidden sm:gap-4 2xl:max-w-[96rem]">
      <Seo
        description={adminContent.universitiesPage.meta.description}
        noIndex
        title={adminContent.universitiesPage.meta.title}
      />
      <AdminPageHeader
        className="items-center gap-3"
        description=""
        descriptionClassName="max-w-3xl text-sm leading-6 sm:text-[0.95rem]"
        headingAlign="center"
        title={adminContent.universitiesPage.title}
        titleClassName="whitespace-nowrap text-center text-[clamp(1.25rem,6vw,1.85rem)] leading-none sm:text-[2.2rem]"
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
      <div className="flex items-stretch gap-2 md:gap-2.5">
        <SurfaceCard
          className="w-[9.25rem] flex-none overflow-hidden bg-brand-gradient text-white sm:w-auto sm:min-w-0 sm:flex-1 md:flex-[1.75]"
          paddingClassName="p-0"
        >
          <div className="flex items-center gap-1.5 px-2.5 py-1.75 sm:gap-2.5 sm:px-3.5 sm:py-2">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/12 text-white sm:h-9 sm:w-9">
              <Building2
                aria-hidden="true"
                className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5"
              />
            </span>
            <span className="font-headline text-[0.95rem] font-extrabold tracking-tight text-white sm:text-[1.25rem]">
              {universities.length}
            </span>
            <p className="min-w-0 text-[0.7rem] font-semibold leading-none text-white/90 sm:text-[0.78rem]">
              <span className="sm:hidden">Universidades</span>
              <span className="hidden sm:inline">
                {adminContent.universitiesPage.summaryLabel}
              </span>
            </p>
          </div>
        </SurfaceCard>
        <Link
          className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[1.2rem] bg-brand-gradient px-2.75 py-1.75 text-[0.7rem] font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 sm:gap-2 sm:px-3.5 sm:py-2 sm:text-[0.82rem] md:min-w-[12.25rem] md:flex-none"
          to={ROUTES.adminRegisterUniversity}
        >
          <Plus aria-hidden="true" className="h-3.5 w-3.5" />
          <span className="whitespace-nowrap leading-none">
            {adminContent.universitiesPage.actionLabels.register}
          </span>
        </Link>
      </div>
      <AdminPanelCard className="min-h-0 flex-1" panelClassName="bg-[#f4f8ff]">
        <div className="border-b border-slate-200/80 px-3 py-2.5 sm:px-5 sm:py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h2 className="whitespace-nowrap text-center font-headline text-[1rem] font-extrabold leading-none tracking-tight text-ink sm:text-left sm:text-[1.45rem]">
              {adminContent.universitiesPage.tableTitle}
            </h2>
            <div className="flex min-w-0 items-center gap-2 sm:w-full sm:max-w-[26rem] sm:justify-end sm:gap-2.5 xl:max-w-[30rem]">
              <label
                className="relative min-w-0 flex-1"
                htmlFor="admin-university-search"
              >
                <span className="sr-only">
                  {adminContent.universitiesPage.searchLabel}
                </span>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ghost sm:left-4 sm:h-4 sm:w-4"
                />
                <input
                  className="h-9 w-full rounded-full border border-slate-200/90 bg-white/98 py-0 pl-8 pr-4 text-[0.77rem] text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 placeholder:text-ghost/80 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-11 sm:pl-11 sm:text-sm"
                  id="admin-university-search"
                  placeholder={adminContent.universitiesPage.searchPlaceholder}
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>
              <div className="relative shrink-0" ref={statusMenuRef}>
                <button
                  aria-controls="admin-university-status-menu"
                  aria-expanded={isStatusMenuOpen}
                  aria-haspopup="menu"
                  aria-label={
                    statusFilter === 'all'
                      ? 'Filtrar por estado'
                      : `Filtrar por estado. Actual: ${
                          universityStatusFilterOptions.find(
                            (option) => option.value === statusFilter,
                          )?.label
                        }`
                  }
                  className={classNames(
                    'relative inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white/98 text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-11 sm:w-11',
                    statusFilter === 'all'
                      ? 'border-slate-200/90 hover:border-primary/30 hover:bg-white'
                      : 'border-primary/25 bg-primary/[0.08] text-primary hover:bg-primary/[0.12]',
                  )}
                  type="button"
                  onClick={() => setIsStatusMenuOpen((current) => !current)}
                >
                  <SlidersHorizontal
                    aria-hidden="true"
                    className="h-4 w-4 sm:h-[1.05rem] sm:w-[1.05rem]"
                  />
                  {statusFilter !== 'all' ? (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
                  ) : null}
                </button>
                {isStatusMenuOpen ? (
                  <div
                    className="absolute right-0 top-[calc(100%+0.6rem)] z-20 w-[13.5rem] overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-white/95 p-2 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] backdrop-blur sm:w-[14.5rem]"
                    id="admin-university-status-menu"
                    role="menu"
                  >
                    <div className="px-2.5 pb-2 pt-1">
                      <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-primary/75">
                        Filtrar por estado
                      </p>
                    </div>
                    <div className="space-y-1">
                      {universityStatusFilterOptions.map((option) => {
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
                                isSelected
                                  ? 'bg-white/18 text-white'
                                  : 'bg-white text-slate-300',
                              )}
                            >
                              <Check
                                aria-hidden="true"
                                className="h-3.5 w-3.5"
                              />
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
        </div>
        {filteredUniversities.length > 0 ? (
          <div className="admin-scrollbar min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain scroll-smooth [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]">
            <div className="min-w-[52rem] md:min-w-full">
              <table className="min-w-full table-fixed md:table-auto">
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
                    const isUpdatingStatus =
                      pendingStatusUniversityIds.includes(university.id);

                    return (
                      <tr key={university.id} className="align-top">
                        <td
                          className={classNames(
                            'px-4 pt-3.5 sm:px-5',
                            isLast ? 'pb-4' : 'pb-3.5',
                          )}
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-ink">
                              {formatDisplayName(university.name)}
                            </p>
                            <p className="text-xs text-ink-muted sm:text-[0.82rem]">
                              Registrada{' '}
                              {new Date(
                                university.createdAt,
                              ).toLocaleDateString('es-CO')}
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
                              {university.mainCity}
                            </p>
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
                            <p className="text-xs text-ink-muted sm:text-[0.82rem]">
                              {university.adminEmail}
                            </p>
                          </div>
                        </td>
                        <td
                          className={classNames(
                            'px-4 pt-3.5',
                            isLast ? 'pb-4' : 'pb-3.5',
                          )}
                        >
                          <AdminStatusBadge
                            entity="university"
                            status={university.status}
                          />
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
                                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[0.72rem] font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-65',
                                university.status === 'active'
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                  : 'bg-primary/10 text-primary hover:bg-primary/15',
                              )}
                              disabled={isUpdatingStatus}
                              type="button"
                              onClick={() => {
                                handleToggleUniversityStatus(university.id);
                              }}
                            >
                              {university.status === 'active' ? (
                                <PowerOff
                                  aria-hidden="true"
                                  className="h-3.5 w-3.5"
                                />
                              ) : (
                                <Power
                                  aria-hidden="true"
                                  className="h-3.5 w-3.5"
                                />
                              )}
                              <span>
                                {university.status === 'active'
                                  ? adminContent.universitiesPage.actionLabels
                                      .deactivate
                                  : adminContent.universitiesPage.actionLabels
                                      .activate}
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
          <div className="flex flex-1 items-center justify-center px-4 py-8 text-center sm:px-5">
            <p className="text-sm font-medium text-ink-muted">
              {emptyStateMessage}
            </p>
          </div>
        )}
      </AdminPanelCard>
    </div>
  );
}
