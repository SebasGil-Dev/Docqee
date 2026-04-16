import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "@/shared/database/prisma.service";
import { MailService } from "@/shared/mail/mail.service";
import { normalizeText } from "@/shared/utils/front-format.util";
import { CreatePatientRequestDto } from "../../application/dto/create-patient-request.dto";
import { PatientAppointmentDto } from "../../application/dto/patient-appointment.dto";
import { PatientAppointmentReviewDto } from "../../application/dto/patient-appointment-review.dto";
import { PatientConversationDto } from "../../application/dto/patient-conversation.dto";
import { PatientConversationMessageDto } from "../../application/dto/patient-conversation-message.dto";
import { PatientPortalDashboardDto } from "../../application/dto/patient-portal-dashboard.dto";
import { PatientProfileDto } from "../../application/dto/patient-profile.dto";
import { PatientRequestDto } from "../../application/dto/patient-request.dto";
import { PatientStudentDirectoryFiltersDto } from "../../application/dto/patient-student-directory-filters.dto";
import { PatientStudentDirectoryItemDto } from "../../application/dto/patient-student-directory-item.dto";
import { PatientStudentDirectoryQueryDto } from "../../application/dto/patient-student-directory-query.dto";
import { UpdatePatientAppointmentStatusDto } from "../../application/dto/update-patient-appointment-status.dto";
import { UpdatePatientProfileDto } from "../../application/dto/update-patient-profile.dto";
import { UpdatePatientRequestStatusDto } from "../../application/dto/update-patient-request-status.dto";
import { PatientPortalRepository } from "../../domain/repositories/patient-portal.repository";

const studentDirectorySelect =
  Prisma.validator<Prisma.cuenta_estudianteSelect>()({
    id_cuenta: true,
    semestre: true,
    fecha_creacion: true,
    persona: {
      select: {
        nombres: true,
        apellidos: true,
      },
    },
    universidad: {
      select: {
        nombre: true,
        localidad: {
          select: {
            nombre: true,
            ciudad: { select: { nombre: true } },
          },
        },
      },
    },
    perfil_estudiante: {
      select: {
        descripcion: true,
        disponibilidad_general: true,
        foto_url: true,
      },
    },
    estudiante_tratamiento: {
      where: { estado: "ACTIVO" },
      select: { tipo_tratamiento: { select: { nombre: true } } },
    },
    estudiante_sede_practica: {
      where: { estado: "ACTIVO" },
      select: {
        sede: {
          select: {
            nombre: true,
            localidad: {
              select: {
                nombre: true,
                ciudad: { select: { nombre: true } },
              },
            },
          },
        },
      },
    },
  });

type StudentDirectoryRecord = Prisma.cuenta_estudianteGetPayload<{
  select: typeof studentDirectorySelect;
}>;

type PatientDirectoryLocationPreference = {
  city: string;
  locality: string;
};

type StudentDirectoryRow = {
  id_cuenta: number;
  semestre: number;
  nombres: string;
  apellidos: string;
  universidad_nombre: string;
  university_city: string;
  university_locality: string;
  descripcion: string | null;
  disponibilidad_general: string | null;
  foto_url: string | null;
  city: string;
  locality: string;
  practice_site: string | null;
  practice_sites:
    | {
        city: string;
        locality: string;
        name: string;
      }[]
    | null;
  treatments: string[] | null;
};

const STUDENT_DIRECTORY_FILTERS_CACHE_MS = 5 * 60 * 1000;

let studentDirectoryFiltersCache:
  | {
      expiresAt: number;
      value: PatientStudentDirectoryFiltersDto;
    }
  | null = null;

const PATIENT_INITIAL_STUDENT_DIRECTORY_LIMIT = 5;

@Injectable()
export class PrismaPatientPortalRepository extends PatientPortalRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {
    super();
  }

  private toRequestDto(request: {
    id_solicitud: number;
    id_cuenta_estudiante: number;
    motivo_consulta: string | null;
    fecha_respuesta: Date | null;
    fecha_envio: Date;
    estado: "PENDIENTE" | "ACEPTADA" | "RECHAZADA" | "CERRADA" | "CANCELADA";
    conversacion?: { id_conversacion: number } | null;
    cita?: { id_cita: number }[];
    cuenta_estudiante: {
      persona: { nombres: string; apellidos: string };
      universidad: { nombre: string };
    };
  }): PatientRequestDto {
    return {
      appointmentsCount: request.cita?.length ?? 0,
      conversationId: request.conversacion
        ? String(request.conversacion.id_conversacion)
        : null,
      id: String(request.id_solicitud),
      reason: request.motivo_consulta ?? null,
      responseAt: request.fecha_respuesta?.toISOString() ?? null,
      sentAt: request.fecha_envio.toISOString(),
      status: request.estado,
      studentId: String(request.id_cuenta_estudiante),
      studentName: `${request.cuenta_estudiante.persona.nombres} ${request.cuenta_estudiante.persona.apellidos}`,
      universityName: request.cuenta_estudiante.universidad.nombre,
    };
  }

  private getStudentDirectoryLocation(student: StudentDirectoryRecord) {
    const practiceSite = student.estudiante_sede_practica[0]?.sede ?? null;
    const fallbackLocation = student.universidad.localidad;

    return {
      city:
        practiceSite?.localidad.ciudad.nombre ?? fallbackLocation.ciudad.nombre,
      locality: practiceSite?.localidad.nombre ?? fallbackLocation.nombre,
      practiceSite: practiceSite?.nombre ?? "",
    };
  }

  private toStudentDirectoryDto(
    student: StudentDirectoryRecord,
  ): PatientStudentDirectoryItemDto {
    const location = this.getStudentDirectoryLocation(student);
    const practiceSites = student.estudiante_sede_practica.map((practice) => ({
      city: practice.sede.localidad.ciudad.nombre,
      locality: practice.sede.localidad.nombre,
      name: practice.sede.nombre,
    }));

    return {
      avatarAlt: `Foto de perfil de ${student.persona.nombres}`,
      avatarSrc: student.perfil_estudiante?.foto_url ?? null,
      availabilityGeneral:
        student.perfil_estudiante?.disponibilidad_general ?? "",
      availabilityStatus: "available",
      averageRating: null,
      biography: student.perfil_estudiante?.descripcion ?? "",
      city: location.city,
      firstName: student.persona.nombres,
      id: String(student.id_cuenta),
      lastName: student.persona.apellidos,
      locality: location.locality,
      practiceSite: location.practiceSite,
      practiceSites,
      reviewsCount: 0,
      semester: String(student.semestre),
      treatments: student.estudiante_tratamiento.map(
        (treatment) => treatment.tipo_tratamiento.nombre,
      ),
      universityCity: student.universidad.localidad.ciudad.nombre,
      universityLocality: student.universidad.localidad.nombre,
      universityName: student.universidad.nombre,
    };
  }

  private toStudentDirectoryDtoFromRow(
    student: StudentDirectoryRow,
  ): PatientStudentDirectoryItemDto {
    return {
      avatarAlt: `Foto de perfil de ${student.nombres}`,
      avatarSrc: student.foto_url ?? null,
      availabilityGeneral: student.disponibilidad_general ?? "",
      availabilityStatus: "available",
      averageRating: null,
      biography: student.descripcion ?? "",
      city: student.city,
      firstName: student.nombres,
      id: String(student.id_cuenta),
      lastName: student.apellidos,
      locality: student.locality,
      practiceSite: student.practice_site ?? "",
      practiceSites: student.practice_sites ?? [],
      reviewsCount: 0,
      semester: String(student.semestre),
      treatments: student.treatments ?? [],
      universityCity: student.university_city,
      universityLocality: student.university_locality,
      universityName: student.universidad_nombre,
    };
  }

  private buildStudentDirectoryWhere(
    query: PatientStudentDirectoryQueryDto,
  ): Prisma.cuenta_estudianteWhereInput {
    const normalizedSearch = normalizeText(query.search ?? "");
    const normalizedTreatment = normalizeText(query.treatment ?? "");
    const normalizedCity = normalizeText(query.city ?? "");
    const normalizedLocality = normalizeText(query.locality ?? "");
    const normalizedUniversity = normalizeText(query.university ?? "");
    const andFilters: Prisma.cuenta_estudianteWhereInput[] = [];

    if (normalizedSearch) {
      normalizedSearch
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 4)
        .forEach((term) => {
          andFilters.push({
            OR: [
              { persona: { nombres: { contains: term, mode: "insensitive" } } },
              {
                persona: { apellidos: { contains: term, mode: "insensitive" } },
              },
            ],
          });
        });
    }

    if (normalizedCity || normalizedLocality) {
      const localityFilter: Prisma.localidadWhereInput = {
        ...(normalizedLocality
          ? { nombre: { equals: normalizedLocality, mode: "insensitive" } }
          : {}),
        ...(normalizedCity
          ? {
              ciudad: {
                nombre: { equals: normalizedCity, mode: "insensitive" },
              },
            }
          : {}),
      };

      andFilters.push({
        OR: [
          {
            estudiante_sede_practica: {
              some: {
                estado: "ACTIVO",
                sede: {
                  localidad: localityFilter,
                },
              },
            },
          },
          {
            AND: [
              { estudiante_sede_practica: { none: { estado: "ACTIVO" } } },
              {
                universidad: {
                  localidad: localityFilter,
                },
              },
            ],
          },
        ],
      });
    }

    if (normalizedUniversity) {
      andFilters.push({
        universidad: {
          nombre: { equals: normalizedUniversity, mode: "insensitive" },
        },
      });
    }

    const where: Prisma.cuenta_estudianteWhereInput = {
      cuenta_acceso: { estado: "ACTIVO" },
      universidad: { estado: "ACTIVO" },
      estudiante_tratamiento: normalizedTreatment
        ? {
            some: {
              estado: "ACTIVO",
              tipo_tratamiento: {
                nombre: { equals: normalizedTreatment, mode: "insensitive" },
              },
            },
          }
        : { some: { estado: "ACTIVO" } },
    };

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    return where;
  }

  private async getStudentDirectoryFilters(): Promise<PatientStudentDirectoryFiltersDto> {
    if (
      studentDirectoryFiltersCache &&
      studentDirectoryFiltersCache.expiresAt > Date.now()
    ) {
      return studentDirectoryFiltersCache.value;
    }

    const [treatments, universities, cities] = await Promise.all([
      this.prisma.tipo_tratamiento.findMany({
        orderBy: { nombre: "asc" },
        select: { nombre: true },
      }),
      this.prisma.universidad.findMany({
        where: { estado: "ACTIVO" },
        orderBy: { nombre: "asc" },
        select: { nombre: true },
      }),
      this.prisma.ciudad.findMany({
        orderBy: { nombre: "asc" },
        select: {
          nombre: true,
          localidad: {
            orderBy: { nombre: "asc" },
            select: { nombre: true },
          },
        },
      }),
    ]);

    const filters = {
      cities: cities.map((city) => ({
        label: city.nombre,
        value: city.nombre,
      })),
      localities: cities.flatMap((city) =>
        city.localidad.map((locality) => ({
          cityValue: city.nombre,
          label: locality.nombre,
          value: locality.nombre,
        })),
      ),
      treatments: treatments.map((treatment) => treatment.nombre),
      universities: universities.map((university) => university.nombre),
    };

    studentDirectoryFiltersCache = {
      expiresAt: Date.now() + STUDENT_DIRECTORY_FILTERS_CACHE_MS,
      value: filters,
    };

    return filters;
  }

  async getStudentDirectory(
    patientAccountId: number,
    query: PatientStudentDirectoryQueryDto,
    patientLocation?: PatientDirectoryLocationPreference,
  ): Promise<PatientStudentDirectoryItemDto[]> {
    const limit = Math.min(Math.max(query.limit ?? 6, 1), 120);
    const hasSearchCriteria = Boolean(
      normalizeText(query.search ?? "") ||
      normalizeText(query.treatment ?? "") ||
      normalizeText(query.city ?? "") ||
      normalizeText(query.locality ?? "") ||
      normalizeText(query.university ?? ""),
    );
    const shouldSortByPatientLocation = !hasSearchCriteria;
    const candidateLimit = shouldSortByPatientLocation
      ? Math.max(limit, 60)
      : limit;

    const patientLocationPromise = !shouldSortByPatientLocation
      ? Promise.resolve(null)
      : patientLocation
        ? Promise.resolve(patientLocation)
        : this.prisma.cuenta_paciente
            .findUnique({
              where: { id_cuenta: patientAccountId },
              select: {
                localidad: {
                  select: {
                    nombre: true,
                    ciudad: { select: { nombre: true } },
                  },
                },
              },
            })
            .then((patient) =>
              patient
                ? {
                    city: patient.localidad.ciudad.nombre,
                    locality: patient.localidad.nombre,
                  }
                : null,
            );

    const resolvedPatientLocation = await patientLocationPromise;
    const normalizedSearch = normalizeText(query.search ?? "");
    const normalizedTreatment = normalizeText(query.treatment ?? "");
    const normalizedCity = normalizeText(query.city ?? "");
    const normalizedLocality = normalizeText(query.locality ?? "");
    const normalizedUniversity = normalizeText(query.university ?? "");
    const conditions: Prisma.Sql[] = [
      Prisma.sql`ca.estado = 'ACTIVO'::estado_simple_enum`,
      Prisma.sql`u.estado = 'ACTIVO'::estado_simple_enum`,
      Prisma.sql`practice.practice_site IS NOT NULL`,
      Prisma.sql`COALESCE(array_length(treatments.treatments, 1), 0) > 0`,
    ];

    normalizedSearch
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 4)
      .forEach((term) => {
        const pattern = `%${term}%`;

        conditions.push(
          Prisma.sql`(p.nombres ILIKE ${pattern} OR p.apellidos ILIKE ${pattern})`,
        );
      });

    if (normalizedTreatment) {
      conditions.push(
        Prisma.sql`EXISTS (
          SELECT 1
          FROM estudiante_tratamiento et_filter
          INNER JOIN tipo_tratamiento tt_filter
            ON tt_filter.id_tipo_tratamiento = et_filter.id_tipo_tratamiento
          WHERE et_filter.id_cuenta_estudiante = ce.id_cuenta
            AND et_filter.estado = 'ACTIVO'::estado_simple_enum
            AND tt_filter.nombre ILIKE ${normalizedTreatment}
        )`,
      );
    }

    if (normalizedCity) {
      conditions.push(Prisma.sql`EXISTS (
        SELECT 1
        FROM estudiante_sede_practica esp_filter
        INNER JOIN sede s_filter ON s_filter.id_sede = esp_filter.id_sede
        INNER JOIN localidad l_filter
          ON l_filter.id_localidad = s_filter.id_localidad
        INNER JOIN ciudad c_filter ON c_filter.id_ciudad = l_filter.id_ciudad
        WHERE esp_filter.id_cuenta_estudiante = ce.id_cuenta
          AND esp_filter.estado = 'ACTIVO'::estado_simple_enum
          AND s_filter.estado = 'ACTIVO'::estado_simple_enum
          AND c_filter.nombre ILIKE ${normalizedCity}
          ${
            normalizedLocality
              ? Prisma.sql`AND l_filter.nombre ILIKE ${normalizedLocality}`
              : Prisma.empty
          }
      )`);
    } else if (normalizedLocality) {
      conditions.push(Prisma.sql`EXISTS (
        SELECT 1
        FROM estudiante_sede_practica esp_filter
        INNER JOIN sede s_filter ON s_filter.id_sede = esp_filter.id_sede
        INNER JOIN localidad l_filter
          ON l_filter.id_localidad = s_filter.id_localidad
        WHERE esp_filter.id_cuenta_estudiante = ce.id_cuenta
          AND esp_filter.estado = 'ACTIVO'::estado_simple_enum
          AND s_filter.estado = 'ACTIVO'::estado_simple_enum
          AND l_filter.nombre ILIKE ${normalizedLocality}
      )`);
    }

    if (normalizedUniversity) {
      conditions.push(Prisma.sql`u.nombre ILIKE ${normalizedUniversity}`);
    }

    const practiceLocationOrder =
      normalizedLocality || normalizedCity
        ? Prisma.sql`
            CASE
              WHEN ${normalizedLocality} <> '' AND l.nombre ILIKE ${normalizedLocality} THEN 2
              WHEN ${normalizedCity} <> '' AND c.nombre ILIKE ${normalizedCity} THEN 1
              ELSE 0
            END DESC,
          `
        : Prisma.empty;

    const initialRelevanceOrder =
      shouldSortByPatientLocation && resolvedPatientLocation
        ? Prisma.sql`
            CASE
              WHEN LOWER(practice.locality) = LOWER(${resolvedPatientLocation.locality}) THEN 2
              WHEN LOWER(practice.city) = LOWER(${resolvedPatientLocation.city}) THEN 1
              ELSE 0
            END DESC,
            COALESCE(jsonb_array_length(practice_sites.practice_sites), 0) DESC,
            COALESCE(array_length(treatments.treatments, 1), 0) DESC,
          `
        : Prisma.empty;

    const students = await this.prisma.$queryRaw<StudentDirectoryRow[]>`
      SELECT
        ce.id_cuenta,
        ce.semestre,
        p.nombres,
        p.apellidos,
        u.nombre AS universidad_nombre,
        fallback_city.nombre AS university_city,
        fallback_locality.nombre AS university_locality,
        pe.descripcion,
        pe.disponibilidad_general,
        pe.foto_url,
        practice.city AS city,
        practice.locality AS locality,
        practice.practice_site,
        COALESCE(practice_sites.practice_sites, '[]'::jsonb) AS practice_sites,
        COALESCE(treatments.treatments, ARRAY[]::text[]) AS treatments
      FROM cuenta_estudiante ce
      INNER JOIN cuenta_acceso ca ON ca.id_cuenta = ce.id_cuenta
      INNER JOIN persona p ON p.id_persona = ce.id_persona
      INNER JOIN universidad u ON u.id_universidad = ce.id_universidad
      INNER JOIN localidad fallback_locality
        ON fallback_locality.id_localidad = u.id_localidad_principal
      INNER JOIN ciudad fallback_city
        ON fallback_city.id_ciudad = fallback_locality.id_ciudad
      LEFT JOIN perfil_estudiante pe
        ON pe.id_cuenta_estudiante = ce.id_cuenta
      LEFT JOIN LATERAL (
        SELECT
          s.nombre AS practice_site,
          l.nombre AS locality,
          c.nombre AS city
        FROM estudiante_sede_practica esp
        INNER JOIN sede s ON s.id_sede = esp.id_sede
        INNER JOIN localidad l ON l.id_localidad = s.id_localidad
        INNER JOIN ciudad c ON c.id_ciudad = l.id_ciudad
        WHERE esp.id_cuenta_estudiante = ce.id_cuenta
          AND esp.estado = 'ACTIVO'::estado_simple_enum
          AND s.estado = 'ACTIVO'::estado_simple_enum
        ORDER BY ${practiceLocationOrder} esp.fecha_creacion DESC
        LIMIT 1
      ) practice ON TRUE
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', s.name,
            'city', s.city,
            'locality', s.locality
          )
          ORDER BY s.sort_weight DESC, s.created_at DESC
        ) AS practice_sites
        FROM (
          SELECT
            sede.nombre AS name,
            c.nombre AS city,
            l.nombre AS locality,
            esp.fecha_creacion AS created_at,
            CASE
              WHEN ${normalizedLocality} <> '' AND l.nombre ILIKE ${normalizedLocality} THEN 2
              WHEN ${normalizedCity} <> '' AND c.nombre ILIKE ${normalizedCity} THEN 1
              ELSE 0
            END AS sort_weight
          FROM estudiante_sede_practica esp
          INNER JOIN sede ON sede.id_sede = esp.id_sede
          INNER JOIN localidad l ON l.id_localidad = sede.id_localidad
          INNER JOIN ciudad c ON c.id_ciudad = l.id_ciudad
          WHERE esp.id_cuenta_estudiante = ce.id_cuenta
            AND esp.estado = 'ACTIVO'::estado_simple_enum
            AND sede.estado = 'ACTIVO'::estado_simple_enum
        ) s
      ) practice_sites ON TRUE
      LEFT JOIN LATERAL (
        SELECT array_agg(tt.nombre ORDER BY tt.nombre)::text[] AS treatments
        FROM estudiante_tratamiento et
        INNER JOIN tipo_tratamiento tt
          ON tt.id_tipo_tratamiento = et.id_tipo_tratamiento
        WHERE et.id_cuenta_estudiante = ce.id_cuenta
          AND et.estado = 'ACTIVO'::estado_simple_enum
      ) treatments ON TRUE
      WHERE ${Prisma.join(conditions, " AND ")}
      ORDER BY ${initialRelevanceOrder} ce.fecha_creacion DESC
      LIMIT ${candidateLimit}
    `;

    return students
      .slice(0, limit)
      .map((student) => this.toStudentDirectoryDtoFromRow(student));
  }

  async getDashboard(
    patientAccountId: number,
  ): Promise<PatientPortalDashboardDto> {
    const patient = await this.prisma.cuenta_paciente.findUnique({
      where: { id_cuenta: patientAccountId },
      include: {
        persona: true,
        localidad: { include: { ciudad: true } },
        tutor_responsable: true,
        cuenta_acceso: { select: { correo: true } },
      },
    });
    const patientLocation = patient
      ? {
          city: patient.localidad.ciudad.nombre,
          locality: patient.localidad.nombre,
        }
      : null;
    const initialStudentQuery: PatientStudentDirectoryQueryDto = {
      limit: PATIENT_INITIAL_STUDENT_DIRECTORY_LIMIT,
    };
    const [solicitudes, valoraciones, initialStudents, studentFilters] =
      await Promise.all([
        this.prisma.solicitud.findMany({
          where: { id_cuenta_paciente: patientAccountId },
          include: {
            cuenta_estudiante: {
              include: {
                persona: true,
                universidad: true,
              },
            },
            conversacion: {
              include: {
                mensaje: {
                  orderBy: { enviado_at: "desc" },
                  take: 1,
                  include: { cuenta_acceso: { select: { tipo_cuenta: true } } },
                },
              },
            },
            cita: {
              include: {
                tipo_cita: true,
                sede: { include: { localidad: { include: { ciudad: true } } } },
                docente_universidad: { include: { docente: true } },
              },
            },
          },
          orderBy: { fecha_envio: "desc" },
        }),
        this.prisma.valoracion.findMany({
          where: { id_cuenta_receptor: patientAccountId },
          include: {
            cita: {
              include: {
                tipo_cita: true,
                sede: true,
                solicitud: {
                  include: {
                    cuenta_estudiante: {
                      include: { persona: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: { fecha_creacion: "desc" },
        }),
        this.getStudentDirectory(
          patientAccountId,
          initialStudentQuery,
          patientLocation ?? undefined,
        ),
        this.getStudentDirectoryFilters(),
      ]);
    const students =
      patient && initialStudents.length === 0
        ? await this.getStudentDirectory(
            patientAccountId,
            { limit: PATIENT_INITIAL_STUDENT_DIRECTORY_LIMIT },
            patientLocation ?? undefined,
          )
        : initialStudents;

    const profile = patient ? this.toProfileDto(patient) : this.emptyProfile();

    const requests: PatientRequestDto[] = solicitudes.map((s) =>
      this.toRequestDto(s),
    );

    const appointments: PatientAppointmentDto[] = solicitudes.flatMap((s) =>
      s.cita.map((c) => ({
        additionalInfo: c.informacion_adicional ?? null,
        appointmentType: c.tipo_cita.nombre,
        city: c.sede.localidad.ciudad.nombre,
        createdAt: c.fecha_creacion.toISOString(),
        endAt: c.fecha_hora_fin.toISOString(),
        id: String(c.id_cita),
        respondedAt: c.respondida_at?.toISOString() ?? null,
        siteName: c.sede.nombre,
        startAt: c.fecha_hora_inicio.toISOString(),
        status: c.estado,
        studentName: `${s.cuenta_estudiante.persona.nombres} ${s.cuenta_estudiante.persona.apellidos}`,
        teacherName: `${c.docente_universidad.docente.nombres} ${c.docente_universidad.docente.apellidos}`,
        universityName: s.cuenta_estudiante.universidad.nombre,
      })),
    );

    const conversations: PatientConversationDto[] = solicitudes
      .filter((s) => s.conversacion !== null)
      .map((s) => {
        const conv = s.conversacion!;
        const studentName = `${s.cuenta_estudiante.persona.nombres} ${s.cuenta_estudiante.persona.apellidos}`;
        return {
          id: String(conv.id_conversacion),
          messages: conv.mensaje.map((m) => ({
            author:
              m.cuenta_acceso.tipo_cuenta === "PACIENTE"
                ? "PACIENTE"
                : "ESTUDIANTE",
            authorName:
              m.cuenta_acceso.tipo_cuenta === "PACIENTE"
                ? profile.firstName
                : studentName,
            content: m.contenido,
            id: String(m.id_mensaje),
            sentAt: m.enviado_at.toISOString(),
          })),
          reason: s.motivo_consulta ?? null,
          requestId: String(s.id_solicitud),
          status: conv.estado,
          studentId: String(s.id_cuenta_estudiante),
          studentName,
          universityName: s.cuenta_estudiante.universidad.nombre,
          unreadCount: 0,
        };
      });

    const reviews: PatientAppointmentReviewDto[] = valoraciones.map(
      (valoracion) => ({
        appointmentLabel: valoracion.cita.tipo_cita.nombre,
        comment: valoracion.comentario ?? null,
        createdAt: valoracion.fecha_creacion.toISOString(),
        id: String(valoracion.id_valoracion),
        rating: valoracion.calificacion,
        siteName: valoracion.cita.sede.nombre,
        studentName: `${valoracion.cita.solicitud.cuenta_estudiante.persona.nombres} ${valoracion.cita.solicitud.cuenta_estudiante.persona.apellidos}`,
      }),
    );

    return {
      appointments,
      conversations,
      profile,
      reviews,
      requests,
      studentFilters,
      students,
    };
  }

  async updateProfile(
    patientAccountId: number,
    payload: UpdatePatientProfileDto,
  ): Promise<PatientProfileDto> {
    const patient = await this.prisma.cuenta_paciente.findUnique({
      where: { id_cuenta: patientAccountId },
      include: { localidad: { include: { ciudad: true } } },
    });

    if (!patient) {
      throw new NotFoundException("No encontramos el perfil del paciente.");
    }

    const normalizedPhone = normalizeText(payload.phone ?? "");
    const normalizedLocality = normalizeText(payload.locality ?? "");
    const avatarSrc = payload.avatarSrc?.trim() || null;

    let localidadId = patient.id_localidad;

    if (normalizedLocality && normalizedLocality !== patient.localidad.nombre) {
      const localidad = await this.prisma.localidad.findFirst({
        where: { nombre: { equals: normalizedLocality, mode: "insensitive" } },
      });
      if (localidad) {
        localidadId = localidad.id_localidad;
      }
    }

    const updated = await this.prisma.cuenta_paciente.update({
      where: { id_cuenta: patientAccountId },
      data: {
        celular: normalizedPhone || patient.celular,
        foto_url: avatarSrc,
        id_localidad: localidadId,
      },
      include: {
        persona: true,
        localidad: { include: { ciudad: true } },
        tutor_responsable: true,
        cuenta_acceso: { select: { correo: true } },
      },
    });

    return this.toProfileDto(updated);
  }

  async createRequest(
    patientAccountId: number,
    payload: CreatePatientRequestDto,
  ): Promise<PatientRequestDto> {
    const studentAccountId = Number(payload.studentId);
    const normalizedReason = normalizeText(payload.reason ?? "");

    if (!Number.isInteger(studentAccountId) || studentAccountId <= 0) {
      throw new BadRequestException("El estudiante seleccionado no es valido.");
    }

    if (!normalizedReason) {
      throw new BadRequestException(
        "Debes ingresar el motivo de la solicitud.",
      );
    }

    const [patient, student, existingRequest] = await Promise.all([
      this.prisma.cuenta_paciente.findUnique({
        where: { id_cuenta: patientAccountId },
        select: { id_cuenta: true },
      }),
      this.prisma.cuenta_estudiante.findFirst({
        where: {
          id_cuenta: studentAccountId,
          cuenta_acceso: { estado: "ACTIVO" },
        },
        include: {
          persona: true,
          universidad: true,
        },
      }),
      this.prisma.solicitud.findFirst({
        where: {
          id_cuenta_estudiante: studentAccountId,
          id_cuenta_paciente: patientAccountId,
          estado: {
            in: ["PENDIENTE", "ACEPTADA"],
          },
        },
        select: { id_solicitud: true },
      }),
    ]);

    if (!patient) {
      throw new NotFoundException("No encontramos el perfil del paciente.");
    }

    if (!student) {
      throw new NotFoundException("No encontramos el estudiante seleccionado.");
    }

    if (existingRequest) {
      throw new ConflictException(
        "Ya tienes una solicitud activa con este estudiante.",
      );
    }

    const request = await this.prisma.solicitud.create({
      data: {
        id_cuenta_estudiante: studentAccountId,
        id_cuenta_paciente: patientAccountId,
        motivo_consulta: normalizedReason,
      },
      include: {
        cita: {
          select: { id_cita: true },
        },
        conversacion: {
          select: { id_conversacion: true },
        },
        cuenta_estudiante: {
          include: {
            persona: true,
            universidad: true,
          },
        },
      },
    });

    return this.toRequestDto(request);
  }

  async updateRequestStatus(
    patientAccountId: number,
    requestId: number,
    payload: UpdatePatientRequestStatusDto,
  ): Promise<PatientRequestDto> {
    const solicitud = await this.prisma.solicitud.findFirst({
      where: { id_solicitud: requestId, id_cuenta_paciente: patientAccountId },
    });

    if (!solicitud) {
      throw new NotFoundException("La solicitud no existe o no te pertenece.");
    }

    const updated = await this.prisma.solicitud.update({
      where: { id_solicitud: requestId },
      data: { estado: payload.status, fecha_respuesta: new Date() },
      include: {
        cita: { select: { id_cita: true } },
        conversacion: { select: { id_conversacion: true } },
        cuenta_estudiante: { include: { persona: true, universidad: true } },
      },
    });

    return this.toRequestDto(updated);
  }

  async updateAppointmentStatus(
    patientAccountId: number,
    appointmentId: number,
    payload: UpdatePatientAppointmentStatusDto,
  ): Promise<PatientAppointmentDto> {
    const cita = await this.prisma.cita.findFirst({
      where: {
        id_cita: appointmentId,
        solicitud: { id_cuenta_paciente: patientAccountId },
      },
      include: {
        tipo_cita: true,
        sede: { include: { localidad: { include: { ciudad: true } } } },
        docente_universidad: { include: { docente: true } },
        solicitud: {
          include: {
            cuenta_estudiante: {
              include: { persona: true, universidad: true },
            },
          },
        },
      },
    });

    if (!cita) {
      throw new NotFoundException("La cita no existe o no te pertenece.");
    }

    const updated = await this.prisma.cita.update({
      where: { id_cita: appointmentId },
      data: {
        estado: payload.status,
        ...(payload.status === 'CANCELADA'
          ? {
              cancelada_por_cuenta: patientAccountId,
              respondida_at: new Date(),
              motivo_cancelacion: 'Cancelada por el paciente',
            }
          : {}),
        ...(payload.status === 'ACEPTADA' || payload.status === 'RECHAZADA'
          ? { respondida_at: new Date() }
          : {}),
      },
      include: {
        tipo_cita: true,
        sede: { include: { localidad: { include: { ciudad: true } } } },
        docente_universidad: { include: { docente: true } },
        solicitud: {
          include: {
            cuenta_estudiante: {
              include: {
                persona: true,
                universidad: true,
                cuenta_acceso: { select: { correo: true } },
              },
            },
          },
        },
      },
    });

    if (payload.status === 'CANCELADA') {
      await this.prisma.notificacion.create({
        data: {
          id_cuenta_destino: updated.solicitud.id_cuenta_estudiante,
          tipo: 'CANCELACION_CITA',
          contenido: 'El paciente cancelo una de tus citas agendadas.',
        },
      });

      const studentEmail = updated.solicitud.cuenta_estudiante.cuenta_acceso.correo;
      const studentName = `${updated.solicitud.cuenta_estudiante.persona.nombres} ${updated.solicitud.cuenta_estudiante.persona.apellidos}`;

      const [patientPerson, patientAccount] = await Promise.all([
        this.prisma.cuenta_paciente.findUnique({
          where: { id_cuenta: patientAccountId },
          include: { persona: true },
        }),
        this.prisma.cuenta_acceso.findUnique({
          where: { id_cuenta: patientAccountId },
          select: { correo: true },
        }),
      ]);

      if (patientPerson && patientAccount) {
        const patientName = `${patientPerson.persona.nombres} ${patientPerson.persona.apellidos}`;
        void this.mailService.sendAppointmentCancelledToStudent(
          studentEmail,
          studentName,
          patientName,
          updated.tipo_cita.nombre,
          updated.sede.nombre,
          updated.sede.localidad.ciudad.nombre,
          updated.fecha_hora_inicio.toISOString(),
          updated.fecha_hora_fin.toISOString(),
        );
      }
    } else if (payload.status === 'ACEPTADA') {
      await this.prisma.notificacion.create({
        data: {
          id_cuenta_destino: updated.solicitud.id_cuenta_estudiante,
          tipo: 'RESPUESTA_CITA',
          contenido: 'El paciente acepto tu propuesta de cita.',
        },
      });

      // Send confirmation emails to both student and patient
      const patientAccount = await this.prisma.cuenta_acceso.findUnique({
        where: { id_cuenta: patientAccountId },
        select: { correo: true },
      });
      const patientPerson = await this.prisma.cuenta_paciente.findUnique({
        where: { id_cuenta: patientAccountId },
        include: { persona: true },
      });

      const studentEmail = updated.solicitud.cuenta_estudiante.cuenta_acceso.correo;
      const studentName = `${updated.solicitud.cuenta_estudiante.persona.nombres} ${updated.solicitud.cuenta_estudiante.persona.apellidos}`;
      const appointmentType = updated.tipo_cita.nombre;
      const siteName = updated.sede.nombre;
      const city = updated.sede.localidad.ciudad.nombre;
      const startAt = updated.fecha_hora_inicio.toISOString();
      const endAt = updated.fecha_hora_fin.toISOString();

      if (patientAccount && patientPerson) {
        const patientName = `${patientPerson.persona.nombres} ${patientPerson.persona.apellidos}`;
        void this.mailService.sendAppointmentConfirmedToStudent(
          studentEmail,
          studentName,
          patientName,
          appointmentType,
          siteName,
          city,
          startAt,
          endAt,
        );
        void this.mailService.sendAppointmentConfirmedToPatient(
          patientAccount.correo,
          patientName,
          studentName,
          appointmentType,
          siteName,
          city,
          startAt,
          endAt,
        );
      }
    } else if (payload.status === 'RECHAZADA') {
      await this.prisma.notificacion.create({
        data: {
          id_cuenta_destino: updated.solicitud.id_cuenta_estudiante,
          tipo: 'RESPUESTA_CITA',
          contenido: 'El paciente rechazo tu propuesta de cita.',
        },
      });
    }

    return {
      additionalInfo: updated.informacion_adicional ?? null,
      appointmentType: updated.tipo_cita.nombre,
      city: updated.sede.localidad.ciudad.nombre,
      createdAt: updated.fecha_creacion.toISOString(),
      endAt: updated.fecha_hora_fin.toISOString(),
      id: String(updated.id_cita),
      respondedAt: updated.respondida_at?.toISOString() ?? null,
      siteName: updated.sede.nombre,
      startAt: updated.fecha_hora_inicio.toISOString(),
      status: updated.estado,
      studentName: `${updated.solicitud.cuenta_estudiante.persona.nombres} ${updated.solicitud.cuenta_estudiante.persona.apellidos}`,
      teacherName: `${updated.docente_universidad.docente.nombres} ${updated.docente_universidad.docente.apellidos}`,
      universityName: updated.solicitud.cuenta_estudiante.universidad.nombre,
    };
  }

  async getConversation(
    patientAccountId: number,
    conversationId: number,
  ): Promise<PatientConversationDto | null> {
    const solicitud = await this.prisma.solicitud.findFirst({
      where: {
        id_cuenta_paciente: patientAccountId,
        conversacion: { id_conversacion: conversationId },
      },
      include: {
        cuenta_estudiante: { include: { persona: true, universidad: true } },
        cuenta_paciente: { include: { persona: true } },
        conversacion: {
          include: {
            mensaje: {
              orderBy: { enviado_at: "asc" },
              include: { cuenta_acceso: { select: { tipo_cuenta: true } } },
            },
          },
        },
      },
    });

    if (!solicitud || !solicitud.conversacion) {
      return null;
    }

    const conv = solicitud.conversacion;
    const studentName = `${solicitud.cuenta_estudiante.persona.nombres} ${solicitud.cuenta_estudiante.persona.apellidos}`;
    const patientName = `${solicitud.cuenta_paciente.persona.nombres} ${solicitud.cuenta_paciente.persona.apellidos}`;

    return {
      id: String(conv.id_conversacion),
      messages: conv.mensaje.map((m) => ({
        author:
          m.cuenta_acceso.tipo_cuenta === "PACIENTE"
            ? ("PACIENTE" as const)
            : ("ESTUDIANTE" as const),
        authorName:
          m.cuenta_acceso.tipo_cuenta === "PACIENTE"
            ? patientName
            : studentName,
        content: m.contenido,
        id: String(m.id_mensaje),
        sentAt: m.enviado_at.toISOString(),
      })),
      reason: solicitud.motivo_consulta ?? null,
      requestId: String(solicitud.id_solicitud),
      status: conv.estado,
      studentId: String(solicitud.id_cuenta_estudiante),
      studentName,
      universityName: solicitud.cuenta_estudiante.universidad.nombre,
      unreadCount: 0,
    };
  }

  async sendConversationMessage(
    patientAccountId: number,
    conversationId: number,
    content: string,
  ): Promise<PatientConversationMessageDto> {
    const conv = await this.prisma.conversacion.findFirst({
      where: {
        id_conversacion: conversationId,
        estado: "ACTIVA",
        solicitud: { id_cuenta_paciente: patientAccountId },
      },
      include: {
        solicitud: {
          include: {
            cuenta_paciente: { include: { persona: true } },
          },
        },
      },
    });

    if (!conv) {
      throw new NotFoundException(
        "La conversacion no existe, no te pertenece o no esta activa.",
      );
    }

    const msg = await this.prisma.mensaje.create({
      data: {
        id_conversacion: conversationId,
        id_cuenta_remitente: patientAccountId,
        contenido: content,
      },
    });

    const patient = conv.solicitud.cuenta_paciente;
    const authorName = `${patient.persona.nombres} ${patient.persona.apellidos}`;

    return {
      id: String(msg.id_mensaje),
      author: "PACIENTE" as const,
      authorName,
      content: msg.contenido,
      sentAt: msg.enviado_at.toISOString(),
    };
  }

  private toProfileDto(patient: {
    id_cuenta: number;
    celular: string;
    sexo: "FEMENINO" | "MASCULINO" | "OTRO";
    fecha_nacimiento: Date;
    foto_url: string | null;
    persona: { nombres: string; apellidos: string };
    localidad: { nombre: string; ciudad: { nombre: string } };
    tutor_responsable: {
      nombres: string;
      apellidos: string;
      correo: string;
      celular: string;
    } | null;
    cuenta_acceso: { correo: string };
  }): PatientProfileDto {
    return {
      avatarAlt: `Foto de perfil de ${patient.persona.nombres}`,
      avatarFileName: null,
      avatarSrc: patient.foto_url ?? null,
      birthDate: patient.fecha_nacimiento.toISOString().split("T")[0],
      city: patient.localidad.ciudad.nombre,
      email: patient.cuenta_acceso.correo,
      firstName: patient.persona.nombres,
      id: String(patient.id_cuenta),
      lastName: patient.persona.apellidos,
      locality: patient.localidad.nombre,
      phone: patient.celular,
      sex: patient.sexo,
      tutor: patient.tutor_responsable
        ? {
            email: patient.tutor_responsable.correo,
            firstName: patient.tutor_responsable.nombres,
            lastName: patient.tutor_responsable.apellidos,
            phone: patient.tutor_responsable.celular,
          }
        : null,
    };
  }

  private emptyProfile(): PatientProfileDto {
    return {
      avatarAlt: "",
      avatarFileName: null,
      avatarSrc: null,
      birthDate: "",
      city: "",
      email: "",
      firstName: "",
      id: "",
      lastName: "",
      locality: "",
      phone: "",
      sex: "OTRO",
      tutor: null,
    };
  }
}
