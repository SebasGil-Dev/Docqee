import {
  MapPin,
  Search,
  SendHorizontal,
  ShieldCheck,
  Star,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { patientContent } from '@/content/patientContent';
import type { PatientStudentDirectoryItem } from '@/content/types';
import { IS_TEST_MODE } from '@/lib/apiClient';
import { classNames } from '@/lib/classNames';
import { formatDisplayName } from '@/lib/formatDisplayName';
import { getOptimizedAvatarUrl } from '@/lib/imageOptimization';
import { usePatientModuleStore } from '@/lib/patientModuleStore';

type NamedFilter = string;

function getStudentFullName(student: PatientStudentDirectoryItem) {
  return formatDisplayName(`${student.firstName} ${student.lastName}`);
}

function getStudentInitials(student: PatientStudentDirectoryItem) {
  return `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase();
}

function getStudentLocation(student: PatientStudentDirectoryItem) {
  const locationParts = [student.city, student.locality].filter(Boolean);

  return locationParts.length ? locationParts.join(' - ') : 'Ubicacion por confirmar';
}

function getStudentPracticeSite(student: PatientStudentDirectoryItem) {
  return student.practiceSite || 'Sede por confirmar';
}

function getStudentAvailability(student: PatientStudentDirectoryItem) {
  return student.availabilityGeneral || 'Disponibilidad por confirmar';
}

function getRatingLabel(student: PatientStudentDirectoryItem) {
  if (!student.averageRating || student.reviewsCount === 0) {
    return 'Sin calificacion';
  }

  return `${student.averageRating.toFixed(1)} (${student.reviewsCount})`;
}

function renderStars(value: number | null, sizeClassName = 'h-3.5 w-3.5') {
  return Array.from({ length: 5 }, (_, index) => {
    const isFilled = value !== null && index < Math.round(value);

    return (
      <Star
        key={`patient-search-star-${value ?? 'empty'}-${index}`}
        aria-hidden="true"
        className={`${sizeClassName} ${
          isFilled ? 'fill-amber-300 text-amber-300' : 'text-slate-300'
        }`}
      />
    );
  });
}

export function PatientSearchStudentsPage() {
  const {
    createRequest,
    errorMessage,
    isLoading,
    isReady,
    isSearchingStudents,
    requests,
    searchStudents,
    studentFilters,
    students,
  } = usePatientModuleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [hasInteractedWithSearch, setHasInteractedWithSearch] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [treatmentFilter, setTreatmentFilter] = useState<NamedFilter>('all');
  const [cityFilter, setCityFilter] = useState<NamedFilter>('all');
  const [localityFilter, setLocalityFilter] = useState<NamedFilter>('all');
  const [universityFilter, setUniversityFilter] = useState<NamedFilter>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const latestSearchFiltersRef = useRef({
    city: 'all',
    locality: 'all',
    search: '',
    treatment: 'all',
    university: 'all',
  });
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const hasSearchCriteria = Boolean(
    normalizedSearch ||
      treatmentFilter !== 'all' ||
      cityFilter !== 'all' ||
      localityFilter !== 'all' ||
      universityFilter !== 'all',
  );
  const treatmentOptions = useMemo(
    () =>
      studentFilters.treatments.map((treatment) => ({
        label: treatment,
        value: treatment,
      })),
    [studentFilters.treatments],
  );
  const cityOptions = studentFilters.cities;
  const localityOptions = useMemo(
    () =>
      studentFilters.localities.filter(
        (locality) => cityFilter === 'all' || locality.cityValue === cityFilter,
      ),
    [cityFilter, studentFilters.localities],
  );
  const universityOptions = useMemo(
    () =>
      studentFilters.universities.map((university) => ({
        label: university,
        value: university,
      })),
    [studentFilters.universities],
  );
  const selectedStudent = selectedStudentId
    ? students.find((student) => student.id === selectedStudentId) ?? null
    : null;
  const currentRequestForSelectedStudent = selectedStudent
    ? requests.find(
        (request) =>
          request.studentId === selectedStudent.id &&
          (request.status === 'PENDIENTE' || request.status === 'ACEPTADA'),
      ) ?? null
    : null;

  useEffect(() => {
    if (
      selectedStudentId &&
      !students.some((student) => student.id === selectedStudentId)
    ) {
      setSelectedStudentId(null);
    }
  }, [selectedStudentId, students]);

  useEffect(() => {
    if (IS_TEST_MODE || !isReady || !hasInteractedWithSearch) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void searchStudents({
        city: cityFilter,
        limit: hasSearchCriteria ? 20 : 6,
        locality: localityFilter,
        search: searchTerm,
        treatment: treatmentFilter,
        university: universityFilter,
      });
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    cityFilter,
    hasInteractedWithSearch,
    hasSearchCriteria,
    isReady,
    localityFilter,
    searchStudents,
    searchTerm,
    treatmentFilter,
    universityFilter,
  ]);

  useEffect(() => {
    setReason('');
    setReasonError(null);
  }, [selectedStudentId]);

  useEffect(() => {
    if (!selectedStudentId) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSelectedStudentId(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedStudentId]);

  const handleOpenStudentModal = (studentId: string) => {
    setSelectedStudentId(studentId);
    setSuccessMessage(null);
  };

  const handleCloseStudentModal = () => {
    setSelectedStudentId(null);
  };

  const handleSendRequest = () => {
    if (!selectedStudent) {
      return;
    }

    const normalizedReason = reason.trim();

    if (!normalizedReason) {
      setReasonError('Describe brevemente el motivo de tu solicitud.');
      return;
    }

    void (async () => {
      const createdRequest = await createRequest(selectedStudent.id, normalizedReason);

      if (!createdRequest) {
        setReasonError(
          'Ya tienes una solicitud activa con este estudiante o la informacion no es valida.',
        );
        return;
      }

      setReason('');
      setReasonError(null);
      setSuccessMessage(
        `Tu solicitud fue enviada a ${getStudentFullName(selectedStudent)} y quedo en estado pendiente.`,
      );
      setSelectedStudentId(null);
    })();
  };

  const runImmediateSearchInTest = (filters: {
    city?: NamedFilter;
    locality?: NamedFilter;
    search?: string;
    treatment?: NamedFilter;
    university?: NamedFilter;
  }) => {
    if (!IS_TEST_MODE) {
      return;
    }

    const nextTreatment = filters.treatment ?? latestSearchFiltersRef.current.treatment;
    const nextCity = filters.city ?? latestSearchFiltersRef.current.city;
    const nextLocality = filters.locality ?? latestSearchFiltersRef.current.locality;
    const nextUniversity = filters.university ?? latestSearchFiltersRef.current.university;
    const resolvedSearch = filters.search ?? latestSearchFiltersRef.current.search;
    const nextHasSearchCriteria = Boolean(
      resolvedSearch.trim() ||
        nextTreatment !== 'all' ||
        nextCity !== 'all' ||
        nextLocality !== 'all' ||
        nextUniversity !== 'all',
    );

    void searchStudents({
      city: nextCity,
      limit: nextHasSearchCriteria ? 20 : 6,
      locality: nextLocality,
      search: resolvedSearch,
      treatment: nextTreatment,
      university: nextUniversity,
    });
  };

  return (
    <div className="mx-auto flex h-full max-w-[90rem] min-h-0 flex-col gap-2.5 overflow-hidden 2xl:max-w-[98rem]">
      <Seo
        description={patientContent.searchPage.meta.description}
        noIndex
        title={patientContent.searchPage.meta.title}
      />
      <div className="flex flex-col gap-2 rounded-[1.15rem] border border-slate-200/80 bg-white px-3.5 py-3 shadow-[0_14px_36px_-28px_rgba(15,23,42,0.42)] sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="min-w-0">
          <h1 className="font-headline text-xl font-extrabold leading-tight tracking-tight text-ink sm:text-[1.35rem]">
            {patientContent.searchPage.title}
          </h1>
          <p className="mt-0.5 max-w-3xl text-xs leading-5 text-ink-muted sm:text-sm">
            {patientContent.searchPage.description}
          </p>
        </div>
        <div className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-primary ring-1 ring-primary/10">
          <span className="font-headline text-lg font-extrabold leading-none">
            {students.length}
          </span>
          <span className="text-xs font-semibold">
            {hasSearchCriteria ? 'Resultados' : 'Recomendados'}
          </span>
        </div>
      </div>
      {successMessage ? (
        <SurfaceCard
          className="border border-emerald-200 bg-emerald-50/90 text-sm font-medium text-emerald-800"
          paddingClassName="p-3.5"
        >
          <p role="status">
            <span className="font-semibold">
              {patientContent.searchPage.successNoticePrefix}
            </span>{' '}
            {successMessage}
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
      <AdminPanelCard className="flex-1" panelClassName="bg-[#f4f8ff]">
        <div className="border-b border-slate-200/80 px-3 py-3 sm:px-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(15rem,1.35fr)_repeat(4,minmax(9.5rem,1fr))] xl:items-end">
            <label className="relative min-w-0" htmlFor="patient-student-search">
              <span className="mb-1.5 block text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-muted">
                Nombre
              </span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-[calc(50%+0.8rem)] h-4 w-4 -translate-y-1/2 text-ghost xl:top-[calc(50%+0.65rem)]"
              />
              <input
                className="h-10 w-full rounded-full border border-slate-200/90 bg-white/98 py-0 pl-11 pr-4 text-sm text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 placeholder:text-ghost/80 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                id="patient-student-search"
                placeholder={patientContent.searchPage.searchPlaceholder}
                type="search"
                value={searchTerm}
                onChange={(event) => {
                  const nextSearch = event.target.value;
                  setHasInteractedWithSearch(true);
                  latestSearchFiltersRef.current.search = nextSearch;
                  setSearchTerm(nextSearch);
                  runImmediateSearchInTest({ search: nextSearch });
                }}
              />
            </label>
            <label className="min-w-0" htmlFor="patient-student-treatment-filter">
              <span className="mb-1.5 block text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-muted">
                Tratamiento
              </span>
              <select
                className="h-10 w-full rounded-full border border-slate-200/90 bg-white/98 px-4 text-sm font-semibold text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                id="patient-student-treatment-filter"
                value={treatmentFilter}
                onChange={(event) => {
                  const nextTreatment = event.target.value;
                  setHasInteractedWithSearch(true);
                  latestSearchFiltersRef.current.treatment = nextTreatment;
                  setTreatmentFilter(nextTreatment);
                  runImmediateSearchInTest({ treatment: nextTreatment });
                }}
              >
                <option value="all">Todos</option>
                {treatmentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0" htmlFor="patient-student-city-filter">
              <span className="mb-1.5 block text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-muted">
                Ciudad
              </span>
              <select
                className="h-10 w-full rounded-full border border-slate-200/90 bg-white/98 px-4 text-sm font-semibold text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                id="patient-student-city-filter"
                value={cityFilter}
                onChange={(event) => {
                  const nextCity = event.target.value;
                  setHasInteractedWithSearch(true);
                  latestSearchFiltersRef.current.city = nextCity;
                  latestSearchFiltersRef.current.locality = 'all';
                  setCityFilter(nextCity);
                  setLocalityFilter('all');
                  runImmediateSearchInTest({ city: nextCity, locality: 'all' });
                }}
              >
                <option value="all">Todas</option>
                {cityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0" htmlFor="patient-student-locality-filter">
              <span className="mb-1.5 block text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-muted">
                Localidad
              </span>
              <select
                className="h-10 w-full rounded-full border border-slate-200/90 bg-white/98 px-4 text-sm font-semibold text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                disabled={cityFilter === 'all'}
                id="patient-student-locality-filter"
                value={localityFilter}
                onChange={(event) => {
                  const nextLocality = event.target.value;
                  setHasInteractedWithSearch(true);
                  latestSearchFiltersRef.current.locality = nextLocality;
                  setLocalityFilter(nextLocality);
                  runImmediateSearchInTest({ locality: nextLocality });
                }}
              >
                <option value="all">
                  {cityFilter === 'all' ? 'Selecciona una ciudad' : 'Todas'}
                </option>
                {localityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0" htmlFor="patient-student-university-filter">
              <span className="mb-1.5 block text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-muted">
                Universidad
              </span>
              <select
                className="h-10 w-full rounded-full border border-slate-200/90 bg-white/98 px-4 text-sm font-semibold text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                id="patient-student-university-filter"
                value={universityFilter}
                onChange={(event) => {
                  const nextUniversity = event.target.value;
                  setHasInteractedWithSearch(true);
                  latestSearchFiltersRef.current.university = nextUniversity;
                  setUniversityFilter(nextUniversity);
                  runImmediateSearchInTest({ university: nextUniversity });
                }}
              >
                <option value="all">Todas</option>
                {universityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="min-h-0 flex-1 px-3 py-3 sm:px-4">
          <SurfaceCard className="h-full min-h-0 border border-slate-200/80 bg-white shadow-none" paddingClassName="p-0">
            <div className="flex h-full min-h-[18rem] flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 px-3 py-2.5">
                  <div className="min-w-0">
                    <h2 className="font-headline text-lg font-extrabold tracking-tight text-ink">
                      {hasSearchCriteria ? 'Resultados de búsqueda' : 'Estudiantes recomendados para ti'}
                    </h2>
                    <p className="text-xs leading-5 text-ink-muted">
                      {hasSearchCriteria
                        ? 'Busca por nombre o usa los filtros para encontrar el estudiante adecuado.'
                        : 'Estos perfiles tienen tratamientos publicados y cercania con tu ubicacion.'}
                    </p>
                  </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-ink-muted">
                  {students.length} perfiles
                </span>
              </div>
              <div className="admin-scrollbar min-h-0 flex-1 overflow-x-auto overflow-y-auto">
                {students.length > 0 ? (
                  <table className="min-w-[64rem] w-full lg:min-w-0 lg:table-fixed">
                    <thead className="sticky top-0 z-10 bg-slate-100 text-left">
                      <tr className="text-[0.64rem] font-bold uppercase tracking-[0.16em] text-ink-muted">
                        <th className="px-4 py-2.5 sm:px-5">Estudiante</th>
                        <th className="px-4 py-2.5">Universidad</th>
                        <th className="px-4 py-2.5">Ubicación</th>
                        <th className="px-4 py-2.5">Tratamientos</th>
                        <th className="px-4 py-2.5">Calificación</th>
                        <th className="px-4 py-2.5 text-center">Estado</th>
                        <th className="px-4 py-2.5 text-right sm:px-5">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80">
                    {students.map((student) => {
                      const isSelected = selectedStudent?.id === student.id;
                      const visibleTreatments = student.treatments.slice(0, 2);
                      const hiddenTreatmentsCount = student.treatments.length - visibleTreatments.length;

                      return (
                        <tr
                          key={student.id}
                          className={classNames(
                            'align-top transition duration-200',
                            isSelected
                              ? 'bg-primary/[0.06]'
                              : 'hover:bg-slate-50/90',
                          )}
                        >
                          <td className="px-4 py-3 sm:px-5">
                            <div className="space-y-1">
                              <p className="truncate text-[0.83rem] font-semibold text-ink">
                                {getStudentFullName(student)}
                              </p>
                              <p className="text-[0.72rem] text-ink-muted sm:text-[0.76rem]">
                                Semestre {student.semester}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="truncate text-[0.83rem] font-medium text-ink">
                              {student.universityName}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <p className="truncate text-[0.83rem] font-medium text-ink">
                                {getStudentPracticeSite(student)}
                              </p>
                              <p className="truncate text-[0.72rem] text-ink-muted sm:text-[0.76rem]">
                                {getStudentLocation(student)}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {student.treatments.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {visibleTreatments.map((treatment) => (
                                  <span
                                    key={treatment}
                                    className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[0.68rem] font-semibold text-primary"
                                  >
                                    {treatment}
                                  </span>
                                ))}
                                {hiddenTreatmentsCount > 0 ? (
                                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[0.68rem] font-semibold text-ink-muted">
                                    +{hiddenTreatmentsCount}
                                  </span>
                                ) : null}
                              </div>
                              ) : (
                                <span className="text-[0.78rem] text-ink-muted">Sin tratamientos</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-0.5">
                                  {renderStars(student.averageRating)}
                                </div>
                                <p className="text-[0.72rem] font-semibold text-ink-muted">
                                  {getRatingLabel(student)}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                              className={classNames(
                                'inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-semibold ring-1 ring-inset',
                                student.availabilityStatus === 'available'
                                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                  : 'bg-amber-50 text-amber-700 ring-amber-200',
                              )}
                            >
                              {student.availabilityStatus === 'available' ? 'Disponible' : 'Limitado'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right sm:px-5">
                            <button
                              className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition duration-200 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                              data-testid={`patient-student-card-${student.id}`}
                              type="button"
                              onClick={() => handleOpenStudentModal(student.id)}
                            >
                              Ver perfil
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    </tbody>
                  </table>
                ) : (
                  <div className="m-4 rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-ink-muted">
                    {isLoading || isSearchingStudents
                      ? 'Cargando estudiantes...'
                      : patientContent.searchPage.emptyState}
                  </div>
                )}
              </div>
            </div>
          </SurfaceCard>
        </div>
      </AdminPanelCard>
      {selectedStudent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button
            aria-label="Cerrar informacion del estudiante"
            className="absolute inset-0 h-full w-full cursor-default bg-slate-950/40 backdrop-blur-[2px]"
            type="button"
            onClick={handleCloseStudentModal}
          />
          <div
            aria-labelledby="patient-student-modal-title"
            aria-modal="true"
            className="admin-scrollbar relative z-10 max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_28px_90px_-30px_rgba(15,23,42,0.55)] sm:p-6"
            role="dialog"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-[1.4rem] bg-primary/10 ring-4 ring-primary/10">
                  {selectedStudent.avatarSrc ? (
                    <img
                      alt={selectedStudent.avatarAlt}
                      className="h-full w-full object-cover"
                      decoding="async"
                      src={getOptimizedAvatarUrl(selectedStudent.avatarSrc, 220)}
                    />
                  ) : (
                    <span className="text-xl font-extrabold uppercase text-primary">
                      {getStudentInitials(selectedStudent)}
                    </span>
                  )}
                </div>
                <div>
                  <h2
                    className="font-headline text-2xl font-extrabold tracking-tight text-ink"
                    id="patient-student-modal-title"
                  >
                    {getStudentFullName(selectedStudent)}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-ink-muted">
                    {selectedStudent.universityName} - Semestre {selectedStudent.semester}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {renderStars(selectedStudent.averageRating, 'h-4 w-4')}
                    </div>
                    <span className="text-sm font-semibold text-ink-muted">
                      {getRatingLabel(selectedStudent)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={classNames(
                    'inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
                    selectedStudent.availabilityStatus === 'available'
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                      : 'bg-amber-50 text-amber-700 ring-amber-200',
                  )}
                >
                  {selectedStudent.availabilityStatus === 'available'
                    ? 'Recibiendo solicitudes'
                    : 'Disponibilidad limitada'}
                </span>
                <button
                  aria-label="Cerrar informacion del estudiante"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-ink-muted transition duration-200 hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                  type="button"
                  onClick={handleCloseStudentModal}
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50 px-4 py-4">
                <div className="flex items-center gap-2">
                  <MapPin aria-hidden="true" className="h-4.5 w-4.5 text-primary" />
                  <p className="text-sm font-semibold text-ink">Sede y ubicacion</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink-muted">
                  {getStudentPracticeSite(selectedStudent)}
                </p>
                <p className="text-sm leading-6 text-ink-muted">
                  {getStudentLocation(selectedStudent)}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50 px-4 py-4">
                <div className="flex items-center gap-2">
                  <UserRound aria-hidden="true" className="h-4.5 w-4.5 text-primary" />
                  <p className="text-sm font-semibold text-ink">Disponibilidad general</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink-muted">
                  {getStudentAvailability(selectedStudent)}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-sm font-semibold text-ink">Tratamientos visibles</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedStudent.treatments.length > 0 ? (
                  selectedStudent.treatments.map((treatment) => (
                    <span
                      key={treatment}
                      className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                    >
                      {treatment}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-ink-muted">Sin tratamientos publicados.</span>
                )}
              </div>
            </div>

            {currentRequestForSelectedStudent ? (
              <div className="mt-5 rounded-[1.35rem] border border-amber-200/80 bg-amber-50/75 px-4 py-4 text-sm text-amber-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck aria-hidden="true" className="h-4.5 w-4.5" />
                  <p className="font-medium">
                    Ya tienes una solicitud{' '}
                    {currentRequestForSelectedStudent.status.toLowerCase()} con este estudiante.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-ink" htmlFor="patient-request-reason">
                    Motivo de la solicitud
                  </label>
                  <textarea
                    aria-describedby={reasonError ? 'patient-request-reason-error' : undefined}
                    aria-invalid={Boolean(reasonError)}
                    className={classNames(
                      'min-h-[7.5rem] w-full rounded-[1.35rem] border bg-surface px-4 py-3 text-sm text-ink placeholder:text-ghost/80 transition duration-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                      reasonError
                        ? 'border-rose-300 focus-visible:border-rose-400 focus-visible:ring-rose-200/70'
                        : 'border-slate-200 focus-visible:border-primary',
                    )}
                    id="patient-request-reason"
                    placeholder="Explica brevemente el motivo por el cual deseas solicitar atencion."
                    value={reason}
                    onChange={(event) => {
                      setReason(event.target.value);
                      setReasonError(null);
                      setSuccessMessage(null);
                    }}
                  />
                  {reasonError ? (
                    <p className="text-sm text-rose-600" id="patient-request-reason-error">
                      {reasonError}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink-muted transition duration-300 hover:border-primary/30 hover:text-primary"
                    type="button"
                    onClick={handleCloseStudentModal}
                  >
                    Cancelar
                  </button>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-4 py-3 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65"
                    disabled={isLoading}
                    type="button"
                    onClick={handleSendRequest}
                  >
                    <SendHorizontal aria-hidden="true" className="h-4 w-4" />
                    <span>{patientContent.searchPage.actionLabels.sendRequest}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
