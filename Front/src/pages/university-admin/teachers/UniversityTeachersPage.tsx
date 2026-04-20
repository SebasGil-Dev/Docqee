import {
  Check,
  Plus,
  Power,
  PowerOff,
  Presentation,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { AdminConfirmationDialog } from '@/components/admin/AdminConfirmationDialog';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { ROUTES } from '@/constants/routes';
import { universityAdminContent } from '@/content/universityAdminContent';
import type { PersonOperationalStatus, UniversityTeacher } from '@/content/types';
import { classNames } from '@/lib/classNames';
import { formatDisplayName } from '@/lib/formatDisplayName';
import { useUniversityAdminTeacherRecordsStore } from '@/lib/universityAdminTeacherRecordsStore';

type TeachersLocationState = {
  successNotice?: string;
} | null;

type TeacherStatusFilter = PersonOperationalStatus | 'all';
type TeacherStatusConfirmationAction = 'activate' | 'deactivate';

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
  const { errorMessage, isLoading, teachers, toggleTeacherStatus } =
    useUniversityAdminTeacherRecordsStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TeacherStatusFilter>('all');
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [statusConfirmationTeacher, setStatusConfirmationTeacher] =
    useState<UniversityTeacher | null>(null);
  const [pendingStatusTeacherIds, setPendingStatusTeacherIds] = useState<
    string[]
  >([]);
  const pendingStatusTeacherIdsRef = useRef(new Set<string>());
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const successNotice = getLocationState(location.state)?.successNotice ?? null;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const teacherFilterOptions: Array<{
    label: string;
    value: TeacherStatusFilter;
  }> = [
    { label: 'Todos', value: 'all' },
    { label: 'Activo', value: 'active' },
    { label: 'Inactivo', value: 'inactive' },
  ];
  const filteredTeachers = teachers.filter((teacher) => {
    const normalizedFullName =
      `${teacher.firstName} ${teacher.lastName}`.toLowerCase();

    return (
      (normalizedFullName.includes(normalizedSearch) ||
        teacher.documentNumber.toLowerCase().includes(normalizedSearch)) &&
      (statusFilter === 'all' || teacher.status === statusFilter)
    );
  });
  const isStatusConfirmationSubmitting = Boolean(
    statusConfirmationTeacher &&
    pendingStatusTeacherIds.includes(statusConfirmationTeacher.id),
  );
  const statusConfirmationAction: TeacherStatusConfirmationAction =
    statusConfirmationTeacher?.status === 'active' ? 'deactivate' : 'activate';
  const statusConfirmationTitle =
    statusConfirmationAction === 'deactivate'
      ? '¿Quieres inactivar este docente?'
      : '¿Quieres activar este docente?';
  const statusConfirmationDescription = statusConfirmationTeacher
    ? statusConfirmationAction === 'deactivate'
      ? `El docente ${formatDisplayName(`${statusConfirmationTeacher.firstName} ${statusConfirmationTeacher.lastName}`)} quedará inactivo y no podrá operar dentro de la plataforma hasta que lo actives nuevamente.`
      : `El docente ${formatDisplayName(`${statusConfirmationTeacher.firstName} ${statusConfirmationTeacher.lastName}`)} quedará activo y podrá operar dentro de la plataforma.`
    : '';
  const statusConfirmationConfirmLabel =
    statusConfirmationAction === 'deactivate'
      ? 'Sí, inactivar'
      : 'Sí, activar';

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

  function handleCloseStatusConfirmation() {
    setStatusConfirmationTeacher(null);
  }

  function handleToggleTeacherStatus(teacherId: string) {
    if (pendingStatusTeacherIdsRef.current.has(teacherId)) {
      return;
    }

    pendingStatusTeacherIdsRef.current.add(teacherId);
    setPendingStatusTeacherIds((currentIds) => [...currentIds, teacherId]);

    void toggleTeacherStatus(teacherId).finally(() => {
      pendingStatusTeacherIdsRef.current.delete(teacherId);
      setPendingStatusTeacherIds((currentIds) =>
        currentIds.filter((currentId) => currentId !== teacherId),
      );
    });
  }

  function handleConfirmStatusToggle() {
    if (!statusConfirmationTeacher) {
      return;
    }

    const teacherId = statusConfirmationTeacher.id;

    setStatusConfirmationTeacher(null);
    handleToggleTeacherStatus(teacherId);
  }

  return (
    <div className="flex h-full w-full min-h-0 flex-col gap-2.5 overflow-hidden">
      <Seo
        description={universityAdminContent.teachersPage.meta.description}
        noIndex
        title={universityAdminContent.teachersPage.meta.title}
      />
      <AdminPageHeader
        className="gap-2.5 sm:gap-3"
        description=""
        descriptionClassName="max-w-3xl text-sm leading-6 sm:text-[0.95rem]"
        headingAlign="center"
        title={universityAdminContent.teachersPage.title}
        titleClassName="text-center text-[1.35rem] leading-tight sm:text-[2rem]"
      />
      {successNotice ? (
        <SurfaceCard
          className="border border-emerald-200 bg-emerald-50/90 text-sm font-medium text-emerald-800"
          paddingClassName="p-3 sm:p-3.5"
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
          paddingClassName="p-3 sm:p-3.5"
        >
          <p role="alert">{errorMessage}</p>
        </SurfaceCard>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-2 md:flex md:flex-row md:items-stretch md:gap-2.5">
        <SurfaceCard
          className="min-w-0 flex-1 overflow-hidden bg-brand-gradient text-white md:flex-[1.6]"
          paddingClassName="p-0"
        >
          <div className="flex h-full items-center gap-2 py-1.25 pl-3.5 pr-2.25 sm:gap-2.5 sm:px-3.5 sm:py-2">
            <span className="inline-flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-[0.75rem] bg-white/12 text-white ring-1 ring-white/20 sm:h-7 sm:w-7 sm:rounded-[0.75rem]">
              <Presentation
                aria-hidden="true"
                className="h-3.25 w-3.25 sm:h-3.25 sm:w-3.25"
              />
            </span>
            <div className="min-w-0 ml-0.5 flex items-baseline gap-1 sm:ml-0 sm:block">
              <span className="font-headline text-[0.76rem] font-extrabold tracking-tight text-white sm:text-[1.45rem]">
                {teachers.length}
              </span>
              <span className="text-[0.76rem] font-semibold text-white/92 sm:hidden">
                docentes
              </span>
            </div>
            <p className="hidden min-w-0 text-[0.74rem] font-semibold text-white/90 sm:block sm:text-[0.8rem]">
              {universityAdminContent.teachersPage.summaryLabel}
            </p>
          </div>
        </SurfaceCard>
        <Link
          className="inline-flex min-h-[2.7rem] items-center justify-center gap-1.5 whitespace-nowrap rounded-[1rem] bg-brand-gradient px-3 py-1.75 text-[0.76rem] font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 sm:min-h-[3rem] sm:gap-2 sm:rounded-[1.4rem] sm:px-3.5 sm:py-2.25 sm:text-[0.82rem] md:min-w-[11.5rem] md:flex-none"
          to={ROUTES.universityRegisterTeacher}
        >
          <Plus aria-hidden="true" className="h-3.25 w-3.25 sm:h-4 sm:w-4" />
          <span>
            {universityAdminContent.teachersPage.actionLabels.register}
          </span>
        </Link>
      </div>
      <AdminPanelCard className="flex-1" panelClassName="bg-[#f4f8ff]">
        <div className="border-b border-slate-200/80 px-3 py-2 sm:px-5 sm:py-3.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <h2 className="hidden font-headline text-[1rem] font-extrabold tracking-tight text-ink sm:block sm:text-[1.25rem]">
              {universityAdminContent.teachersPage.tableTitle}
            </h2>
            <div className="flex min-w-0 items-center gap-2 sm:w-full sm:max-w-[26rem] sm:justify-end sm:gap-2.5 xl:max-w-[30rem]">
              <label
                className="relative min-w-0 flex-1"
                htmlFor="university-teacher-search"
              >
                <span className="sr-only">
                  {universityAdminContent.teachersPage.searchLabel}
                </span>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-3 w-3 -translate-y-1/2 text-ghost sm:left-4 sm:h-4 sm:w-4"
                />
                <input
                  className="h-10 w-full rounded-full border border-slate-200/90 bg-white/98 py-0 pl-9 pr-3.5 text-[0.76rem] text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 placeholder:text-ghost/80 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-10 sm:pl-10 sm:pr-4 sm:text-[0.82rem]"
                  id="university-teacher-search"
                  placeholder={
                    universityAdminContent.teachersPage.searchPlaceholder
                  }
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>
              <div className="relative shrink-0" ref={statusMenuRef}>
                <button
                  aria-controls="university-teacher-status-menu"
                  aria-expanded={isStatusMenuOpen}
                  aria-haspopup="menu"
                  aria-label={
                    statusFilter === 'all'
                      ? 'Filtrar docentes por estado'
                      : `Filtrar docentes por estado. Actual: ${
                          teacherFilterOptions.find(
                            (option) => option.value === statusFilter,
                          )?.label
                        }`
                  }
                  className={classNames(
                    'relative inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white/98 text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-10 sm:w-10',
                    statusFilter === 'all'
                      ? 'border-slate-200/90 hover:border-primary/30 hover:bg-white'
                      : 'border-primary/25 bg-primary/[0.08] text-primary hover:bg-primary/[0.12]',
                  )}
                  type="button"
                  onClick={() => setIsStatusMenuOpen((current) => !current)}
                >
                  <SlidersHorizontal
                    aria-hidden="true"
                    className="h-[1rem] w-[1rem] sm:h-[1.05rem] sm:w-[1.05rem]"
                  />
                  {statusFilter !== 'all' ? (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
                  ) : null}
                </button>
                {isStatusMenuOpen ? (
                  <div
                    className="absolute right-0 top-[calc(100%+0.55rem)] z-20 w-[13rem] overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-white/95 p-2 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] backdrop-blur sm:w-[14rem]"
                    id="university-teacher-status-menu"
                    role="menu"
                  >
                    <div className="px-2.5 pb-2 pt-1">
                      <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-primary/75">
                        Filtrar por estado
                      </p>
                    </div>
                    <div className="space-y-1">
                      {teacherFilterOptions.map((option) => {
                        const isSelected = statusFilter === option.value;

                        return (
                          <button
                            key={option.value}
                            aria-checked={isSelected}
                            className={classNames(
                              'flex w-full items-center justify-between rounded-[0.95rem] px-3 py-2 text-left text-[0.82rem] font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
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
        {filteredTeachers.length > 0 ? (
          <div className="admin-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="w-full min-w-0">
              <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[54%] sm:w-[35%]" />
                <col className="hidden sm:table-column sm:w-[21%]" />
                <col className="w-[22%] sm:w-[16%]" />
                <col className="w-[24%] sm:w-[28%]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-slate-100 text-left">
                <tr className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-ink-muted sm:text-[0.64rem] sm:tracking-[0.16em]">
                  <th className="px-2.5 py-2 sm:px-4 sm:py-2.5">
                    Docente
                  </th>
                  <th className="hidden px-2.5 py-2 sm:table-cell sm:px-3 sm:py-2.5">
                    Documento
                  </th>
                  <th className="py-2 pl-1 pr-3 text-center sm:px-3 sm:py-2.5">
                    Estado
                  </th>
                  <th className="py-2 pl-3 pr-1.5 text-center sm:px-4 sm:py-2.5">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {filteredTeachers.map((teacher, index) => {
                  const isLast = index === filteredTeachers.length - 1;
                  const isUpdatingStatus = pendingStatusTeacherIds.includes(
                    teacher.id,
                  );

                  return (
                    <tr key={teacher.id} className="align-top">
                      <td
                        className={classNames(
                          'overflow-hidden px-2.5 pt-2.5 sm:px-4 sm:pt-3',
                          isLast ? 'pb-3 sm:pb-3.5' : 'pb-2.5 sm:pb-3',
                        )}
                      >
                        <div
                          className="min-w-0 space-y-1 sm:space-y-1"
                          data-testid={`university-teacher-mobile-summary-${teacher.id}`}
                        >
                          <p className="break-words text-[0.78rem] font-semibold leading-tight text-ink sm:text-[0.83rem]">
                            {formatDisplayName(
                              `${teacher.firstName} ${teacher.lastName}`,
                            )}
                          </p>
                          <p className="text-[0.68rem] font-semibold leading-tight text-ink-muted sm:hidden">
                            {formatDocumentLabel(
                              teacher.documentTypeCode,
                              teacher.documentNumber,
                            )}
                          </p>
                          <p className="text-[0.68rem] leading-tight text-ink-muted sm:text-[0.76rem]">
                            <span className="sm:hidden">
                              Registro del docente{' '}
                            </span>
                            <span className="hidden sm:inline">
                              Registrado{' '}
                            </span>
                            {new Date(teacher.createdAt).toLocaleDateString(
                              'es-CO',
                            )}
                          </p>
                        </div>
                      </td>
                      <td
                        className={classNames(
                          'hidden px-2.5 pt-2.5 sm:table-cell sm:px-3 sm:pt-3',
                          isLast ? 'pb-3 sm:pb-3.5' : 'pb-2.5 sm:pb-3',
                        )}
                      >
                        <p className="break-words text-left text-[0.78rem] font-medium text-ink sm:text-[0.83rem]">
                          {formatDocumentLabel(
                            teacher.documentTypeCode,
                            teacher.documentNumber,
                          )}
                        </p>
                      </td>
                      <td
                        className={classNames(
                          'pt-2.5 pl-1 pr-3 text-center sm:px-3 sm:pt-3',
                          isLast ? 'pb-3 sm:pb-3.5' : 'pb-2.5 sm:pb-3',
                        )}
                      >
                        <div className="flex items-center justify-center">
                          <AdminStatusBadge
                            entity="teacher"
                            size="compact-mobile"
                            status={teacher.status}
                          />
                        </div>
                      </td>
                      <td
                        className={classNames(
                          'overflow-hidden pt-2.5 pl-3 pr-1.5 text-center sm:px-4 sm:pt-3.5',
                          isLast ? 'pb-3 sm:pb-3.5' : 'pb-2.5 sm:pb-3',
                        )}
                      >
                        <div className="flex items-center justify-center sm:mt-0.5">
                          <button
                            className={classNames(
                              'inline-flex items-center gap-0.5 rounded-full px-2.25 py-0.5 text-[0.68rem] font-semibold leading-none transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-65 sm:gap-1.5 sm:px-3 sm:py-1 sm:text-xs sm:leading-normal',
                              teacher.status === 'active'
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'bg-primary/10 text-primary hover:bg-primary/15',
                            )}
                            disabled={isUpdatingStatus}
                            type="button"
                            onClick={() => {
                              setStatusConfirmationTeacher(teacher);
                            }}
                          >
                            {teacher.status === 'active' ? (
                              <PowerOff
                                aria-hidden="true"
                                className="h-3 w-3 sm:h-3.5 sm:w-3.5"
                              />
                            ) : (
                              <Power
                                aria-hidden="true"
                                className="h-3 w-3 sm:h-3.5 sm:w-3.5"
                              />
                            )}
                            <span>
                              {teacher.status === 'active'
                                ? universityAdminContent.teachersPage
                                    .actionLabels.deactivate
                                : universityAdminContent.teachersPage
                                    .actionLabels.activate}
                            </span>
                          </button>
                        </div>
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
              {isLoading
                ? 'Cargando docentes...'
                : normalizedSearch || statusFilter !== 'all'
                  ? 'No encontramos docentes con los filtros seleccionados.'
                  : universityAdminContent.teachersPage.emptyState}
            </p>
          </div>
        )}
      </AdminPanelCard>
      <AdminConfirmationDialog
        cancelLabel="No, cancelar"
        confirmLabel={statusConfirmationConfirmLabel}
        description={statusConfirmationDescription}
        icon={statusConfirmationAction === 'deactivate' ? PowerOff : Power}
        isOpen={Boolean(statusConfirmationTeacher)}
        isSubmitting={isStatusConfirmationSubmitting}
        title={statusConfirmationTitle}
        tone={statusConfirmationAction === 'deactivate' ? 'danger' : 'primary'}
        onCancel={handleCloseStatusConfirmation}
        onConfirm={handleConfirmStatusToggle}
      />
    </div>
  );
}
