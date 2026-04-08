import { Check, GraduationCap, Plus, Power, PowerOff, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { ROUTES } from '@/constants/routes';
import { universityAdminContent } from '@/content/universityAdminContent';
import type { PersonOperationalStatus } from '@/content/types';
import { classNames } from '@/lib/classNames';
import { useUniversityAdminModuleStore } from '@/lib/universityAdminModuleStore';

type StudentsLocationState = {
  successNotice?: string;
} | null;

type StudentStatusFilter = PersonOperationalStatus | 'all' | 'pending';

function getLocationState(locationState: unknown): StudentsLocationState {
  if (!locationState || typeof locationState !== 'object') {
    return null;
  }

  return locationState as StudentsLocationState;
}

function formatDocumentLabel(documentTypeCode: string, documentNumber: string) {
  return `${documentTypeCode} ${documentNumber}`;
}

export function UniversityStudentsPage() {
  const { credentials, errorMessage, isLoading, students, toggleStudentStatus } = useUniversityAdminModuleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StudentStatusFilter>('all');
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const successNotice = getLocationState(location.state)?.successNotice ?? null;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const studentFilterOptions: Array<{ label: string; value: StudentStatusFilter }> = [
    { label: 'Todos', value: 'all' },
    { label: 'Pendiente', value: 'pending' },
    { label: 'Activo', value: 'active' },
    { label: 'Inactivo', value: 'inactive' },
  ];
  const credentialByStudentId = new Map(credentials.map((credential) => [credential.studentId, credential]));
  const filteredStudents = students.filter((student) => {
    const normalizedFullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const credential = credentialByStudentId.get(student.id);
    const derivedStatus: StudentStatusFilter =
      student.status === 'inactive'
        ? 'inactive'
        : credential?.deliveryStatus === 'generated'
          ? 'pending'
          : 'active';

    return (
      (normalizedFullName.includes(normalizedSearch) ||
        student.documentNumber.toLowerCase().includes(normalizedSearch)) &&
      (statusFilter === 'all' || derivedStatus === statusFilter)
    );
  });
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

  return (
    <div className="mx-auto flex h-full max-w-[88rem] min-h-0 flex-col gap-3 overflow-hidden 2xl:max-w-[96rem]">
      <Seo
        description={universityAdminContent.studentsPage.meta.description}
        noIndex
        title={universityAdminContent.studentsPage.meta.title}
      />
      <AdminPageHeader
        className="gap-3"
        description=""
        descriptionClassName="max-w-3xl text-sm leading-6 sm:text-[0.95rem]"
        title={universityAdminContent.studentsPage.title}
        titleClassName="text-[1.85rem] sm:text-[2.2rem]"
      />
      {successNotice ? (
        <SurfaceCard
          className="border border-emerald-200 bg-emerald-50/90 text-sm font-medium text-emerald-800"
          paddingClassName="p-3.5"
        >
          <p role="status">
            <span className="font-semibold">
              {universityAdminContent.studentsPage.successNoticePrefix}
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
      <div className="flex flex-col gap-2.5 md:flex-row md:items-stretch">
        <SurfaceCard
          className="min-w-0 flex-1 overflow-hidden bg-brand-gradient text-white md:flex-[1.6]"
          paddingClassName="p-0"
        >
          <div className="flex items-center gap-2 px-3 py-1.75 sm:gap-2.5 sm:px-3.5 sm:py-2">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[0.8rem] bg-white/12 text-white ring-1 ring-white/20 sm:h-7 sm:w-7">
              <GraduationCap aria-hidden="true" className="h-3.25 w-3.25" />
            </span>
            <span className="font-headline text-[1.28rem] font-extrabold tracking-tight text-white sm:text-[1.45rem]">
              {students.length}
            </span>
            <p className="min-w-0 text-[0.74rem] font-semibold text-white/90 sm:text-[0.8rem]">
              {universityAdminContent.studentsPage.summaryLabel}
            </p>
          </div>
        </SurfaceCard>
        <Link
          className="inline-flex items-center justify-center gap-2 rounded-[1.4rem] bg-brand-gradient px-3.5 py-2.25 text-[0.82rem] font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 md:min-w-[12.5rem] md:flex-none"
          to={ROUTES.universityRegisterStudent}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          <span>{universityAdminContent.studentsPage.actionLabels.register}</span>
        </Link>
      </div>
      <AdminPanelCard className="flex-1" panelClassName="bg-[#f4f8ff]">
        <div className="border-b border-slate-200/80 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <h2 className="font-headline text-[1rem] font-extrabold tracking-tight text-ink sm:text-[1.25rem]">
              {universityAdminContent.studentsPage.tableTitle}
            </h2>
            <div className="flex min-w-0 items-center gap-2 sm:w-full sm:max-w-[26rem] sm:justify-end sm:gap-2.5 xl:max-w-[30rem]">
              <label className="relative min-w-0 flex-1" htmlFor="university-student-search">
                <span className="sr-only">{universityAdminContent.studentsPage.searchLabel}</span>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ghost sm:left-4 sm:h-4 sm:w-4"
                />
                <input
                  className="h-9 w-full rounded-full border border-slate-200/90 bg-white/98 py-0 pl-8 pr-4 text-[0.74rem] text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 placeholder:text-ghost/80 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-10 sm:pl-10 sm:text-[0.82rem]"
                  id="university-student-search"
                  placeholder={universityAdminContent.studentsPage.searchPlaceholder}
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>
              <div className="relative shrink-0" ref={statusMenuRef}>
                <button
                  aria-controls="university-student-status-menu"
                  aria-expanded={isStatusMenuOpen}
                  aria-haspopup="menu"
                  aria-label={
                    statusFilter === 'all'
                      ? 'Filtrar estudiantes por estado'
                      : `Filtrar estudiantes por estado. Actual: ${
                          studentFilterOptions.find((option) => option.value === statusFilter)?.label
                        }`
                  }
                  className={classNames(
                    'relative inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white/98 text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-10 sm:w-10',
                    statusFilter === 'all'
                      ? 'border-slate-200/90 hover:border-primary/30 hover:bg-white'
                      : 'border-primary/25 bg-primary/[0.08] text-primary hover:bg-primary/[0.12]',
                  )}
                  type="button"
                  onClick={() => setIsStatusMenuOpen((current) => !current)}
                >
                  <SlidersHorizontal aria-hidden="true" className="h-4 w-4 sm:h-[1.05rem] sm:w-[1.05rem]" />
                  {statusFilter !== 'all' ? (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
                  ) : null}
                </button>
                {isStatusMenuOpen ? (
                  <div
                    className="absolute right-0 top-[calc(100%+0.55rem)] z-20 w-[13rem] overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-white/95 p-2 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] backdrop-blur sm:w-[14rem]"
                    id="university-student-status-menu"
                    role="menu"
                  >
                    <div className="px-2.5 pb-2 pt-1">
                      <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-primary/75">
                        Filtrar por estado
                      </p>
                    </div>
                    <div className="space-y-1">
                      {studentFilterOptions.map((option) => {
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
        </div>
        {filteredStudents.length > 0 ? (
          <div className="admin-scrollbar min-h-0 flex-1 overflow-x-auto overflow-y-auto">
            <table className="min-w-full">
              <thead className="sticky top-0 z-10 bg-slate-100 text-left">
                <tr className="text-[0.64rem] font-bold uppercase tracking-[0.16em] text-ink-muted">
                  <th className="px-4 py-2.5 sm:px-5">Estudiante</th>
                  <th className="px-4 py-2.5">Documento</th>
                  <th className="px-4 py-2.5">Correo</th>
                  <th className="px-4 py-2.5">Semestre</th>
                  <th className="px-4 py-2.5">Estado</th>
                  <th className="px-4 py-2.5 text-right sm:px-5">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {filteredStudents.map((student, index) => {
                  const credential = credentialByStudentId.get(student.id);
                  const displayStatus: PersonOperationalStatus | 'pending' =
                    credential?.deliveryStatus === 'generated' ? 'pending' : student.status;
                  const isLast = index === filteredStudents.length - 1;

                  return (
                    <tr key={student.id} className="align-top">
                      <td
                        className={classNames(
                          'px-4 pt-3 sm:px-5',
                          isLast ? 'pb-3.5' : 'pb-3',
                        )}
                      >
                        <div className="space-y-1">
                          <p className="text-[0.83rem] font-semibold text-ink">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-[0.72rem] text-ink-muted sm:text-[0.76rem]">
                            Registrado {new Date(student.createdAt).toLocaleDateString('es-CO')}
                          </p>
                        </div>
                      </td>
                      <td
                        className={classNames(
                          'px-4 pt-3',
                          isLast ? 'pb-3.5' : 'pb-3',
                        )}
                      >
                        <p className="text-[0.83rem] font-medium text-ink">
                          {formatDocumentLabel(student.documentTypeCode, student.documentNumber)}
                        </p>
                      </td>
                      <td
                        className={classNames(
                          'px-4 pt-3',
                          isLast ? 'pb-3.5' : 'pb-3',
                        )}
                      >
                        <p className="text-sm text-ink-muted">{student.email}</p>
                      </td>
                      <td
                        className={classNames(
                          'px-4 pt-3.5',
                          isLast ? 'pb-4' : 'pb-3.5',
                        )}
                      >
                        <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[0.7rem] font-semibold text-sky-700 ring-1 ring-inset ring-sky-200">
                          {student.semester}
                        </span>
                      </td>
                      <td
                        className={classNames(
                          'px-4 pt-3',
                          isLast ? 'pb-3.5' : 'pb-3',
                        )}
                      >
                        <AdminStatusBadge entity="student" status={displayStatus} />
                      </td>
                      <td
                        className={classNames(
                          'px-4 pt-3 text-right sm:px-5',
                          isLast ? 'pb-3.5' : 'pb-3',
                        )}
                      >
                        {displayStatus === 'pending' ? (
                          <span
                            className="inline-flex rounded-full bg-amber-50 px-2.25 py-1.25 text-[0.68rem] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200"
                            title="Envia la credencial primero"
                          >
                            Pendiente
                          </span>
                        ) : (
                          <button
                            className={classNames(
                               'inline-flex items-center gap-1.25 rounded-full px-2.25 py-1.25 text-[0.68rem] font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                              student.status === 'active'
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'bg-primary/10 text-primary hover:bg-primary/15',
                            )}
                            type="button"
                            onClick={() => {
                              void toggleStudentStatus(student.id);
                            }}
                          >
                            {student.status === 'active' ? (
                              <PowerOff aria-hidden="true" className="h-3.5 w-3.5" />
                            ) : (
                              <Power aria-hidden="true" className="h-3.5 w-3.5" />
                            )}
                            <span>
                              {student.status === 'active'
                                ? universityAdminContent.studentsPage.actionLabels.deactivate
                                : universityAdminContent.studentsPage.actionLabels.activate}
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
        ) : (
          <div className="flex flex-1 items-center justify-center px-4 py-8 text-center sm:px-5">
            <p className="text-sm font-medium text-ink-muted">
              {isLoading
                ? 'Cargando estudiantes...'
                : normalizedSearch || statusFilter !== 'all'
                  ? 'No encontramos estudiantes con los filtros seleccionados.'
                  : universityAdminContent.studentsPage.emptyState}
            </p>
          </div>
        )}
      </AdminPanelCard>
    </div>
  );
}
