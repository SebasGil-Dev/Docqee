import {
  Check,
  MapPin,
  Search,
  SendHorizontal,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { patientContent } from '@/content/patientContent';
import type { PatientStudentDirectoryItem } from '@/content/types';
import { classNames } from '@/lib/classNames';
import { usePatientModuleStore } from '@/lib/patientModuleStore';

type TreatmentFilter = string;

function getStudentFullName(student: PatientStudentDirectoryItem) {
  return `${student.firstName} ${student.lastName}`;
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

export function PatientSearchStudentsPage() {
  const { createRequest, errorMessage, isLoading, requests, students } = usePatientModuleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [treatmentFilter, setTreatmentFilter] = useState<TreatmentFilter>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
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
  const selectedStudent = selectedStudentId
    ? filteredStudents.find((student) => student.id === selectedStudentId) ?? null
    : null;
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
    if (
      selectedStudentId &&
      !filteredStudents.some((student) => student.id === selectedStudentId)
    ) {
      setSelectedStudentId(null);
    }
  }, [filteredStudents, selectedStudentId]);

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
            {filteredStudents.length}
          </span>
          <span className="text-xs font-semibold">Estudiantes visibles</span>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative min-w-0 flex-1 sm:max-w-[34rem] xl:max-w-[38rem]" htmlFor="patient-student-search">
              <span className="sr-only">{patientContent.searchPage.searchLabel}</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost"
              />
              <input
                className="h-10 w-full rounded-full border border-slate-200/90 bg-white/98 py-0 pl-11 pr-4 text-sm text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 placeholder:text-ghost/80 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
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
                  'relative inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white/98 text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
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
        <div className="min-h-0 flex-1 px-3 py-3 sm:px-4">
          <SurfaceCard className="h-full min-h-0 border border-slate-200/80 bg-white shadow-none" paddingClassName="p-0">
            <div className="flex h-full min-h-[18rem] flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 px-3 py-2.5">
                <div className="min-w-0">
                  <h2 className="font-headline text-lg font-extrabold tracking-tight text-ink">
                    Estudiantes sugeridos
                  </h2>
                  <p className="text-xs leading-5 text-ink-muted">
                    Selecciona un perfil para revisar su oferta y enviar tu solicitud.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-ink-muted">
                  {filteredStudents.length} perfiles
                </span>
              </div>
              <div className="admin-scrollbar min-h-0 flex-1 overflow-x-auto overflow-y-auto">
                {filteredStudents.length > 0 ? (
                  <table className="min-w-[58rem] w-full lg:min-w-0 lg:table-fixed">
                    <thead className="sticky top-0 z-10 bg-slate-100 text-left">
                      <tr className="text-[0.64rem] font-bold uppercase tracking-[0.16em] text-ink-muted">
                        <th className="px-4 py-2.5 sm:px-5">Estudiante</th>
                        <th className="px-4 py-2.5">Universidad</th>
                        <th className="px-4 py-2.5">Ubicacion</th>
                        <th className="px-4 py-2.5">Tratamientos</th>
                        <th className="px-4 py-2.5 text-center">Estado</th>
                        <th className="px-4 py-2.5 text-right sm:px-5">Accion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80">
                    {filteredStudents.map((student) => {
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
                  <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-ink-muted">
                    {patientContent.searchPage.emptyState}
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
