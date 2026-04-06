import {
  Check,
  MapPin,
  Search,
  SendHorizontal,
  ShieldCheck,
  SlidersHorizontal,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { patientContent } from '@/content/patientContent';
import type { PatientStudentDirectoryItem } from '@/content/types';
import { classNames } from '@/lib/classNames';
import { usePatientModuleStore } from '@/lib/patientModuleStore';

type TreatmentFilter = string | 'all';

function getStudentFullName(student: PatientStudentDirectoryItem) {
  return `${student.firstName} ${student.lastName}`;
}

export function PatientSearchStudentsPage() {
  const { createRequest, errorMessage, isLoading, requests, students } = usePatientModuleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [treatmentFilter, setTreatmentFilter] = useState<TreatmentFilter>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    students[0]?.id ?? null,
  );
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const treatmentOptions = useMemo(
    () => [
      { label: 'Todos', value: 'all' as const },
      ...Array.from(new Set(students.flatMap((student) => student.treatments)))
        .sort((first, second) => first.localeCompare(second))
        .map((treatment) => ({
          label: treatment,
          value: treatment,
        })),
    ],
    [students],
  );
  const filteredStudents = useMemo(
    () =>
      students.filter((student) => {
        const matchesSearch =
          getStudentFullName(student).toLowerCase().includes(normalizedSearch) ||
          student.universityName.toLowerCase().includes(normalizedSearch) ||
          student.city.toLowerCase().includes(normalizedSearch) ||
          student.treatments.some((treatment) =>
            treatment.toLowerCase().includes(normalizedSearch),
          );
        const matchesTreatment =
          treatmentFilter === 'all' || student.treatments.includes(treatmentFilter);

        return matchesSearch && matchesTreatment;
      }),
    [normalizedSearch, students, treatmentFilter],
  );
  const selectedStudent =
    filteredStudents.find((student) => student.id === selectedStudentId) ??
    filteredStudents[0] ??
    null;
  const currentRequestForSelectedStudent = selectedStudent
    ? requests.find(
        (request) =>
          request.studentId === selectedStudent.id &&
          (request.status === 'PENDIENTE' || request.status === 'ACEPTADA'),
      ) ?? null
    : null;

  useEffect(() => {
    if (!isFilterMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!filterMenuRef.current?.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsFilterMenuOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFilterMenuOpen]);

  useEffect(() => {
    if (!filteredStudents.length) {
      setSelectedStudentId(null);
      return;
    }

    if (
      !selectedStudentId ||
      !filteredStudents.some((student) => student.id === selectedStudentId)
    ) {
      setSelectedStudentId(filteredStudents[0]?.id ?? null);
    }
  }, [filteredStudents, selectedStudentId]);

  useEffect(() => {
    setReason('');
    setReasonError(null);
    setSuccessMessage(null);
  }, [selectedStudentId]);

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
    })();
  };

  return (
    <div className="mx-auto flex h-full max-w-[90rem] min-h-0 flex-col gap-4 overflow-hidden 2xl:max-w-[98rem]">
      <Seo
        description={patientContent.searchPage.meta.description}
        noIndex
        title={patientContent.searchPage.meta.title}
      />
      <AdminPageHeader
        description={patientContent.searchPage.description}
        title={patientContent.searchPage.title}
      />
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
                {filteredStudents.length}
              </p>
              <p className="text-sm font-semibold text-white/90">Estudiantes visibles</p>
            </div>
          </div>
        </SurfaceCard>
        <SurfaceCard
          className="border border-slate-200/80 bg-white shadow-none"
          paddingClassName="p-0"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-primary/10 text-primary ring-1 ring-primary/10">
              <ShieldCheck aria-hidden="true" className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="font-headline text-[1.55rem] font-extrabold tracking-tight text-ink">
                {requests.filter((request) => request.status === 'PENDIENTE').length}
              </p>
              <p className="text-sm font-semibold text-ink-muted">Solicitudes pendientes</p>
            </div>
          </div>
        </SurfaceCard>
      </div>
      <AdminPanelCard className="flex-1" panelClassName="bg-[#f4f8ff]">
        <div className="border-b border-slate-200/80 px-4 py-4 sm:px-5 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative min-w-0 flex-1 sm:max-w-[34rem] xl:max-w-[38rem]" htmlFor="patient-student-search">
              <span className="sr-only">{patientContent.searchPage.searchLabel}</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost"
              />
              <input
                className="h-11 w-full rounded-full border border-slate-200/90 bg-white/98 py-0 pl-11 pr-4 text-sm text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 placeholder:text-ghost/80 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                id="patient-student-search"
                placeholder={patientContent.searchPage.searchPlaceholder}
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
            <div className="relative shrink-0" ref={filterMenuRef}>
              <button
                aria-controls="patient-student-filter-menu"
                aria-expanded={isFilterMenuOpen}
                aria-haspopup="menu"
                aria-label={
                  treatmentFilter === 'all'
                    ? 'Filtrar estudiantes por tratamiento'
                    : `Filtrar estudiantes por tratamiento. Actual: ${treatmentFilter}`
                }
                className={classNames(
                  'relative inline-flex h-11 w-11 items-center justify-center rounded-full border bg-white/98 text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                  treatmentFilter === 'all'
                    ? 'border-slate-200/90 hover:border-primary/30 hover:bg-white'
                    : 'border-primary/25 bg-primary/[0.08] text-primary hover:bg-primary/[0.12]',
                )}
                type="button"
                onClick={() => setIsFilterMenuOpen((currentValue) => !currentValue)}
              >
                <SlidersHorizontal aria-hidden="true" className="h-[1.05rem] w-[1.05rem]" />
                {treatmentFilter !== 'all' ? (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
                ) : null}
              </button>
              {isFilterMenuOpen ? (
                <div
                  className="absolute right-0 top-[calc(100%+0.6rem)] z-20 w-[16rem] overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-white/95 p-2 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] backdrop-blur"
                  id="patient-student-filter-menu"
                  role="menu"
                >
                  <div className="px-2.5 pb-2 pt-1">
                    <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-primary/75">
                      Filtrar por tratamiento
                    </p>
                  </div>
                  <div className="space-y-1">
                    {treatmentOptions.map((option) => {
                      const isSelected = treatmentFilter === option.value;

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
                            setTreatmentFilter(option.value);
                            setIsFilterMenuOpen(false);
                          }}
                        >
                          <span className="truncate">{option.label}</span>
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
        <div className="grid min-h-0 flex-1 gap-4 px-4 py-4 sm:px-5 sm:py-5 xl:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]">
          <SurfaceCard className="min-h-0 border border-slate-200/80 bg-white shadow-none" paddingClassName="p-0">
            <div className="flex h-full min-h-[18rem] flex-col">
              <div className="border-b border-slate-200/80 px-4 py-4">
                <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink">
                  Estudiantes sugeridos
                </h2>
                <p className="mt-1 text-sm leading-6 text-ink-muted">
                  Selecciona un perfil para revisar su oferta y enviar tu solicitud.
                </p>
              </div>
              <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
                {filteredStudents.length > 0 ? (
                  <div className="space-y-2.5">
                    {filteredStudents.map((student) => {
                      const isSelected = selectedStudent?.id === student.id;

                      return (
                        <button
                          key={student.id}
                          className={classNames(
                            'w-full rounded-[1.35rem] border px-4 py-3 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                            isSelected
                              ? 'border-primary/35 bg-primary/[0.08] shadow-[0_18px_40px_-28px_rgba(22,78,99,0.65)]'
                              : 'border-slate-200/80 bg-slate-50 hover:border-primary/20 hover:bg-slate-100/70',
                          )}
                          data-testid={`patient-student-card-${student.id}`}
                          type="button"
                          onClick={() => setSelectedStudentId(student.id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink">
                                {getStudentFullName(student)}
                              </p>
                              <p className="text-xs text-ink-muted">
                                Semestre {student.semester} - {student.universityName}
                              </p>
                            </div>
                            <span
                              className={classNames(
                                'inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ring-1 ring-inset',
                                student.availabilityStatus === 'available'
                                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                  : 'bg-amber-50 text-amber-700 ring-amber-200',
                              )}
                            >
                              {student.availabilityStatus === 'available' ? 'Disponible' : 'Limitado'}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-ink-muted">{student.biography}</p>
                          <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-primary/70">
                            {student.city} - {student.locality}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-ink-muted">
                    {patientContent.searchPage.emptyState}
                  </div>
                )}
              </div>
            </div>
          </SurfaceCard>
          <SurfaceCard className="min-h-0 border border-slate-200/80 bg-white shadow-none" paddingClassName="p-5">
            {selectedStudent ? (
              <div className="flex h-full min-h-[24rem] flex-col gap-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-headline text-2xl font-extrabold tracking-tight text-ink">
                      {getStudentFullName(selectedStudent)}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-ink-muted">
                      {selectedStudent.universityName} · Semestre {selectedStudent.semester}
                    </p>
                  </div>
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
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50 px-4 py-4">
                    <div className="flex items-center gap-2">
                      <MapPin aria-hidden="true" className="h-4.5 w-4.5 text-primary" />
                      <p className="text-sm font-semibold text-ink">Sede y ubicacion</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-ink-muted">
                      {selectedStudent.practiceSite}
                    </p>
                    <p className="text-sm leading-6 text-ink-muted">
                      {selectedStudent.city} - {selectedStudent.locality}
                    </p>
                  </div>
                  <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50 px-4 py-4">
                    <div className="flex items-center gap-2">
                      <UserRound aria-hidden="true" className="h-4.5 w-4.5 text-primary" />
                      <p className="text-sm font-semibold text-ink">Disponibilidad general</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-ink-muted">
                      {selectedStudent.availabilityGeneral}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">Tratamientos visibles</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedStudent.treatments.map((treatment) => (
                      <span
                        key={treatment}
                        className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                      >
                        {treatment}
                      </span>
                    ))}
                  </div>
                </div>
                {currentRequestForSelectedStudent ? (
                  <div className="rounded-[1.35rem] border border-amber-200/80 bg-amber-50/75 px-4 py-4 text-sm text-amber-800">
                    <div className="flex items-center gap-2">
                      <ShieldCheck aria-hidden="true" className="h-4.5 w-4.5" />
                      <p className="font-medium">
                        Ya tienes una solicitud {currentRequestForSelectedStudent.status.toLowerCase()} con este estudiante.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
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
                    <div className="flex justify-end">
                      <button
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-4 py-3 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110"
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
            ) : (
              <div className="flex h-full min-h-[24rem] items-center justify-center px-5 py-8 text-center">
                <div className="max-w-md space-y-3">
                  <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-primary/10 text-primary">
                    <Search aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink">
                    Sin estudiante seleccionado
                  </h2>
                  <p className="text-sm leading-6 text-ink-muted">
                    {patientContent.searchPage.emptyState}
                  </p>
                </div>
              </div>
            )}
          </SurfaceCard>
        </div>
      </AdminPanelCard>
    </div>
  );
}
