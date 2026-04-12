import {
  ArrowRight,
  Building2,
  GraduationCap,
  MapPin,
  Users,
} from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/app/providers/AuthProvider';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { ROUTES } from '@/constants/routes';
import { universityAdminContent } from '@/content/universityAdminContent';
import { classNames } from '@/lib/classNames';
import { formatDisplayName } from '@/lib/formatDisplayName';
import { getOptimizedLogoUrl } from '@/lib/imageOptimization';
import { useUniversityAdminOverviewStore } from '@/lib/universityAdminOverviewStore';

const MAX_RECENT_STUDENTS = 4;
const MAX_RECENT_TEACHERS = 4;
const MAX_RECENT_CAMPUSES = 3;

type SummaryMetricProps = {
  label: string;
  toneClassName: string;
  value: number;
};

function SummaryMetric({ label, toneClassName, value }: SummaryMetricProps) {
  return (
    <div className="rounded-[1rem] border border-slate-200/80 bg-slate-50 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-ink-muted">
          {label}
        </p>
        <p
          className={classNames(
            'font-headline text-[1.1rem] font-extrabold leading-none tracking-tight',
            toneClassName,
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export function UniversityHomePage() {
  const { session } = useAuth();
  const {
    activeCampusesCount,
    errorMessage,
    institution,
    recentCampuses,
    recentStudents,
    recentTeachers,
    studentSummary,
    teacherSummary,
  } = useUniversityAdminOverviewStore();
  const institutionProfile = useMemo(
    () => ({
      ...institution,
      campuses: recentCampuses,
    }),
    [institution, recentCampuses],
  );
  const activeStudentsCount = studentSummary.active;
  const pendingStudentsCount = studentSummary.pending;
  const inactiveStudentsCount = studentSummary.inactive;
  const activeTeachersCount = teacherSummary.active;
  const adminFullName = useMemo(() => {
    const profileFullName = `${institution.adminFirstName} ${institution.adminLastName}`.trim();

    if (profileFullName) {
      return formatDisplayName(profileFullName);
    }

    const sessionFullName =
      `${session?.user.firstName ?? ''} ${session?.user.lastName ?? ''}`.trim();

    if (sessionFullName) {
      return formatDisplayName(sessionFullName);
    }

    return formatDisplayName(
      `${universityAdminContent.shell.adminUser.firstName} ${universityAdminContent.shell.adminUser.lastName}`,
    );
  }, [
    institution.adminFirstName,
    institution.adminLastName,
    session?.user.firstName,
    session?.user.lastName,
  ]);
  const institutionName = useMemo(
    () => formatDisplayName(institution.name || 'Universidad'),
    [institution.name],
  );
  const dashboardErrorMessage = useMemo(() => {
    if (!errorMessage) {
      return null;
    }

    return errorMessage === 'No pudimos completar la solicitud.'
      ? 'No fue posible cargar el inicio de la universidad en este momento.'
      : errorMessage;
  }, [errorMessage]);

  return (
    <div className="mx-auto flex h-full max-w-[90rem] min-h-0 flex-col gap-3 overflow-hidden 2xl:max-w-[98rem]">
      <Seo
        description={universityAdminContent.homePage.meta.description}
        noIndex
        title={universityAdminContent.homePage.meta.title}
      />
      {dashboardErrorMessage ? (
        <SurfaceCard
          className="border border-rose-200 bg-rose-50/90 text-sm font-medium text-rose-800"
          paddingClassName="p-3.5"
        >
          <p role="alert">{dashboardErrorMessage}</p>
        </SurfaceCard>
      ) : null}
      <SurfaceCard className="overflow-hidden bg-brand-gradient text-white" paddingClassName="p-0">
        <div className="flex flex-col gap-3 px-4 py-3.5 sm:px-5 sm:py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-3 2xl:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {institution.logoSrc ? (
              <img
                alt={institution.logoAlt}
                className="h-14 w-14 rounded-[1.2rem] bg-white object-contain ring-4 ring-white/20 sm:h-16 sm:w-16"
                decoding="async"
                src={getOptimizedLogoUrl(institution.logoSrc, 480, 480)}
              />
            ) : (
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-white/14 text-white ring-4 ring-white/15 sm:h-14 sm:w-14">
                <Building2 aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" />
              </span>
            )}
            <div className="flex min-w-0 flex-col gap-1.5">
              <h2 className="max-w-[18rem] truncate font-headline text-[1.08rem] font-extrabold tracking-tight text-white sm:max-w-[24rem] sm:text-[1.2rem] xl:max-w-[28rem]">
                Bienvenido, {adminFullName}
              </h2>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[0.75rem] font-semibold text-white/88">
                  <Building2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                  <span className="max-w-[11rem] truncate sm:max-w-[14rem] xl:max-w-[18rem]">
                    {institutionName}
                  </span>
                </span>
                <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[0.75rem] font-semibold text-white/88">
                  <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                  <span className="max-w-[10rem] truncate sm:max-w-[12rem] xl:max-w-[14rem]">
                    {[institutionProfile.mainCity, institutionProfile.mainLocality].filter(Boolean).join(' · ') || 'Sin ubicacion principal'}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </SurfaceCard>
      <AdminPanelCard className="flex-1" panelClassName="bg-[#f4f8ff]">
        <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="grid gap-3 xl:grid-cols-2">
            <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-3 sm:p-3.5">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-[0.9rem] bg-primary/10 text-primary">
                    <GraduationCap aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="font-headline text-[1rem] font-extrabold tracking-tight text-ink">
                      Estado de estudiantes
                    </h2>
                  </div>
                </div>
                <div className="grid gap-1.5 sm:grid-cols-3">
                  {[
                    { label: 'Activos', tone: 'text-emerald-700', value: activeStudentsCount },
                    { label: 'Pendientes', tone: 'text-amber-700', value: pendingStudentsCount },
                    { label: 'Inactivos', tone: 'text-slate-700', value: inactiveStudentsCount },
                  ].map((item) => (
                    <SummaryMetric
                      label={item.label}
                      key={item.label}
                      toneClassName={item.tone}
                      value={item.value}
                    />
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[0.83rem] font-semibold text-ink">Ultimos registros</p>
                    <Link
                      className="inline-flex items-center gap-1 text-[0.72rem] font-semibold text-primary transition duration-200 hover:text-primary/80"
                      to={ROUTES.universityStudents}
                    >
                      Ver estudiantes
                      <ArrowRight aria-hidden="true" className="h-3 w-3" />
                    </Link>
                  </div>
                  <div className="space-y-1.5">
                    {recentStudents.slice(0, MAX_RECENT_STUDENTS).map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between gap-2.5 rounded-[1rem] border border-slate-200/80 bg-slate-50 px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-[0.83rem] text-ink"
                            title={`${formatDisplayName(`${student.firstName} ${student.lastName}`)} - Semestre ${student.semester} - ${student.documentTypeCode.toLocaleUpperCase('es-CO')} ${student.documentNumber}`}
                          >
                            <span className="font-semibold text-ink">
                              {formatDisplayName(`${student.firstName} ${student.lastName}`)}
                            </span>
                            <span className="text-ink-muted">
                              {` - Semestre ${student.semester} - ${student.documentTypeCode.toLocaleUpperCase('es-CO')} ${student.documentNumber}`}
                            </span>
                          </p>
                        </div>
                        <AdminStatusBadge entity="student" status={student.displayStatus} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SurfaceCard>

            {/*
            <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-4 sm:p-4.5">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                    <KeyRound aria-hidden="true" className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <h2 className="font-headline text-[1.15rem] font-extrabold tracking-tight text-ink">
                      Credenciales y sedes
                    </h2>
                    <p className="text-sm text-ink-muted">
                      Controla entregas pendientes y el estado operativo de las sedes.
                    </p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50 px-3.5 py-3">
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-ink-muted">
                      Credenciales enviadas
                    </p>
                    <p className="mt-1 font-headline text-[1.45rem] font-extrabold tracking-tight text-primary">
                      {sentCredentialsCount}
                    </p>
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50 px-3.5 py-3">
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-ink-muted">
                      Sedes totales
                    </p>
                    <p className="mt-1 font-headline text-[1.45rem] font-extrabold tracking-tight text-primary">
                      {institutionProfile.campuses.length}
                    </p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">Pendientes inmediatos</p>
                    <Link
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition duration-200 hover:text-primary/80"
                      to={ROUTES.universityCredentials}
                    >
                      Ir a credenciales
                      <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  {pendingCredentials.length > 0 ? (
                    <div className="space-y-2">
                      {pendingCredentials.slice(0, 4).map((credential) => (
                        <div
                          key={credential.id}
                          className="flex items-center justify-between gap-3 rounded-[1.15rem] border border-slate-200/80 bg-slate-50 px-3.5 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">
                              {credential.studentName}
                            </p>
                            <p className="text-xs text-ink-muted">
                              Semestre {credential.studentSemester} · Sin envio previo
                            </p>
                          </div>
                          <AdminStatusBadge entity="credential" status={credential.deliveryStatus} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[1.15rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-ink-muted">
                      {isLoading ? 'Cargando pendientes...' : 'No hay credenciales pendientes por enviar en este momento.'}
                    </div>
                  )}
                </div>
              </div>
            </SurfaceCard>
            */}

            <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-3 sm:p-3.5">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-[0.9rem] bg-primary/10 text-primary">
                    <Users aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="font-headline text-[1rem] font-extrabold tracking-tight text-ink">
                      Equipo y sedes
                    </h2>
                  </div>
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  <SummaryMetric
                    label="Docentes activos"
                    toneClassName="text-emerald-700"
                    value={activeTeachersCount}
                  />
                  <SummaryMetric
                    label="Sedes activas"
                    toneClassName="text-emerald-700"
                    value={activeCampusesCount}
                  />
                </div>
                <div className="grid gap-1.5 lg:grid-cols-2">
                  <div className="space-y-1.5">
                    <p className="text-[0.83rem] font-semibold text-ink">Docentes recientes</p>
                    {recentTeachers.slice(0, MAX_RECENT_TEACHERS).map((teacher) => (
                      <div
                        key={teacher.id}
                        className="flex items-center justify-between gap-2.5 rounded-[1rem] border border-slate-200/80 bg-slate-50 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[0.83rem] font-semibold text-ink">
                            {formatDisplayName(`${teacher.firstName} ${teacher.lastName}`)}
                          </p>
                          <p className="text-[0.72rem] text-ink-muted">
                            {teacher.documentTypeCode} {teacher.documentNumber}
                          </p>
                        </div>
                        <AdminStatusBadge entity="teacher" status={teacher.status} />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[0.83rem] font-semibold text-ink">Sedes registradas</p>
                    {institutionProfile.campuses.slice(0, MAX_RECENT_CAMPUSES).map((campus) => (
                      <div
                        key={campus.id}
                        className="flex items-center justify-between gap-2.5 rounded-[1rem] border border-slate-200/80 bg-slate-50 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[0.83rem] font-semibold text-ink">
                            {formatDisplayName(campus.name)}
                          </p>
                          <p className="text-[0.72rem] text-ink-muted">
                            {campus.city} · {campus.locality}
                          </p>
                        </div>
                        <AdminStatusBadge entity="teacher" status={campus.status} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SurfaceCard>

          </div>
        </div>
      </AdminPanelCard>
    </div>
  );
}
