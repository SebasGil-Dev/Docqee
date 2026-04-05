import { Badge, Plus, Power, PowerOff, Search, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { ROUTES } from '@/constants/routes';
import { universityAdminContent } from '@/content/universityAdminContent';
import { classNames } from '@/lib/classNames';
import { useUniversityAdminModuleStore } from '@/lib/universityAdminModuleStore';

type TeachersLocationState = {
  successNotice?: string;
} | null;

function getLocationState(locationState: unknown): TeachersLocationState {
  if (!locationState || typeof locationState !== 'object') {
    return null;
  }

  return locationState as TeachersLocationState;
}

function formatDocumentLabel(documentTypeCode: string, documentNumber: string) {
  return `${documentTypeCode} ${documentNumber}`;
}

export function UniversityTeachersPage() {
  const { errorMessage, isLoading, teachers, toggleTeacherStatus } = useUniversityAdminModuleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const successNotice = getLocationState(location.state)?.successNotice ?? null;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredTeachers = teachers.filter((teacher) => {
    const normalizedFullName = `${teacher.firstName} ${teacher.lastName}`.toLowerCase();

    return (
      normalizedFullName.includes(normalizedSearch) ||
      teacher.documentNumber.toLowerCase().includes(normalizedSearch)
    );
  });
  const shouldEnableTableScroll = filteredTeachers.length > 3;

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
        description={universityAdminContent.teachersPage.meta.description}
        noIndex
        title={universityAdminContent.teachersPage.meta.title}
      />
      <AdminPageHeader
        className="gap-3"
        description={universityAdminContent.teachersPage.description}
        descriptionClassName="max-w-3xl text-sm leading-6 sm:text-[0.95rem]"
        title={universityAdminContent.teachersPage.title}
        titleClassName="text-[1.85rem] sm:text-[2.2rem]"
      />
      {successNotice ? (
        <SurfaceCard
          className="border border-emerald-200 bg-emerald-50/90 text-sm font-medium text-emerald-800"
          paddingClassName="p-3.5"
        >
          <p role="status">
            <span className="font-semibold">
              {universityAdminContent.teachersPage.successNoticePrefix}
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
      <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
        <SurfaceCard
          className="min-w-0 flex-1 overflow-hidden bg-brand-gradient text-white md:flex-[1.75]"
          paddingClassName="p-0"
        >
          <div className="flex items-center gap-2.5 px-3.5 py-2 sm:gap-3 sm:px-4 sm:py-2.25">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.85rem] bg-white/12 text-white ring-1 ring-white/20 sm:h-8 sm:w-8">
              <Badge aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
            <span className="font-headline text-[1.45rem] font-extrabold tracking-tight text-white sm:text-[1.65rem]">
              {teachers.length}
            </span>
            <p className="min-w-0 text-[0.78rem] font-semibold text-white/90 sm:text-[0.86rem]">
              {universityAdminContent.teachersPage.summaryLabel}
            </p>
          </div>
        </SurfaceCard>
        <Link
          className="inline-flex items-center justify-center gap-2 rounded-[1.75rem] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-ambient transition duration-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 md:min-w-[11rem] md:flex-none"
          to={ROUTES.universityBulkUpload}
        >
          <Upload aria-hidden="true" className="h-4 w-4" />
          <span>{universityAdminContent.teachersPage.actionLabels.bulkUpload}</span>
        </Link>
        <Link
          className="inline-flex items-center justify-center gap-2 rounded-[1.75rem] bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 md:min-w-[12rem] md:flex-none"
          to={ROUTES.universityRegisterTeacher}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          <span>{universityAdminContent.teachersPage.actionLabels.register}</span>
        </Link>
      </div>
      <AdminPanelCard className="flex-1" panelClassName="bg-[#f4f8ff]">
        <div className="flex flex-col gap-3 border-b border-slate-200/80 px-4 py-4 sm:px-5 sm:py-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(22rem,25rem)] lg:items-center lg:gap-5">
          <div className="space-y-1">
            <h2 className="font-headline text-[1.35rem] font-extrabold tracking-tight text-ink sm:text-[1.5rem]">
              {universityAdminContent.teachersPage.tableTitle}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-ink-muted">
              {universityAdminContent.teachersPage.subtitle}
            </p>
          </div>
          <label className="relative block w-full lg:justify-self-end" htmlFor="university-teacher-search">
            <span className="sr-only">{universityAdminContent.teachersPage.searchLabel}</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost"
            />
            <input
              className="w-full rounded-xl border border-slate-200 bg-surface py-2.25 pl-10 pr-4 text-sm text-ink placeholder:text-ghost/80 transition duration-300 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
              id="university-teacher-search"
              placeholder={universityAdminContent.teachersPage.searchPlaceholder}
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
        </div>
        {filteredTeachers.length > 0 ? (
          <div
            className={classNames(
              'admin-scrollbar min-h-0 overflow-x-auto',
              shouldEnableTableScroll && 'h-[15rem] overflow-y-auto sm:h-[15.75rem]',
            )}
          >
            <table className="min-w-full">
              <thead className="sticky top-0 z-10 bg-slate-100 text-left">
                <tr className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-ink-muted">
                  <th className="px-4 py-3 sm:px-5">Docente</th>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right sm:px-5">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {filteredTeachers.map((teacher, index) => {
                  const isLast = index === filteredTeachers.length - 1;

                  return (
                    <tr key={teacher.id} className="align-top">
                      <td
                        className={classNames(
                          'px-4 pt-3.5 sm:px-5',
                          isLast ? 'pb-4' : 'pb-3.5',
                        )}
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-ink">
                            {teacher.firstName} {teacher.lastName}
                          </p>
                          <p className="text-xs text-ink-muted sm:text-[0.82rem]">
                            Registrado {new Date(teacher.createdAt).toLocaleDateString('es-CO')}
                          </p>
                        </div>
                      </td>
                      <td
                        className={classNames(
                          'px-4 pt-3.5',
                          isLast ? 'pb-4' : 'pb-3.5',
                        )}
                      >
                        <p className="text-sm font-medium text-ink">
                          {formatDocumentLabel(teacher.documentTypeCode, teacher.documentNumber)}
                        </p>
                      </td>
                      <td
                        className={classNames(
                          'px-4 pt-3.5',
                          isLast ? 'pb-4' : 'pb-3.5',
                        )}
                      >
                        <AdminStatusBadge entity="teacher" status={teacher.status} />
                      </td>
                      <td
                        className={classNames(
                          'px-4 pt-3.5 text-right sm:px-5',
                          isLast ? 'pb-4' : 'pb-3.5',
                        )}
                      >
                        <button
                          className={classNames(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[0.72rem] font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                            teacher.status === 'active'
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-primary/10 text-primary hover:bg-primary/15',
                        )}
                          type="button"
                          onClick={() => {
                            void toggleTeacherStatus(teacher.id);
                          }}
                        >
                          {teacher.status === 'active' ? (
                            <PowerOff aria-hidden="true" className="h-3.5 w-3.5" />
                          ) : (
                            <Power aria-hidden="true" className="h-3.5 w-3.5" />
                          )}
                          <span>
                            {teacher.status === 'active'
                              ? universityAdminContent.teachersPage.actionLabels.deactivate
                              : universityAdminContent.teachersPage.actionLabels.activate}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-8 text-center sm:px-5">
            <p className="text-sm font-medium text-ink-muted">
              {isLoading ? 'Cargando docentes...' : universityAdminContent.teachersPage.emptyState}
            </p>
          </div>
        )}
      </AdminPanelCard>
    </div>
  );
}
