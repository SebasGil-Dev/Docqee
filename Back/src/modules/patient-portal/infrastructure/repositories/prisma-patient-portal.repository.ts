import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "@/shared/database/prisma.service";
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

const studentDirectoryInclude =
  Prisma.validator<Prisma.cuenta_estudianteInclude>()({
    persona: true,
    universidad: {
      include: {
        localidad: {
          include: {
            ciudad: true,
          },
        },
      },
    },
    perfil_estudiante: true,
    estudiante_tratamiento: {
      where: { estado: "ACTIVO" },
      include: { tipo_tratamiento: true },
    },
    estudiante_sede_practica: {
      where: { estado: "ACTIVO" },
      include: {
        sede: {
          include: {
            localidad: {
              include: {
                ciudad: true,
              },
            },
          },
        },
      },
    },
  });

type StudentDirectoryRecord = Prisma.cuenta_estudianteGetPayload<{
  include: typeof studentDirectoryInclude;
}>;

type StudentRatingSummary = {
  averageRating: number | null;
  reviewsCount: number;
};

type PatientDirectoryLocationPreference = {
  city: string;
  locality: string;
};

@Injectable()
export class PrismaPatientPortalRepository extends PatientPortalRepository {
  constructor(private readonly prisma: PrismaService) {
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
    ratingMap: Map<number, StudentRatingSummary>,
  ): PatientStudentDirectoryItemDto {
    const rating = ratingMap.get(student.id_cuenta);
    const location = this.getStudentDirectoryLocation(student);

    return {
      avatarAlt: `Foto de perfil de ${student.persona.nombres}`,
      avatarSrc: student.perfil_estudiante?.foto_url ?? null,
      availabilityGeneral:
        student.perfil_estudiante?.disponibilidad_general ?? "",
      availabilityStatus: "available",
      averageRating: rating?.averageRating ?? null,
      biography: student.perfil_estudiante?.descripcion ?? "",
      city: location.city,
      firstName: student.persona.nombres,
      id: String(student.id_cuenta),
      lastName: student.persona.apellidos,
      locality: location.locality,
      practiceSite: location.practiceSite,
      reviewsCount: rating?.reviewsCount ?? 0,
      semester: String(student.semestre),
      treatments: student.estudiante_tratamiento.map(
        (treatment) => treatment.tipo_tratamiento.nombre,
      ),
      universityName: student.universidad.nombre,
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

  private async buildStudentRatingMap(studentIds: number[]) {
    if (studentIds.length === 0) {
      return new Map<number, StudentRatingSummary>();
    }

    const ratingGroups = await this.prisma.valoracion.groupBy({
      by: ["id_cuenta_receptor"],
      where: { id_cuenta_receptor: { in: studentIds } },
      _avg: { calificacion: true },
      _count: { _all: true },
    });

    return new Map(
      ratingGroups.map((ratingGroup) => [
        ratingGroup.id_cuenta_receptor,
        {
          averageRating: ratingGroup._avg.calificacion ?? null,
          reviewsCount: ratingGroup._count._all,
        },
      ]),
    );
  }

  private async getStudentDirectoryFilters(): Promise<PatientStudentDirectoryFiltersDto> {
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

    return {
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
  }

  async getStudentDirectory(
    patientAccountId: number,
    query: PatientStudentDirectoryQueryDto,
    patientLocation?: PatientDirectoryLocationPreference,
  ): Promise<PatientStudentDirectoryItemDto[]> {
    const limit = Math.min(Math.max(query.limit ?? 6, 1), 30);
    const hasSearchCriteria = Boolean(
      normalizeText(query.search ?? "") ||
      normalizeText(query.treatment ?? "") ||
      normalizeText(query.city ?? "") ||
      normalizeText(query.locality ?? "") ||
      normalizeText(query.university ?? ""),
    );
    const candidateLimit = hasSearchCriteria ? 80 : 60;

    const patientLocationPromise = patientLocation
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

    const [resolvedPatientLocation, candidates] = await Promise.all([
      patientLocationPromise,
      this.prisma.cuenta_estudiante.findMany({
        where: this.buildStudentDirectoryWhere(query),
        include: studentDirectoryInclude,
        orderBy: { fecha_creacion: "desc" },
        take: candidateLimit,
      }),
    ]);

    const ratingMap = await this.buildStudentRatingMap(
      candidates.map((student) => student.id_cuenta),
    );

    return candidates
      .map((student) => ({
        dto: this.toStudentDirectoryDto(student, ratingMap),
        location: this.getStudentDirectoryLocation(student),
        rating: ratingMap.get(student.id_cuenta),
      }))
      .sort((first, second) => {
        if (hasSearchCriteria) {
          return (
            (second.rating?.averageRating ?? 0) -
              (first.rating?.averageRating ?? 0) ||
            (second.rating?.reviewsCount ?? 0) -
              (first.rating?.reviewsCount ?? 0)
          );
        }

        const patientLocality =
          resolvedPatientLocation?.locality.toLowerCase() ?? "";
        const patientCity = resolvedPatientLocation?.city.toLowerCase() ?? "";
        const firstSameLocality =
          first.location.locality.toLowerCase() === patientLocality ? 1 : 0;
        const secondSameLocality =
          second.location.locality.toLowerCase() === patientLocality ? 1 : 0;
        const firstSameCity =
          first.location.city.toLowerCase() === patientCity ? 1 : 0;
        const secondSameCity =
          second.location.city.toLowerCase() === patientCity ? 1 : 0;

        return (
          secondSameLocality - firstSameLocality ||
          secondSameCity - firstSameCity ||
          (second.rating?.averageRating ?? 0) -
            (first.rating?.averageRating ?? 0) ||
          (second.rating?.reviewsCount ?? 0) - (first.rating?.reviewsCount ?? 0)
        );
      })
      .slice(0, limit)
      .map((student) => student.dto);
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
    const initialStudentQuery: PatientStudentDirectoryQueryDto = patientLocation
      ? {
          city: patientLocation.city,
          limit: 6,
          locality: patientLocation.locality,
        }
      : { limit: 6 };
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
                  orderBy: { enviado_at: "asc" },
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
            { limit: 6 },
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
        endAt: c.fecha_hora_fin.toISOString(),
        id: String(c.id_cita),
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
      data: { estado: payload.status },
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

    return {
      additionalInfo: updated.informacion_adicional ?? null,
      appointmentType: updated.tipo_cita.nombre,
      city: updated.sede.localidad.ciudad.nombre,
      endAt: updated.fecha_hora_fin.toISOString(),
      id: String(updated.id_cita),
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
