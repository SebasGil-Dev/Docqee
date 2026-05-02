import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Link2,
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
import { AdminTablePagination } from '@/components/admin/AdminTablePagination';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { patientContent } from '@/content/patientContent';
import type {
  PatientRequest,
  PatientStudentDirectoryItem,
  PatientStudentProfessionalLinkSummary,
  PatientStudentPracticeSiteSummary,
  PatientStudentReviewSummary,
} from '@/content/types';
import { IS_TEST_MODE } from '@/lib/apiClient';
import { classNames } from '@/lib/classNames';
import { formatDisplayName } from '@/lib/formatDisplayName';
import {
  getOptimizedAvatarUrl,
  getOptimizedLogoUrl,
} from '@/lib/imageOptimization';
import { usePatientModuleStore } from '@/lib/patientModuleStore';
import { getStarFillRatio } from '@/lib/ratings';
import { useStableRowsPerPage } from '@/hooks/useStableRowsPerPage';

type NamedFilter = string;
const INITIAL_STUDENT_RESULTS_LIMIT = 20;
const DEFAULT_ROWS_PER_PAGE = 5;
const MIN_ROWS_PER_PAGE = 3;
const TABLE_HEADER_HEIGHT_PX = 32;
const TABLE_ROW_HEIGHT_FALLBACK_PX = 64;
const TABLE_HEIGHT_PADDING_PX = 8;

function getStudentFullName(student: PatientStudentDirectoryItem) {
  return formatDisplayName(`${student.firstName} ${student.lastName}`);
}

function isActiveRequestForStudent(request: PatientRequest, studentId: string) {
  return (
    request.studentId === studentId &&
    (request.status === 'PENDIENTE' || request.status === 'ACEPTADA')
  );
}

function getStudentInitials(student: PatientStudentDirectoryItem) {
  return `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase();
}

function getLocationLabel(city?: string, locality?: string) {
  const locationParts = [city, locality].filter(Boolean);

  return locationParts.length
    ? locationParts.join(' - ')
    : 'Ubicacion por confirmar';
}

function getStudentLocation(student: PatientStudentDirectoryItem) {
  return getLocationLabel(student.city, student.locality);
}

function getUniversityLocation(student: PatientStudentDirectoryItem) {
  return getLocationLabel(
    student.universityCity ?? student.city,
    student.universityLocality ?? student.locality,
  );
}

function getStudentPracticeSites(student: PatientStudentDirectoryItem) {
  if (student.practiceSites?.length) {
    return student.practiceSites;
  }

  return student.practiceSite
    ? [
        {
          city: student.city,
          locality: student.locality,
          name: student.practiceSite,
        },
      ]
    : [];
}

function getStudentReviews(
  student: PatientStudentDirectoryItem,
): PatientStudentReviewSummary[] {
  return student.reviews ?? [];
}

function getStudentProfessionalLinks(
  student: PatientStudentDirectoryItem,
): PatientStudentProfessionalLinkSummary[] {
  return student.professionalLinks ?? [];
}

function getStudentAvailability(student: PatientStudentDirectoryItem) {
  return student.availabilityGeneral || 'Disponibilidad por confirmar';
}

function getStudentBiography(student: PatientStudentDirectoryItem) {
  return student.biography || 'Descripcion profesional por confirmar.';
}

function getStudentUniversityLogoAlt(student: PatientStudentDirectoryItem) {
  return student.universityLogoAlt || `Logo de ${student.universityName}`;
}

function getProfessionalLinkTypeLabel(
  type: PatientStudentProfessionalLinkSummary['type'],
) {
  switch (type) {
    case 'RED_PROFESIONAL':
      return 'Red profesional';
    case 'PORTAFOLIO':
      return 'Portafolio';
    case 'HOJA_DE_VIDA':
      return 'Hoja de vida';
    case 'OTRO':
    default:
      return 'Otro';
  }
}

function formatStudentReviewDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function normalizeTreatmentFilter(value: string) {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getVisiblePracticeSite(
  student: PatientStudentDirectoryItem,
  selectedCity: NamedFilter,
  selectedLocality: NamedFilter,
): PatientStudentPracticeSiteSummary | null {
  const practiceSites = getStudentPracticeSites(student);

  if (practiceSites.length === 0) {
    return null;
  }

  if (selectedLocality !== 'all') {
    const normalizedSelectedLocality = normalizeTreatmentFilter(
      selectedLocality,
    );
    const matchingLocality = practiceSites.find(
      (site) =>
        normalizeTreatmentFilter(site.locality) === normalizedSelectedLocality,
    );

    if (matchingLocality) {
      return matchingLocality;
    }
  }

  if (selectedCity !== 'all') {
    const normalizedSelectedCity = normalizeTreatmentFilter(selectedCity);
    const matchingCity = practiceSites.find(
      (site) => normalizeTreatmentFilter(site.city) === normalizedSelectedCity,
    );

    if (matchingCity) {
      return matchingCity;
    }
  }

  return practiceSites[0] ?? null;
}

function getVisibleTreatments(
  treatments: string[],
  selectedTreatment: NamedFilter,
) {
  if (selectedTreatment === 'all') {
    return treatments.slice(0, 3);
  }

  const normalizedSelectedTreatment = normalizeTreatmentFilter(
    selectedTreatment,
  );
  const selectedTreatmentIndex = treatments.findIndex(
    (treatment) =>
      normalizeTreatmentFilter(treatment) === normalizedSelectedTreatment,
  );

  if (selectedTreatmentIndex === -1) {
    return treatments.slice(0, 3);
  }

  return [
    treatments[selectedTreatmentIndex],
    ...treatments.filter((_, index) => index !== selectedTreatmentIndex),
  ].slice(0, 3);
}

function renderStars(value: number | null, sizeClassName = 'h-3.5 w-3.5') {
  return Array.from({ length: 5 }, (_, index) => {
    const fillRatio = getStarFillRatio(value, index);

    return (
      <span
        key={`patient-search-star-${value ?? 'empty'}-${index}`}
        aria-hidden="true"
        className={classNames('relative inline-flex shrink-0', sizeClassName)}
      >
        <Star className="h-full w-full text-slate-300" />
        {fillRatio > 0 ? (
          <span
            className="absolute inset-y-0 left-0 overflow-hidden"
            style={{ width: `${fillRatio * 100}%` }}
          >
            <Star
              className={classNames(
                'block max-w-none fill-amber-300 text-amber-300',
                sizeClassName,
              )}
            />
          </span>
        ) : null}
      </span>
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
    prefetchStudentDirectory,
    profile,
    refreshRequests,
    requests,
    searchStudents,
    studentFilters,
    students,
  } = usePatientModuleStore();
  const defaultCityFilter = profile.city.trim() || 'all';
  const defaultLocalityFilter = profile.locality.trim() || 'all';
  // Restore last-used location filters from localStorage, fall back to profile values
  const savedCity = localStorage.getItem('patient-student-city-filter');
  const savedLocality = localStorage.getItem('patient-student-locality-filter');
  const initialCityFilter = savedCity ?? defaultCityFilter;
  const initialLocalityFilter = savedCity === 'all' ? 'all' : (savedLocality ?? defaultLocalityFilter);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasInteractedWithSearch, setHasInteractedWithSearch] = useState(false);
  const [hasTouchedLocationFilters, setHasTouchedLocationFilters] = useState(
    savedCity !== null,
  );
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [treatmentFilter, setTreatmentFilter] = useState<NamedFilter>('all');
  const [cityFilter, setCityFilter] = useState<NamedFilter>(initialCityFilter);
  const [localityFilter, setLocalityFilter] = useState<NamedFilter>(initialLocalityFilter);
  const [universityFilter, setUniversityFilter] = useState<NamedFilter>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );
  const [selectedReviewIndex, setSelectedReviewIndex] = useState(0);
  const [isRefreshingSelectedRequest, setIsRefreshingSelectedRequest] =
    useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const tableViewportRef = useRef<HTMLDivElement | null>(null);
  const tableHeaderRef = useRef<HTMLTableSectionElement | null>(null);
  const tableBodyRef = useRef<HTMLTableSectionElement | null>(null);
  const requestRefreshSequenceRef = useRef(0);
  const latestSearchFiltersRef = useRef({
    city: initialCityFilter,
    locality: initialLocalityFilter,
    search: '',
    treatment: 'all',
    university: 'all',
  });
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const hasCustomLocationCriteria =
    hasTouchedLocationFilters &&
    (cityFilter !== 'all' || localityFilter !== 'all');
  const hasSearchCriteria = Boolean(
    normalizedSearch ||
    treatmentFilter !== 'all' ||
    hasCustomLocationCriteria ||
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
  const rowsPerPage = useStableRowsPerPage({
    viewportRef: tableViewportRef,
    defaultRowsPerPage: DEFAULT_ROWS_PER_PAGE,
    minRowsPerPage: MIN_ROWS_PER_PAGE,
    maxRowsPerPage: students.length,
    headerMeasurementRef: tableHeaderRef,
    headerHeightPx: TABLE_HEADER_HEIGHT_PX,
    rowMeasurementRef: tableBodyRef,
    rowHeightPx: TABLE_ROW_HEIGHT_FALLBACK_PX,
    heightPaddingPx: TABLE_HEIGHT_PADDING_PX,
    rowSafetyBufferPx: 1,
  });
  const totalPages = Math.max(1, Math.ceil(students.length / rowsPerPage));
  const clampedCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (clampedCurrentPage - 1) * rowsPerPage;
  const paginatedStudents = useMemo(
    () => students.slice(pageStartIndex, pageStartIndex + rowsPerPage),
    [pageStartIndex, rowsPerPage, students],
  );
  const pageStartLabel = students.length > 0 ? pageStartIndex + 1 : 0;
  const pageEndLabel = Math.min(
    pageStartIndex + paginatedStudents.length,
    students.length,
  );
  const selectedStudent = selectedStudentId
    ? (students.find((student) => student.id === selectedStudentId) ?? null)
    : null;
  const selectedStudentReviews = selectedStudent
    ? getStudentReviews(selectedStudent)
    : [];
  const selectedStudentPracticeSites = selectedStudent
    ? getStudentPracticeSites(selectedStudent)
    : [];
  const selectedStudentProfessionalLinks = selectedStudent
    ? getStudentProfessionalLinks(selectedStudent)
    : [];
  const selectedReview = selectedStudentReviews[selectedReviewIndex] ?? null;
  const currentRequestForSelectedStudent = selectedStudent
    ? (requests.find(
        (request) => isActiveRequestForStudent(request, selectedStudent.id),
      ) ?? null)
    : null;

  useEffect(() => {
    if (!isReady || hasInteractedWithSearch) {
      return;
    }
    // Only apply profile defaults if the user has no saved filter preference
    if (localStorage.getItem('patient-student-city-filter') !== null) {
      return;
    }

    latestSearchFiltersRef.current.city = defaultCityFilter;
    latestSearchFiltersRef.current.locality = defaultLocalityFilter;
    setCityFilter(defaultCityFilter);
    setLocalityFilter(defaultLocalityFilter);
  }, [
    defaultCityFilter,
    defaultLocalityFilter,
    hasInteractedWithSearch,
    isReady,
    searchStudents,
  ]);

  useEffect(() => {
    if (IS_TEST_MODE || !isReady) {
      return;
    }

    void prefetchStudentDirectory();
  }, [isReady, prefetchStudentDirectory]);

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 2000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [successMessage]);

  useEffect(() => {
    if (
      selectedStudentId &&
      !students.some((student) => student.id === selectedStudentId)
    ) {
      setSelectedStudentId(null);
    }
  }, [selectedStudentId, students]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    cityFilter,
    localityFilter,
    normalizedSearch,
    treatmentFilter,
    universityFilter,
  ]);

  useEffect(() => {
    setCurrentPage((currentValue) => Math.min(currentValue, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (IS_TEST_MODE || !isReady || !hasInteractedWithSearch) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      const shouldSearchAcrossLocations =
        Boolean(searchTerm.trim()) && !hasTouchedLocationFilters;

      void searchStudents({
        city: shouldSearchAcrossLocations ? 'all' : cityFilter,
        limit: hasSearchCriteria ? 20 : INITIAL_STUDENT_RESULTS_LIMIT,
        locality: shouldSearchAcrossLocations ? 'all' : localityFilter,
        search: searchTerm,
        treatment: treatmentFilter,
        university: universityFilter,
      });
    }, 120);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    cityFilter,
    hasInteractedWithSearch,
    hasSearchCriteria,
    hasTouchedLocationFilters,
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
    setSelectedReviewIndex(0);
  }, [selectedStudentId]);

  useEffect(() => {
    setSelectedReviewIndex((currentIndex) =>
      selectedStudentReviews.length === 0
        ? 0
        : Math.min(currentIndex, selectedStudentReviews.length - 1),
    );
  }, [selectedStudentReviews.length]);

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
    const refreshSequence = requestRefreshSequenceRef.current + 1;
    const shouldWaitForRequestRefresh =
      !IS_TEST_MODE &&
      requests.some((request) => isActiveRequestForStudent(request, studentId));

    requestRefreshSequenceRef.current = refreshSequence;
    setSelectedStudentId(studentId);
    setSuccessMessage(null);
    setIsRefreshingSelectedRequest(shouldWaitForRequestRefresh);
    void refreshRequests().finally(() => {
      if (requestRefreshSequenceRef.current === refreshSequence) {
        setIsRefreshingSelectedRequest(false);
      }
    });
  };

  const handleCloseStudentModal = () => {
    requestRefreshSequenceRef.current += 1;
    setIsRefreshingSelectedRequest(false);
    setSelectedStudentId(null);
  };

  const handleShowPreviousReview = () => {
    setSelectedReviewIndex((currentIndex) =>
      currentIndex === 0
        ? Math.max(selectedStudentReviews.length - 1, 0)
        : currentIndex - 1,
    );
  };

  const handleShowNextReview = () => {
    setSelectedReviewIndex((currentIndex) =>
      selectedStudentReviews.length === 0
        ? 0
        : (currentIndex + 1) % selectedStudentReviews.length,
    );
  };

  const handleSendRequest = () => {
    if (!selectedStudent) {
      return;
    }

    const normalizedReason = reason.trim();
    const selectedStudentName = getStudentFullName(selectedStudent);

    if (!normalizedReason) {
      setReasonError('Describe brevemente el motivo de tu solicitud.');
      return;
    }

    setReason('');
    setReasonError(null);
    setSuccessMessage(
      `Tu solicitud fue enviada a ${selectedStudentName} y quedo en estado pendiente.`,
    );
    setSelectedStudentId(null);

    void createRequest(selectedStudent.id, normalizedReason).then(
      (createdRequest) => {
        if (!createdRequest) {
          setSuccessMessage(null);
        }
      },
    );
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

    const nextTreatment =
      filters.treatment ?? latestSearchFiltersRef.current.treatment;
    const nextCity = filters.city ?? latestSearchFiltersRef.current.city;
    const nextLocality =
      filters.locality ?? latestSearchFiltersRef.current.locality;
    const nextUniversity =
      filters.university ?? latestSearchFiltersRef.current.university;
    const resolvedSearch =
      filters.search ?? latestSearchFiltersRef.current.search;
    const shouldSearchAcrossLocations =
      Boolean(resolvedSearch.trim()) && !hasTouchedLocationFilters;
    const nextHasCustomLocationCriteria =
      hasTouchedLocationFilters &&
      (nextCity !== 'all' || nextLocality !== 'all');
    const nextHasSearchCriteria = Boolean(
      resolvedSearch.trim() ||
      nextTreatment !== 'all' ||
      nextHasCustomLocationCriteria ||
      nextUniversity !== 'all',
    );

    void searchStudents({
      city: shouldSearchAcrossLocations ? 'all' : nextCity,
      limit: nextHasSearchCriteria ? 20 : 6,
      locality: shouldSearchAcrossLocations ? 'all' : nextLocality,
      search: resolvedSearch,
      treatment: nextTreatment,
      university: nextUniversity,
    });
  };

  return (
    <div className="flex h-full w-full min-h-0 flex-col gap-2.5 overflow-hidden">
      <Seo
        description={patientContent.searchPage.meta.description}
        noIndex
        title={patientContent.searchPage.meta.title}
      />
      <div className="px-3.5 py-1.5 text-center sm:px-4">
        <h1 className="font-headline text-lg font-extrabold leading-tight tracking-tight text-ink sm:text-[1.15rem]">
          {patientContent.searchPage.title}
        </h1>
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
      <AdminPanelCard
        className="flex-1"
        panelClassName="rounded-[1.1rem] bg-[#f4f8ff]"
        shellPaddingClassName="p-0"
      >
        <div className="border-b border-slate-200/80 px-2.5 py-2 sm:px-3">
          <div className="grid gap-2 xl:grid-cols-[minmax(15rem,1.35fr)_repeat(4,minmax(9.5rem,1fr))] xl:items-end">
            <label
              className="relative min-w-0"
              htmlFor="patient-student-search"
            >
              <span className="mb-1 block text-[0.64rem] font-bold uppercase tracking-[0.12em] text-ink-muted">
                Nombre
              </span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-[calc(50%+0.55rem)] h-3.5 w-3.5 -translate-y-1/2 text-ghost"
              />
              <input
                className="h-8 w-full rounded-full border border-slate-200/90 bg-white/98 py-0 pl-9 pr-3 text-[0.8rem] text-ink transition duration-300 placeholder:text-ghost/80 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                id="patient-student-search"
                placeholder={patientContent.searchPage.searchPlaceholder}
                type="search"
                value={searchTerm}
                onChange={(event) => {
                  const nextSearch = event.target.value;
                  setHasInteractedWithSearch(true);
                  latestSearchFiltersRef.current.search = nextSearch;
                  if (nextSearch.trim() && !hasTouchedLocationFilters) {
                    latestSearchFiltersRef.current.city = 'all';
                    latestSearchFiltersRef.current.locality = 'all';
                    setCityFilter('all');
                    setLocalityFilter('all');
                  }
                  setSearchTerm(nextSearch);
                  runImmediateSearchInTest({ search: nextSearch });
                }}
              />
            </label>
            <label
              className="min-w-0"
              htmlFor="patient-student-treatment-filter"
            >
              <span className="mb-1 block text-[0.64rem] font-bold uppercase tracking-[0.12em] text-ink-muted">
                Tratamiento
              </span>
              <select
                className="h-8 w-full rounded-full border border-slate-200/90 bg-white/98 px-3 text-[0.8rem] font-semibold text-ink transition duration-300 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
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
              <span className="mb-1 block text-[0.64rem] font-bold uppercase tracking-[0.12em] text-ink-muted">
                Ciudad
              </span>
              <select
                className="h-8 w-full rounded-full border border-slate-200/90 bg-white/98 px-3 text-[0.8rem] font-semibold text-ink transition duration-300 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                id="patient-student-city-filter"
                value={cityFilter}
                onChange={(event) => {
                  const nextCity = event.target.value;
                  localStorage.setItem('patient-student-city-filter', nextCity);
                  localStorage.setItem('patient-student-locality-filter', 'all');
                  setHasInteractedWithSearch(true);
                  setHasTouchedLocationFilters(true);
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
            <label
              className="min-w-0"
              htmlFor="patient-student-locality-filter"
            >
              <span className="mb-1 block text-[0.64rem] font-bold uppercase tracking-[0.12em] text-ink-muted">
                Localidad
              </span>
              <select
                className="h-8 w-full rounded-full border border-slate-200/90 bg-white/98 px-3 text-[0.8rem] font-semibold text-ink transition duration-300 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                disabled={cityFilter === 'all'}
                id="patient-student-locality-filter"
                value={localityFilter}
                onChange={(event) => {
                  const nextLocality = event.target.value;
                  localStorage.setItem('patient-student-locality-filter', nextLocality);
                  setHasInteractedWithSearch(true);
                  setHasTouchedLocationFilters(true);
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
            <label
              className="min-w-0"
              htmlFor="patient-student-university-filter"
            >
              <span className="mb-1 block text-[0.64rem] font-bold uppercase tracking-[0.12em] text-ink-muted">
                Universidad
              </span>
              <select
                className="h-8 w-full rounded-full border border-slate-200/90 bg-white/98 px-3 text-[0.8rem] font-semibold text-ink transition duration-300 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
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
        <div className="min-h-0 flex-1 px-2.5 py-2 sm:px-3">
          <SurfaceCard
            className="h-full min-h-0 border border-slate-200/80 bg-white shadow-none"
            paddingClassName="p-0"
          >
            <div className="flex h-full min-h-[14rem] flex-col">
              <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-200/80 px-2.5 py-1.5">
                <div className="min-w-0">
                  <h2 className="font-headline text-[0.98rem] font-extrabold tracking-tight text-ink">
                    {hasSearchCriteria
                      ? 'Resultados de búsqueda'
                      : 'Estudiantes recomendados para ti'}
                  </h2>
                  {hasSearchCriteria ? (
                    <p className="text-[0.7rem] leading-4 text-ink-muted">
                      Busca por nombre o usa los filtros para encontrar el estudiante adecuado.
                    </p>
                  ) : null}
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.68rem] font-semibold text-ink-muted">
                  {students.length} perfiles
                </span>
              </div>
              <div
                ref={tableViewportRef}
                className="admin-scrollbar min-h-0 flex-1 overflow-x-auto overflow-y-auto"
              >
                {students.length > 0 ? (
                  <table className="min-w-[54rem] w-full lg:min-w-0 lg:table-fixed">
                    <colgroup>
                      <col className="w-[18%]" />
                      <col className="w-[18%]" />
                      <col className="w-[20%]" />
                      <col className="w-[30%]" />
                      <col className="w-[14%]" />
                    </colgroup>
                    <thead
                      ref={tableHeaderRef}
                      className="sticky top-0 z-10 bg-slate-100 text-left"
                    >
                      <tr className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-ink-muted">
                        <th className="px-3 py-1.5 sm:px-4">Estudiante</th>
                        <th className="px-3 py-1.5">Universidad</th>
                        <th className="px-3 py-1.5">Ubicación</th>
                        <th className="px-3 py-1.5">Tratamientos</th>
                        <th className="px-3 py-1.5 text-right sm:px-4">
                          Acción
                        </th>
                      </tr>
                    </thead>
                    <tbody
                      ref={tableBodyRef}
                      className="divide-y divide-slate-200/80"
                    >
                      {paginatedStudents.map((student) => {
                        const isSelected = selectedStudent?.id === student.id;
                        const visibleTreatments = getVisibleTreatments(
                          student.treatments,
                          treatmentFilter,
                        );
                        const hiddenTreatmentsCount =
                          student.treatments.length - visibleTreatments.length;
                        const visiblePracticeSite = getVisiblePracticeSite(
                          student,
                          cityFilter,
                          localityFilter,
                        );
                        const hiddenPracticeSitesCount = Math.max(
                          getStudentPracticeSites(student).length - 1,
                          0,
                        );

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
                            <td className="px-3 py-2 sm:px-4">
                              <div className="space-y-0.5">
                                <p className="truncate text-[0.8rem] font-semibold text-ink">
                                  {getStudentFullName(student)}
                                </p>
                                <p className="text-[0.68rem] text-ink-muted">
                                  Semestre {student.semester}
                                </p>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="space-y-0.5">
                                <p className="truncate text-[0.8rem] font-medium text-ink">
                                  {student.universityName}
                                </p>
                                <p className="truncate text-[0.68rem] text-ink-muted">
                                  {getUniversityLocation(student)}
                                </p>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="space-y-0.5">
                                <div className="flex min-w-0 items-center gap-1.5">
                                  <p className="min-w-0 truncate text-[0.8rem] font-medium text-ink">
                                    {visiblePracticeSite?.name ??
                                      'Sede por confirmar'}
                                  </p>
                                  {hiddenPracticeSitesCount > 0 ? (
                                    <span className="inline-flex shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[0.64rem] font-semibold text-ink-muted">
                                      +{hiddenPracticeSitesCount}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="truncate text-[0.68rem] text-ink-muted">
                                  {visiblePracticeSite
                                    ? getLocationLabel(
                                        visiblePracticeSite.city,
                                        visiblePracticeSite.locality,
                                      )
                                    : getStudentLocation(student)}
                                </p>
                                {visiblePracticeSite?.address ? (
                                  <p className="truncate text-[0.68rem] text-ink-muted">
                                    {visiblePracticeSite.address}
                                  </p>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              {student.treatments.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {visibleTreatments.map((treatment) => (
                                    <span
                                      key={treatment}
                                      className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[0.64rem] font-semibold text-primary"
                                    >
                                      {treatment}
                                    </span>
                                  ))}
                                  {hiddenTreatmentsCount > 0 ? (
                                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[0.64rem] font-semibold text-ink-muted">
                                      +{hiddenTreatmentsCount}
                                    </span>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-[0.72rem] text-ink-muted">
                                  Sin tratamientos
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right sm:px-4">
                              <button
                                className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[0.7rem] font-semibold text-primary transition duration-200 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                                data-testid={`patient-student-card-${student.id}`}
                                type="button"
                                onClick={() =>
                                  handleOpenStudentModal(student.id)
                                }
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
                  <div className="m-3 rounded-[1.15rem] border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-[0.82rem] text-ink-muted">
                    {isLoading || isSearchingStudents
                      ? 'Cargando estudiantes...'
                      : patientContent.searchPage.emptyState}
                  </div>
                )}
              </div>
              <AdminTablePagination
                currentPage={clampedCurrentPage}
                onNext={() =>
                  setCurrentPage((currentValue) =>
                    Math.min(totalPages, currentValue + 1),
                  )
                }
                onPrevious={() =>
                  setCurrentPage((currentValue) =>
                    Math.max(1, currentValue - 1),
                  )
                }
                pageEndLabel={pageEndLabel}
                pageStartLabel={pageStartLabel}
                totalItems={students.length}
                totalPages={totalPages}
              />
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
            className="admin-scrollbar relative z-10 max-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-y-auto rounded-[1.25rem] border border-slate-200 bg-white p-3 shadow-[0_28px_90px_-30px_rgba(15,23,42,0.55)] sm:p-4"
            role="dialog"
          >
            <button
              aria-label="Cerrar informacion del estudiante"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-ink-muted transition duration-200 hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
              type="button"
              onClick={handleCloseStudentModal}
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
            <div className="rounded-[1rem] border border-slate-200/80 bg-slate-50 px-3 py-3 pr-11 sm:px-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] bg-primary/10 ring-4 ring-primary/10 sm:h-[4.5rem] sm:w-[4.5rem]">
                  {selectedStudent.avatarSrc ? (
                    <img
                      alt={selectedStudent.avatarAlt}
                      className="h-full w-full object-cover"
                      decoding="async"
                      src={getOptimizedAvatarUrl(
                        selectedStudent.avatarSrc,
                        220,
                      )}
                    />
                  ) : (
                    <span className="text-lg font-extrabold uppercase text-primary">
                      {getStudentInitials(selectedStudent)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <h2
                      className="min-w-0 truncate font-headline text-xl font-extrabold tracking-tight text-ink sm:text-[1.35rem]"
                      id="patient-student-modal-title"
                    >
                      {getStudentFullName(selectedStudent)}
                    </h2>
                    <span
                      aria-hidden="true"
                      className="hidden h-1 w-1 shrink-0 rounded-full bg-slate-300 sm:inline-flex"
                    />
                    <span className="text-xs font-semibold text-ink-muted sm:text-sm">
                      Semestre {selectedStudent.semester}
                    </span>
                    <div
                      aria-label="Calificacion del estudiante"
                      className="flex items-center gap-0.5"
                    >
                      {renderStars(selectedStudent.averageRating, 'h-4 w-4')}
                    </div>
                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[0.7rem] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      Estudiante Verificado
                    </span>
                  </div>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[0.8rem] border border-slate-200 bg-white">
                      {selectedStudent.universityLogoSrc ? (
                        <img
                          alt={getStudentUniversityLogoAlt(selectedStudent)}
                          className="h-full w-full object-contain p-1.5"
                          decoding="async"
                          src={getOptimizedLogoUrl(
                            selectedStudent.universityLogoSrc,
                            160,
                            160,
                          )}
                        />
                      ) : (
                        <Building2
                          aria-hidden="true"
                          className="h-4.5 w-4.5 text-primary"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {selectedStudent.universityName}
                      </p>
                      <p className="truncate text-xs leading-5 text-ink-muted sm:text-sm">
                        {getUniversityLocation(selectedStudent)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 grid items-start gap-3 lg:grid-cols-3">
              <div className="rounded-[1rem] border border-slate-200/80 bg-slate-50 px-3 py-3">
                <div className="flex items-center gap-2">
                  <MapPin
                    aria-hidden="true"
                    className="h-4 w-4 text-primary"
                  />
                  <p className="text-xs font-semibold text-ink sm:text-sm">
                    Sedes donde atiende
                  </p>
                </div>
                <div className="mt-2 space-y-2">
                  {selectedStudentPracticeSites.length > 0 ? (
                    selectedStudentPracticeSites.map((site) => (
                      <div
                        key={`${site.name}-${site.city}-${site.locality}`}
                        className="rounded-[0.85rem] border border-slate-200 bg-white px-3 py-2"
                      >
                        <p className="text-xs font-semibold text-ink sm:text-sm">
                          {site.name}
                        </p>
                        <p className="text-xs leading-5 text-ink-muted">
                          {getLocationLabel(site.city, site.locality)}
                        </p>
                        {site.address ? (
                          <p className="text-xs leading-5 text-ink-muted">
                            {site.address}
                          </p>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs leading-5 text-ink-muted sm:text-sm">
                      Sedes por confirmar.
                    </p>
                  )}
                </div>
              </div>
              <div className="rounded-[1rem] border border-slate-200/80 bg-slate-50 px-3 py-3">
                <div className="flex items-center gap-2">
                  <UserRound
                    aria-hidden="true"
                    className="h-4 w-4 text-primary"
                  />
                  <p className="text-xs font-semibold text-ink sm:text-sm">
                    Descripcion profesional
                  </p>
                </div>
                <p className="mt-2 text-xs leading-5 text-ink-muted sm:text-sm">
                  {getStudentBiography(selectedStudent)}
                </p>
              </div>
              <div className="rounded-[1rem] border border-slate-200/80 bg-slate-50 px-3 py-3">
                <div className="flex items-center gap-2">
                  <UserRound
                    aria-hidden="true"
                    className="h-4 w-4 text-primary"
                  />
                  <p className="text-xs font-semibold text-ink sm:text-sm">
                    Disponibilidad general
                  </p>
                </div>
                <p className="mt-2 text-xs leading-5 text-ink-muted sm:text-sm">
                  {getStudentAvailability(selectedStudent)}
                </p>
              </div>
            </div>

            <div className="mt-3 grid items-start gap-3 lg:grid-cols-2">
              <div className="rounded-[1rem] border border-slate-200/80 bg-slate-50 px-3 py-3">
                <p className="text-xs font-semibold text-ink sm:text-sm">
                  Tratamientos visibles
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedStudent.treatments.length > 0 ? (
                    selectedStudent.treatments.map((treatment) => (
                      <span
                        key={treatment}
                        className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-[0.7rem] font-semibold text-primary"
                      >
                        {treatment}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-ink-muted sm:text-sm">
                      Sin tratamientos publicados.
                    </span>
                  )}
                </div>
              </div>
              <div className="rounded-[1rem] border border-slate-200/80 bg-slate-50 px-3 py-3">
                <div className="flex items-center gap-2">
                  <Link2
                    aria-hidden="true"
                    className="h-4 w-4 text-primary"
                  />
                  <p className="text-xs font-semibold text-ink sm:text-sm">
                    Enlaces profesionales
                  </p>
                </div>
                <div className="mt-2 space-y-2">
                  {selectedStudentProfessionalLinks.length > 0 ? (
                    selectedStudentProfessionalLinks.map((link) => (
                      <a
                        key={link.id}
                        className="flex items-center justify-between gap-3 rounded-[0.85rem] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-primary transition duration-200 hover:border-primary/30 hover:bg-primary/5 sm:text-sm"
                        href={link.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <span className="min-w-0">
                          <span className="block text-xs font-bold uppercase tracking-[0.12em] text-primary/70">
                            {getProfessionalLinkTypeLabel(link.type)}
                          </span>
                          <span className="block truncate text-ink">
                            {link.url}
                          </span>
                        </span>
                        <ExternalLink
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0"
                        />
                      </a>
                    ))
                  ) : (
                    <p className="text-xs leading-5 text-ink-muted sm:text-sm">
                      Sin enlaces profesionales publicados.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-[1rem] border border-slate-200/80 bg-slate-50 px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-ink sm:text-sm">
                  Comentarios de valoraciones
                </p>
                {selectedStudentReviews.length > 1 ? (
                  <div className="flex items-center gap-2">
                    <button
                      aria-label="Comentario anterior"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-ink-muted transition duration-200 hover:border-primary/30 hover:text-primary"
                      type="button"
                      onClick={handleShowPreviousReview}
                    >
                      <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-semibold text-ink-muted">
                      {selectedReviewIndex + 1} de{' '}
                      {selectedStudentReviews.length}
                    </span>
                    <button
                      aria-label="Comentario siguiente"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-ink-muted transition duration-200 hover:border-primary/30 hover:text-primary"
                      type="button"
                      onClick={handleShowNextReview}
                    >
                      <ChevronRight aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>
              {selectedReview ? (
                <div className="mt-2 rounded-[0.85rem] border border-slate-200 bg-white px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {renderStars(selectedReview.rating, 'h-3.5 w-3.5')}
                    </div>
                    <span className="text-xs font-semibold text-ink-muted">
                      {formatStudentReviewDate(selectedReview.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-ink-muted sm:text-sm">
                    {selectedReview.comment || 'Sin comentario escrito.'}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs leading-5 text-ink-muted sm:text-sm">
                  Aun no hay comentarios publicados para este estudiante.
                </p>
              )}
            </div>

            {isRefreshingSelectedRequest ? (
              <div
                className="mt-3 rounded-[1rem] border border-sky-200/80 bg-sky-50/75 px-3 py-3 text-sm text-sky-800"
                role="status"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                  <p className="font-medium">
                    Validando el estado de tus solicitudes con este estudiante.
                  </p>
                </div>
              </div>
            ) : currentRequestForSelectedStudent ? (
              <div className="mt-3 rounded-[1rem] border border-amber-200/80 bg-amber-50/75 px-3 py-3 text-sm text-amber-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                  <p className="font-medium">
                    Ya tienes una solicitud{' '}
                    {currentRequestForSelectedStudent.status.toLowerCase()} con
                    este estudiante.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-2.5">
                <div className="space-y-1.5">
                  <label
                    className="block text-xs font-semibold text-ink sm:text-sm"
                    htmlFor="patient-request-reason"
                  >
                    Motivo de la solicitud
                  </label>
                  <textarea
                    aria-describedby={
                      reasonError ? 'patient-request-reason-error' : undefined
                    }
                    aria-invalid={Boolean(reasonError)}
                    className={classNames(
                      'min-h-[6rem] w-full rounded-[1rem] border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ghost/80 transition duration-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
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
                    <p
                      className="text-sm text-rose-600"
                      id="patient-request-reason-error"
                    >
                      {reasonError}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink-muted transition duration-300 hover:border-primary/30 hover:text-primary"
                    type="button"
                    onClick={handleCloseStudentModal}
                  >
                    Cancelar
                  </button>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65"
                    disabled={isLoading}
                    type="button"
                    onClick={handleSendRequest}
                  >
                    <SendHorizontal aria-hidden="true" className="h-4 w-4" />
                    <span>
                      {patientContent.searchPage.actionLabels.sendRequest}
                    </span>
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
