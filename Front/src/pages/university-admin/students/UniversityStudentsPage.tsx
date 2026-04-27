import {
  Check,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Plus,
  Power,
  PowerOff,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { AdminConfirmationDialog } from '@/components/admin/AdminConfirmationDialog';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { ROUTES } from '@/constants/routes';
import { universityAdminContent } from '@/content/universityAdminContent';
import type {
  PersonOperationalStatus,
  UniversityStudent,
} from '@/content/types';
import { classNames } from '@/lib/classNames';
import { formatDisplayName } from '@/lib/formatDisplayName';
import { useUniversityAdminStudentRecordsStore } from '@/lib/universityAdminStudentRecordsStore';

type StudentsLocationState = {
  successNotice?: string;
} | null;

type StudentStatusFilter = PersonOperationalStatus | 'all' | 'pending';
type StudentStatusConfirmationAction = 'activate' | 'deactivate';

const DEFAULT_ROWS_PER_PAGE = 5;
const MIN_ROWS_PER_PAGE = 1;
const TABLE_HEADER_HEIGHT_PX = 38;
const TABLE_ROW_HEIGHT_FALLBACK_PX = 72;
const TABLE_HEIGHT_PADDING_PX = 0;

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
  const {
    credentials,
    errorMessage,
    isLoading,
    students,
    toggleStudentStatus,
  } = useUniversityAdminStudentRecordsStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StudentStatusFilter>('all');
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [statusConfirmationStudent, setStatusConfirmationStudent] =
    useState<UniversityStudent | null>(null);
  const [pendingStatusStudentIds, setPendingStatusStudentIds] = useState<
    string[]
  >([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const pendingStatusStudentIdsRef = useRef(new Set<string>());
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const tableViewportRef = useRef<HTMLDivElement | null>(null);
  const tableBodyRef = useRef<HTMLTableSectionElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const successNotice = getLocationState(location.state)?.successNotice ?? null;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const studentFilterOptions: Array<{
    label: string;
    value: StudentStatusFilter;
  }> = [
    { label: 'Todos', value: 'all' },
    { label: 'Pendiente', value: 'pending' },
    { label: 'Activo', value: 'active' },
    { label: 'Inactivo', value: 'inactive' },
  ];
  const credentialByStudentId = new Map(
    credentials.map((credential) => [credential.studentId, credential]),
  );
  const filteredStudents = students.filter((student) => {
    const normalizedFullName =
      `${student.firstName} ${student.lastName}`.toLowerCase();
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
  const emptyStateMessage = isLoading
    ? 'Cargando estudiantes...'
    : normalizedSearch || statusFilter !== 'all'
      ? 'No encontramos estudiantes con los filtros seleccionados.'
      : universityAdminContent.studentsPage.emptyState;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / rowsPerPage),
  );
  const clampedCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (clampedCurrentPage - 1) * rowsPerPage;
  const paginatedStudents = useMemo(
    () => filteredStudents.slice(pageStartIndex, pageStartIndex + rowsPerPage),
    [filteredStudents, pageStartIndex, rowsPerPage],
  );
  const pageStartLabel = filteredStudents.length > 0 ? pageStartIndex + 1 : 0;
  const pageEndLabel = Math.min(
    pageStartIndex + paginatedStudents.length,
    filteredStudents.length,
  );
  const isStatusConfirmationSubmitting = Boolean(
    statusConfirmationStudent &&
    pendingStatusStudentIds.includes(statusConfirmationStudent.id),
  );
  const statusConfirmationAction: StudentStatusConfirmationAction =
    statusConfirmationStudent?.status === 'active' ? 'deactivate' : 'activate';
  const statusConfirmationTitle =
    statusConfirmationAction === 'deactivate'
      ? '¿Quieres inactivar este estudiante?'
      : '¿Quieres activar este estudiante?';
  const statusConfirmationDescription = statusConfirmationStudent
    ? statusConfirmationAction === 'deactivate'
      ? `El estudiante ${formatDisplayName(`${statusConfirmationStudent.firstName} ${statusConfirmationStudent.lastName}`)} quedará inactivo y no podrá operar dentro de la plataforma hasta que lo actives nuevamente.`
      : `El estudiante ${formatDisplayName(`${statusConfirmationStudent.firstName} ${statusConfirmationStudent.lastName}`)} quedará activo y podrá operar dentro de la plataforma.`
    : '';
  const statusConfirmationConfirmLabel =
    statusConfirmationAction === 'deactivate' ? 'Sí, inactivar' : 'Sí, activar';

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
    const tableViewportElement = tableViewportRef.current;

    if (!tableViewportElement) {
      return undefined;
    }

    const tableViewport = tableViewportElement;

    function updateRowsPerPage() {
      const nextAvailableHeight = tableViewport.getBoundingClientRect().height;

      if (nextAvailableHeight <= 0) {
        return;
      }

      const tableHeaderHeight =
        tableViewport.querySelector('thead')?.getBoundingClientRect().height ??
        TABLE_HEADER_HEIGHT_PX;
      const rowHeights = Array.from(
        tableBodyRef.current?.querySelectorAll('tr') ?? [],
        (row) => row.getBoundingClientRect().height,
      ).filter((height) => height > 0);
      const estimatedRowHeight =
        rowHeights.length > 0
          ? rowHeights.reduce((total, height) => total + height, 0) /
            rowHeights.length
          : TABLE_ROW_HEIGHT_FALLBACK_PX;
      const nextRowsPerPage = Math.max(
        MIN_ROWS_PER_PAGE,
        Math.floor(
          (nextAvailableHeight - tableHeaderHeight - TABLE_HEIGHT_PADDING_PX) /
            estimatedRowHeight,
        ),
      );

      setRowsPerPage((currentRowsPerPage) =>
        currentRowsPerPage === nextRowsPerPage
          ? currentRowsPerPage
          : nextRowsPerPage,
      );
    }

    updateRowsPerPage();

    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(updateRowsPerPage);
      resizeObserver.observe(tableViewport);

      return () => {
        resizeObserver.disconnect();
      };
    }

    window.addEventListener('resize', updateRowsPerPage);

    return () => {
      window.removeEventListener('resize', updateRowsPerPage);
    };
  }, [filteredStudents.length, pageStartIndex, paginatedStudents.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedSearch, statusFilter]);

  useEffect(() => {
    setCurrentPage((currentValue) => Math.min(currentValue, totalPages));
  }, [totalPages]);

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

  function handleCloseStatusConfirmation() {
    setStatusConfirmationStudent(null);
  }

  function handleToggleStudentStatus(studentId: string) {
    if (pendingStatusStudentIdsRef.current.has(studentId)) {
      return;
    }

    pendingStatusStudentIdsRef.current.add(studentId);
    setPendingStatusStudentIds((currentIds) => [...currentIds, studentId]);

    void toggleStudentStatus(studentId).finally(() => {
      pendingStatusStudentIdsRef.current.delete(studentId);
      setPendingStatusStudentIds((currentIds) =>
        currentIds.filter((currentId) => currentId !== studentId),
      );
    });
  }

  function handleConfirmStatusToggle() {
    if (!statusConfirmationStudent) {
      return;
    }

    const studentId = statusConfirmationStudent.id;

    setStatusConfirmationStudent(null);
    handleToggleStudentStatus(studentId);
  }

  return (
    <div className="flex h-full w-full min-h-0 flex-col gap-2.5 overflow-hidden">
      <Seo
        description={universityAdminContent.studentsPage.meta.description}
        noIndex
        title={universityAdminContent.studentsPage.meta.title}
      />
      <AdminPageHeader
        className="gap-2.5 sm:gap-3"
        description=""
        descriptionClassName="max-w-3xl text-sm leading-6 sm:text-[0.95rem]"
        headingAlign="center"
        title={universityAdminContent.studentsPage.title}
        titleClassName="text-center text-[1.35rem] leading-tight sm:text-[2rem]"
      />
      {successNotice ? (
        <SurfaceCard
          className="border border-emerald-200 bg-emerald-50/90 text-sm font-medium text-emerald-800"
          paddingClassName="p-3 sm:p-3.5"
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
              <GraduationCap
                aria-hidden="true"
                className="h-3.25 w-3.25 sm:h-3.25 sm:w-3.25"
              />
            </span>
            <div className="min-w-0 flex items-baseline gap-1 ml-0.5 sm:ml-0 sm:block">
              <span className="font-headline text-[0.76rem] font-extrabold tracking-tight text-white sm:text-[1.45rem]">
                {students.length}
              </span>
              <span className="text-[0.76rem] font-semibold text-white/92 sm:hidden">
                estudiantes
              </span>
            </div>
            <p className="hidden min-w-0 text-[0.74rem] font-semibold text-white/90 sm:block sm:text-[0.8rem]">
              {universityAdminContent.studentsPage.summaryLabel}
            </p>
          </div>
        </SurfaceCard>
        <Link
          className="inline-flex min-h-[2.7rem] items-center justify-center gap-1.5 whitespace-nowrap rounded-[1rem] bg-brand-gradient px-3 py-1.75 text-[0.76rem] font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 sm:min-h-[3rem] sm:gap-2 sm:rounded-[1.4rem] sm:px-3.5 sm:py-2.25 sm:text-[0.82rem] md:min-w-[12.5rem] md:flex-none"
          to={ROUTES.universityRegisterStudent}
        >
          <Plus aria-hidden="true" className="h-3.25 w-3.25 sm:h-4 sm:w-4" />
          <span>
            {universityAdminContent.studentsPage.actionLabels.register}
          </span>
        </Link>
      </div>
      <AdminPanelCard className="min-h-0 flex-1" panelClassName="bg-[#f4f8ff]">
        <div className="border-b border-slate-200/80 px-3 py-2 sm:px-5 sm:py-3.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <h2 className="hidden font-headline text-[1rem] font-extrabold tracking-tight text-ink sm:block sm:text-[1.25rem]">
              {universityAdminContent.studentsPage.tableTitle}
            </h2>
            <div className="flex min-w-0 items-center gap-2 sm:w-full sm:max-w-[26rem] sm:justify-end sm:gap-2.5 xl:max-w-[30rem]">
              <label
                className="relative min-w-0 flex-1"
                htmlFor="university-student-search"
              >
                <span className="sr-only">
                  {universityAdminContent.studentsPage.searchLabel}
                </span>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-3 w-3 -translate-y-1/2 text-ghost sm:left-4 sm:h-4 sm:w-4"
                />
                <input
                  className="h-10 w-full rounded-full border border-slate-200/90 bg-white/98 py-0 pl-9 pr-3.5 text-[0.76rem] text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 placeholder:text-ghost/80 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 sm:h-10 sm:pl-10 sm:pr-4 sm:text-[0.82rem]"
                  id="university-student-search"
                  placeholder={
                    universityAdminContent.studentsPage.searchPlaceholder
                  }
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
                          studentFilterOptions.find(
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
        {filteredStudents.length > 0 ? (
          <>
            <div
              ref={tableViewportRef}
              className="min-h-0 flex-1 overflow-x-hidden overflow-y-hidden md:overflow-x-auto [-webkit-overflow-scrolling:touch]"
            >
              <div className="w-full min-w-0">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[56%] sm:w-[21%]" />
                    <col className="hidden sm:table-column sm:w-[17%]" />
                    <col className="hidden sm:table-column sm:w-[22%]" />
                    <col className="hidden sm:table-column sm:w-[9%]" />
                    <col className="w-[18%] sm:w-[13%]" />
                    <col className="w-[26%] sm:w-[18%]" />
                  </colgroup>
                  <thead className="sticky top-0 z-10 bg-slate-100 text-left">
                    <tr className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-ink-muted sm:text-[0.64rem] sm:tracking-[0.16em]">
                      <th className="px-2.5 py-2 sm:px-4 sm:py-2.5">
                        Estudiante
                      </th>
                      <th className="hidden px-2.5 py-2 sm:table-cell sm:px-3 sm:py-2.5">
                        Documento
                      </th>
                      <th className="hidden px-2.5 py-2 sm:table-cell sm:px-3.5 sm:py-2.5">
                        Correo
                      </th>
                      <th className="hidden px-2 py-2 text-center sm:table-cell sm:px-3 sm:py-2.5">
                        Semestre
                      </th>
                      <th className="px-2 py-2 text-center sm:px-3 sm:py-2.5">
                        Estado
                      </th>
                      <th className="px-2.5 py-2 text-center sm:px-4 sm:py-2.5">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    ref={tableBodyRef}
                    className="divide-y divide-slate-200/80"
                  >
                    {paginatedStudents.map((student, index) => {
                      const credential = credentialByStudentId.get(student.id);
                      const displayStatus: PersonOperationalStatus | 'pending' =
                        credential?.deliveryStatus === 'generated'
                          ? 'pending'
                          : student.status;
                      const isLast = index === paginatedStudents.length - 1;
                      const isUpdatingStatus = pendingStatusStudentIds.includes(
                        student.id,
                      );

                      return (
                        <tr key={student.id} className="align-top">
                          <td
                            className={classNames(
                              'overflow-hidden px-2.5 pt-2.5 sm:px-4 sm:pt-3',
                              isLast ? 'pb-3 sm:pb-3.5' : 'pb-2.5 sm:pb-3',
                            )}
                          >
                            <div
                              className="min-w-0 space-y-1 sm:space-y-1"
                              data-testid={`university-student-mobile-summary-${student.id}`}
                            >
                              <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                                <p className="break-words text-[0.78rem] font-semibold leading-tight text-ink sm:text-[0.83rem]">
                                  {formatDisplayName(
                                    `${student.firstName} ${student.lastName}`,
                                  )}
                                </p>
                                <span className="text-[0.68rem] font-semibold text-ink-muted sm:hidden">
                                  ·
                                </span>
                                <p className="text-[0.68rem] font-semibold leading-tight text-ink-muted sm:hidden">
                                  Semestre {student.semester}
                                </p>
                              </div>
                              <p className="text-[0.68rem] font-semibold leading-tight text-ink-muted sm:hidden">
                                {formatDocumentLabel(
                                  student.documentTypeCode,
                                  student.documentNumber,
                                )}
                              </p>
                              <p
                                className="break-all text-[0.68rem] leading-tight text-ink-muted sm:hidden"
                                title={student.email}
                              >
                                {student.email}
                              </p>
                              <p className="text-[0.68rem] leading-tight text-ink-muted sm:text-[0.76rem]">
                                <span className="sm:hidden">
                                  Registro del estudiante{' '}
                                </span>
                                <span className="hidden sm:inline">
                                  Registrado{' '}
                                </span>
                                {new Date(student.createdAt).toLocaleDateString(
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
                                student.documentTypeCode,
                                student.documentNumber,
                              )}
                            </p>
                          </td>
                          <td
                            className={classNames(
                              'hidden overflow-hidden px-2.5 pt-2.5 sm:table-cell sm:px-3.5 sm:pt-3',
                              isLast ? 'pb-3 sm:pb-3.5' : 'pb-2.5 sm:pb-3',
                            )}
                          >
                            <p
                              className="block truncate text-[0.76rem] text-ink-muted sm:text-sm"
                              title={student.email}
                            >
                              {student.email}
                            </p>
                          </td>
                          <td
                            className={classNames(
                              'hidden px-2 pt-2.5 text-center sm:table-cell sm:px-3 sm:pt-3.5',
                              isLast ? 'pb-3 sm:pb-4' : 'pb-2.5 sm:pb-3.5',
                            )}
                          >
                            <div className="flex items-center justify-center">
                              <span className="text-[0.78rem] font-normal text-ink sm:text-[0.83rem]">
                                {student.semester}
                              </span>
                            </div>
                          </td>
                          <td
                            className={classNames(
                              'px-2 pt-2.5 text-center sm:px-3 sm:pt-3',
                              isLast ? 'pb-3 sm:pb-3.5' : 'pb-2.5 sm:pb-3',
                            )}
                          >
                            <div className="flex items-center justify-center">
                              <AdminStatusBadge
                                entity="student"
                                size="compact-mobile"
                                status={displayStatus}
                              />
                            </div>
                          </td>
                          <td
                            className={classNames(
                              'overflow-hidden px-1.5 text-center sm:px-4',
                              displayStatus === 'pending'
                                ? 'pt-2.5 sm:pt-3'
                                : 'pt-2.5 sm:pt-3.5',
                              isLast ? 'pb-3 sm:pb-3.5' : 'pb-2.5 sm:pb-3',
                            )}
                          >
                            <div
                              className={classNames(
                                'flex items-center justify-center',
                                displayStatus === 'pending' ? '' : 'mt-0.5',
                              )}
                            >
                              {displayStatus === 'pending' ? (
                                <span
                                  className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[0.7rem] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 sm:px-3 sm:py-1 sm:text-xs"
                                  title="Envia la credencial primero"
                                >
                                  Pendiente
                                </span>
                              ) : (
                                <button
                                  className={classNames(
                                    'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.62rem] font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-65 sm:gap-1.5 sm:px-3 sm:py-1 sm:text-xs',
                                    student.status === 'active'
                                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                      : 'bg-primary/10 text-primary hover:bg-primary/15',
                                  )}
                                  disabled={isUpdatingStatus}
                                  type="button"
                                  onClick={() => {
                                    setStatusConfirmationStudent(student);
                                  }}
                                >
                                  {student.status === 'active' ? (
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
                                    {student.status === 'active'
                                      ? universityAdminContent.studentsPage
                                          .actionLabels.deactivate
                                      : universityAdminContent.studentsPage
                                          .actionLabels.activate}
                                  </span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200/80 bg-white px-3 py-2.5 text-[0.72rem] font-semibold text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:text-[0.8rem]">
              <p className="text-center sm:text-left">
                Mostrando {pageStartLabel}-{pageEndLabel} de{' '}
                {filteredStudents.length} · Página {clampedCurrentPage} de{' '}
                {totalPages}
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  aria-label="Pagina anterior"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-ink transition duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={clampedCurrentPage === 1}
                  type="button"
                  onClick={() =>
                    setCurrentPage((currentValue) =>
                      Math.max(1, currentValue - 1),
                    )
                  }
                >
                  <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                </button>
                <span className="min-w-[4.25rem] text-center text-[0.72rem] text-ink">
                  {clampedCurrentPage}/{totalPages}
                </span>
                <button
                  aria-label="Pagina siguiente"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-ink transition duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={clampedCurrentPage === totalPages}
                  type="button"
                  onClick={() =>
                    setCurrentPage((currentValue) =>
                      Math.min(totalPages, currentValue + 1),
                    )
                  }
                >
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center px-4 py-8 text-center sm:px-5">
            <p className="text-sm font-medium text-ink-muted">
              {emptyStateMessage}
            </p>
          </div>
        )}
      </AdminPanelCard>
      <AdminConfirmationDialog
        cancelLabel="No, cancelar"
        confirmLabel={statusConfirmationConfirmLabel}
        description={statusConfirmationDescription}
        icon={statusConfirmationAction === 'deactivate' ? PowerOff : Power}
        isOpen={Boolean(statusConfirmationStudent)}
        isSubmitting={isStatusConfirmationSubmitting}
        title={statusConfirmationTitle}
        tone={statusConfirmationAction === 'deactivate' ? 'danger' : 'primary'}
        onCancel={handleCloseStatusConfirmation}
        onConfirm={handleConfirmStatusToggle}
      />
    </div>
  );
}
