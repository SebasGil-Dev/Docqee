import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@/shared/database/prisma.service';
import { MailService } from '@/shared/mail/mail.service';
import { normalizeText } from '@/shared/utils/front-format.util';
import { CreateStudentAppointmentReviewDto } from '../../application/dto/create-student-appointment-review.dto';
import { UpsertStudentAppointmentDto } from '../../application/dto/upsert-student-appointment.dto';
import { UpsertStudentScheduleBlockDto } from '../../application/dto/upsert-student-schedule-block.dto';
import { UpdateStudentProfileDto } from '../../application/dto/update-student-profile.dto';
import { StudentAgendaAppointmentDto } from '../../application/dto/student-agenda-appointment.dto';
import { StudentAppointmentTypeDto } from '../../application/dto/student-appointment-type.dto';
import { StudentAppointmentReviewDto } from '../../application/dto/student-appointment-review.dto';
import { StudentConversationDto } from '../../application/dto/student-conversation.dto';
import { StudentConversationMessageDto } from '../../application/dto/student-conversation-message.dto';
import { StudentPortalDashboardDto } from '../../application/dto/student-portal-dashboard.dto';
import { StudentPracticeSiteDto } from '../../application/dto/student-practice-site.dto';
import { StudentProfileDto } from '../../application/dto/student-profile.dto';
import { StudentTreatmentTypeDto } from '../../application/dto/student-treatment-type.dto';
import { StudentRequestDto } from '../../application/dto/student-request.dto';
import { StudentScheduleBlockDto } from '../../application/dto/student-schedule-block.dto';
import { StudentSupervisorDto } from '../../application/dto/student-supervisor.dto';
import { StudentTreatmentDto } from '../../application/dto/student-treatment.dto';
import { StudentPortalRepository } from '../../domain/repositories/student-portal.repository';

const APPOINTMENT_CHANGE_NOTICE_HOURS = 48;
const APPOINTMENT_CHANGE_NOTICE_MS =
  APPOINTMENT_CHANGE_NOTICE_HOURS * 60 * 60 * 1000;
const RESCHEDULE_NOTICE_ERROR_MESSAGE =
  'No se puede reprogramar esta cita porque esta demasiado proxima o la fecha propuesta no cumple las reglas de agenda. Elige un horario con al menos 48 horas de anticipacion.';

type StudentRequestPatientReviewRecord = {
  calificacion: number;
  comentario: string | null;
  cuenta_acceso_valoracion_id_cuenta_emisorTocuenta_acceso: {
    cuenta_estudiante: {
      persona: {
        apellidos: string;
        nombres: string;
      };
    } | null;
  };
  fecha_creacion: Date;
  id_cuenta_receptor: number;
  id_valoracion: number;
};

type StudentPortalRequestRecord = {
  cita: unknown[];
  conversacion: {
    estado: string;
    id_conversacion: number;
  } | null;
  cuenta_paciente: {
    fecha_nacimiento: Date;
    foto_url: string | null;
    localidad: {
      ciudad: {
        nombre: string;
      };
      nombre: string;
    };
    persona: {
      apellidos: string;
      nombres: string;
    };
  };
  estado: StudentRequestDto['status'];
  fecha_envio: Date;
  fecha_respuesta: Date | null;
  id_solicitud: number;
  motivo_consulta: string | null;
};

function calcAge(birthDate: Date): number {
  const today = new Date();
  return (
    today.getFullYear() -
    birthDate.getFullYear() -
    (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0)
  );
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalizedValue = typeof value === 'string' ? normalizeText(value) : '';
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function calculateAverageRating(reviews: StudentRequestPatientReviewRecord[]) {
  if (reviews.length === 0) {
    return null;
  }

  const totalRating = reviews.reduce((total, review) => total + review.calificacion, 0);
  return Math.round((totalRating / reviews.length) * 10) / 10;
}

function getPatientReviewAuthorName(review: StudentRequestPatientReviewRecord) {
  const author =
    review.cuenta_acceso_valoracion_id_cuenta_emisorTocuenta_acceso.cuenta_estudiante
      ?.persona;

  return author ? `${author.nombres} ${author.apellidos}` : 'Estudiante';
}

@Injectable()
export class PrismaStudentPortalRepository extends StudentPortalRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {
    super();
  }

  private async findStudentProfileRecord(studentAccountId: number) {
    return this.prisma.cuenta_estudiante.findUnique({
      where: { id_cuenta: studentAccountId },
      include: {
        persona: true,
        universidad: true,
        cuenta_acceso: { select: { correo: true } },
        perfil_estudiante: true,
        enlace_profesional: {
          orderBy: { id_enlace_profesional: 'asc' },
        },
      },
    });
  }

  private toStudentProfileDto(
    student:
      | Awaited<ReturnType<PrismaStudentPortalRepository['findStudentProfileRecord']>>
      | null,
  ): StudentProfileDto {
    if (!student) {
      return {
        availabilityGeneral: '',
        avatarAlt: 'Foto del estudiante',
        avatarFileName: null,
        avatarSrc: null,
        biography: '',
        email: '',
        firstName: '',
        id: '',
        lastName: '',
        links: [],
        semester: '',
        universityLogoAlt: 'Logo de la universidad',
        universityLogoSrc: null,
        universityName: '',
      };
    }

    return {
      availabilityGeneral: student.perfil_estudiante?.disponibilidad_general ?? '',
      avatarAlt: `Foto de perfil de ${student.persona.nombres}`,
      avatarFileName: null,
      avatarSrc: student.perfil_estudiante?.foto_url ?? null,
      biography: student.perfil_estudiante?.descripcion ?? '',
      email: student.cuenta_acceso.correo,
      firstName: student.persona.nombres,
      id: String(student.id_cuenta),
      lastName: student.persona.apellidos,
      links: student.enlace_profesional.map((link) => ({
        id: String(link.id_enlace_profesional),
        type: link.tipo_enlace,
        url: link.url,
      })),
      semester: String(student.semestre),
      universityLogoAlt: `Logo de ${student.universidad.nombre}`,
      universityLogoSrc: student.universidad.logo_url ?? null,
      universityName: student.universidad.nombre,
    };
  }

  private async getPatientReviewsByAccountId(
    patientAccountIds: number[],
    currentStudentAccountId: number,
  ) {
    const uniquePatientAccountIds = [...new Set(patientAccountIds)];

    if (uniquePatientAccountIds.length === 0) {
      return new Map<number, StudentRequestPatientReviewRecord[]>();
    }

    const patientReviews = await this.prisma.valoracion.findMany({
      where: {
        id_cuenta_emisor: { not: currentStudentAccountId },
        id_cuenta_receptor: { in: uniquePatientAccountIds },
      },
      include: {
        cuenta_acceso_valoracion_id_cuenta_emisorTocuenta_acceso: {
          include: {
            cuenta_estudiante: {
              include: {
                persona: true,
              },
            },
          },
        },
      },
      orderBy: { fecha_creacion: 'desc' },
    });
    const patientReviewsByAccountId = new Map<number, StudentRequestPatientReviewRecord[]>();

    patientReviews.forEach((review) => {
      const currentReviews = patientReviewsByAccountId.get(review.id_cuenta_receptor) ?? [];
      currentReviews.push(review);
      patientReviewsByAccountId.set(review.id_cuenta_receptor, currentReviews);
    });

    return patientReviewsByAccountId;
  }

  private toStudentRequestDto(
    request: StudentPortalRequestRecord,
    patientReviews: StudentRequestPatientReviewRecord[],
  ): StudentRequestDto {
    const patientName = `${request.cuenta_paciente.persona.nombres} ${request.cuenta_paciente.persona.apellidos}`;
    const requestStatus =
      request.estado === 'ACEPTADA' && request.conversacion?.estado === 'CERRADA'
        ? 'CERRADA'
        : request.estado;

    return {
      appointmentsCount: request.cita.length,
      conversationEnabled: request.conversacion?.estado === 'ACTIVA',
      conversationId: request.conversacion ? String(request.conversacion.id_conversacion) : null,
      id: String(request.id_solicitud),
      patientAge: calcAge(request.cuenta_paciente.fecha_nacimiento),
      patientCity: request.cuenta_paciente.localidad.ciudad.nombre,
      patientLocality: request.cuenta_paciente.localidad.nombre,
      patientName,
      patientProfile: {
        avatarAlt: `Foto de perfil de ${patientName}`,
        avatarSrc: request.cuenta_paciente.foto_url ?? null,
        averageRating: calculateAverageRating(patientReviews),
        phone: null,
        reviews: patientReviews.map((review) => ({
          authorName: getPatientReviewAuthorName(review),
          comment: review.comentario ?? null,
          createdAt: review.fecha_creacion.toISOString(),
          id: String(review.id_valoracion),
          rating: review.calificacion,
        })),
      },
      reason: request.motivo_consulta ?? null,
      responseAt: request.fecha_respuesta?.toISOString() ?? null,
      sentAt: request.fecha_envio.toISOString(),
      status: requestStatus,
    };
  }

  async getDashboard(studentAccountId: number): Promise<StudentPortalDashboardDto> {
    const [student, solicitudes, bloques, valoraciones, tiposCita] = await Promise.all([
      this.prisma.cuenta_estudiante.findUnique({
        where: { id_cuenta: studentAccountId },
        include: {
          persona: true,
          universidad: true,
          cuenta_acceso: { select: { correo: true } },
          perfil_estudiante: true,
          enlace_profesional: true,
          estudiante_tratamiento: { include: { tipo_tratamiento: true } },
          estudiante_sede_practica: {
            include: { sede: { include: { localidad: { include: { ciudad: true } } } } },
          },
        },
      }),
      this.prisma.solicitud.findMany({
        where: { id_cuenta_estudiante: studentAccountId },
        include: {
          cuenta_paciente: {
            include: {
              persona: true,
              localidad: { include: { ciudad: true } },
            },
          },
          conversacion: {
            include: {
              mensaje: {
                orderBy: { enviado_at: 'asc' },
                include: { cuenta_acceso: { select: { tipo_cuenta: true } } },
              },
            },
          },
          cita: {
            include: {
              tipo_cita: true,
              sede: { include: { localidad: { include: { ciudad: true } } } },
              docente_universidad: { include: { docente: true } },
              cita_tratamiento: { include: { tipo_tratamiento: true } },
              reprogramacion_cita: {
                where: { estado: 'PENDIENTE' },
                orderBy: { fecha_creacion: 'desc' },
                take: 1,
                include: {
                  nueva_sede: { include: { localidad: { include: { ciudad: true } } } },
                  nuevo_docente_universidad: { include: { docente: true } },
                },
              },
              valoracion: {
                where: { id_cuenta_emisor: studentAccountId },
                select: { calificacion: true },
                take: 1,
              },
            },
          },
        },
        orderBy: { fecha_envio: 'desc' },
      }),
      this.prisma.horario_bloqueado.findMany({
        where: { id_cuenta_estudiante: studentAccountId },
        orderBy: { hora_inicio: 'asc' },
      }),
      this.prisma.valoracion.findMany({
        where: { id_cuenta_receptor: studentAccountId },
        include: {
          cita: {
            include: {
              tipo_cita: true,
              sede: true,
              solicitud: {
                include: { cuenta_paciente: { include: { persona: true } } },
              },
            },
          },
        },
        orderBy: { fecha_creacion: 'desc' },
      }),
      this.prisma.tipo_cita.findMany({
        orderBy: { nombre: 'asc' },
      }),
    ]);

    const studentName = student
      ? `${student.persona.nombres} ${student.persona.apellidos}`
      : 'Estudiante';

    const profile = this.toStudentProfileDto(student);

    const treatments: StudentTreatmentDto[] = (student?.estudiante_tratamiento ?? []).map((t) => ({
      description: t.tipo_tratamiento.descripcion ?? '',
      id: String(t.id_estudiante_tratamiento),
      treatmentTypeId: String(t.id_tipo_tratamiento),
      name: t.tipo_tratamiento.nombre,
      status: t.estado === 'ACTIVO' ? 'active' : 'inactive',
    }));
    const appointmentTypes: StudentAppointmentTypeDto[] = tiposCita.map((tipoCita) => ({
      id: String(tipoCita.id_tipo_cita),
      name: tipoCita.nombre,
    }));

    const practiceSites: StudentPracticeSiteDto[] = (student?.estudiante_sede_practica ?? []).map((sp) => ({
      address: sp.sede.direccion ?? '',
      city: sp.sede.localidad.ciudad.nombre,
      id: String(sp.id_estudiante_sede_practica),
      siteId: String(sp.id_sede),
      locality: sp.sede.localidad.nombre,
      name: sp.sede.nombre,
      status: sp.estado === 'ACTIVO' ? 'active' : 'inactive',
    }));

    const scheduleBlocks: StudentScheduleBlockDto[] = bloques.map((b) =>
      this.toScheduleBlockDto(b),
    );
    const patientReviewsByAccountId = await this.getPatientReviewsByAccountId(
      solicitudes.map((solicitud) => solicitud.cuenta_paciente.id_cuenta),
      studentAccountId,
    );

    const requests: StudentRequestDto[] = solicitudes.map((s) =>
      this.toStudentRequestDto(
        s,
        patientReviewsByAccountId.get(s.cuenta_paciente.id_cuenta) ?? [],
      ),
    );

    const appointments: StudentAgendaAppointmentDto[] = solicitudes.flatMap((s) =>
      s.cita.map((c) => {
        const pendingReschedule = c.reprogramacion_cita[0] ?? null;
        const displaySite = pendingReschedule?.nueva_sede ?? c.sede;
        const displaySupervisor =
          pendingReschedule?.nuevo_docente_universidad ?? c.docente_universidad;

        return {
          additionalInfo: c.informacion_adicional ?? null,
          appointmentTypeId: String(c.id_tipo_cita),
          appointmentType: c.tipo_cita.nombre,
          city: displaySite.localidad.ciudad.nombre,
          createdAt: c.fecha_creacion.toISOString(),
          endAt: (pendingReschedule?.nueva_fecha_hora_fin ?? c.fecha_hora_fin).toISOString(),
          id: String(c.id_cita),
          isRescheduleProposal: Boolean(pendingReschedule),
          myRating: c.valoracion[0]?.calificacion ?? null,
          patientName: `${s.cuenta_paciente.persona.nombres} ${s.cuenta_paciente.persona.apellidos}`,
          requestId: String(s.id_solicitud),
          respondedAt: c.respondida_at?.toISOString() ?? null,
          siteId: String(pendingReschedule?.nueva_id_sede ?? c.id_sede),
          siteName: displaySite.nombre,
          startAt: (pendingReschedule?.nueva_fecha_hora_inicio ?? c.fecha_hora_inicio).toISOString(),
          status: c.estado,
          supervisorId: String(
            pendingReschedule?.nuevo_id_docente_universidad ?? c.id_docente_universidad,
          ),
          supervisorName: `${displaySupervisor.docente.nombres} ${displaySupervisor.docente.apellidos}`,
          treatmentIds: c.cita_tratamiento.map((ct) => String(ct.id_tipo_tratamiento)),
          treatmentNames: c.cita_tratamiento.map((ct) => ct.tipo_tratamiento.nombre),
        };
      }),
    );

    const conversations: StudentConversationDto[] = solicitudes
      .filter((s) => s.estado === 'ACEPTADA' && s.conversacion !== null)
      .map((s) => {
        const conv = s.conversacion!;
        const patientName = `${s.cuenta_paciente.persona.nombres} ${s.cuenta_paciente.persona.apellidos}`;
        return {
          id: String(conv.id_conversacion),
          messages: conv.mensaje.map((m) => ({
            author: m.cuenta_acceso.tipo_cuenta === 'PACIENTE' ? 'PACIENTE' : 'ESTUDIANTE',
            authorName: m.cuenta_acceso.tipo_cuenta === 'PACIENTE' ? patientName : studentName,
            content: m.contenido,
            id: String(m.id_mensaje),
            sentAt: m.enviado_at.toISOString(),
          })),
          patientAge: calcAge(s.cuenta_paciente.fecha_nacimiento),
          patientCity: s.cuenta_paciente.localidad.ciudad.nombre,
          patientName,
          reason: s.motivo_consulta ?? null,
          requestId: String(s.id_solicitud),
          status: conv.estado,
          unreadCount: 0,
        };
      });

    const reviews: StudentAppointmentReviewDto[] = valoraciones.map((v) => ({
      appointmentId: String(v.id_cita),
      appointmentLabel: v.cita.tipo_cita.nombre,
      comment: v.comentario ?? null,
      createdAt: v.fecha_creacion.toISOString(),
      id: String(v.id_valoracion),
      patientName: `${v.cita.solicitud.cuenta_paciente.persona.nombres} ${v.cita.solicitud.cuenta_paciente.persona.apellidos}`,
      rating: v.calificacion,
      siteName: v.cita.sede.nombre,
    }));

    const docentesUniversidad = student
      ? await this.prisma.docente_universidad.findMany({
          where: { id_universidad: student.id_universidad, estado: 'ACTIVO' },
          include: { docente: true },
          orderBy: { docente: { apellidos: 'asc' } },
        })
      : [];

    const supervisors: StudentSupervisorDto[] = docentesUniversidad.map((du) => ({
      id: String(du.id_docente_universidad),
      name: `${du.docente.nombres} ${du.docente.apellidos}`,
      status: 'active' as const,
    }));

    return {
      appointments,
      appointmentTypes,
      conversations,
      practiceSites,
      profile,
      requests,
      reviews,
      scheduleBlocks,
      supervisors,
      treatments,
    };
  }

  async updateProfile(
    studentAccountId: number,
    payload: UpdateStudentProfileDto,
  ): Promise<StudentProfileDto> {
    const student = await this.findStudentProfileRecord(studentAccountId);

    if (!student) {
      throw new NotFoundException('No encontramos el perfil del estudiante.');
    }

    const availabilityGeneral = normalizeText(payload.availabilityGeneral ?? '');
    const biography = normalizeText(payload.biography ?? '');
    const nextAvatarSrc =
      payload.avatarSrc === undefined
        ? student.perfil_estudiante?.foto_url ?? null
        : normalizeOptionalText(payload.avatarSrc);
    const nextLinks = Array.isArray(payload.links)
      ? payload.links
          .map((link) => ({
            type: link.type,
            url: normalizeText(link.url),
          }))
          .filter((link) => link.url.length > 0)
      : [];

    const transactionOperations = [
      this.prisma.perfil_estudiante.upsert({
        where: {
          id_cuenta_estudiante: studentAccountId,
        },
        create: {
          disponibilidad_general: availabilityGeneral,
          descripcion: biography,
          foto_url: nextAvatarSrc,
          id_cuenta_estudiante: studentAccountId,
        },
        update: {
          disponibilidad_general: availabilityGeneral,
          descripcion: biography,
          foto_url: nextAvatarSrc,
        },
      }),
      this.prisma.enlace_profesional.deleteMany({
        where: {
          id_cuenta_estudiante: studentAccountId,
        },
      }),
    ];

    if (nextLinks.length > 0) {
      transactionOperations.push(
        this.prisma.enlace_profesional.createMany({
          data: nextLinks.map((link) => ({
            id_cuenta_estudiante: studentAccountId,
            tipo_enlace: link.type,
            url: link.url,
          })),
        }),
      );
    }

    await this.prisma.$transaction(transactionOperations);

    const refreshedStudent = await this.findStudentProfileRecord(studentAccountId);

    return this.toStudentProfileDto(refreshedStudent);
  }

  async getUniversitySites(studentAccountId: number): Promise<StudentPracticeSiteDto[]> {
    const student = await this.prisma.cuenta_estudiante.findUnique({
      where: { id_cuenta: studentAccountId },
      select: { id_universidad: true },
    });

    if (!student) return [];

    const sedes = await this.prisma.sede.findMany({
      where: { id_universidad: student.id_universidad, estado: 'ACTIVO' },
      include: { localidad: { include: { ciudad: true } } },
      orderBy: { nombre: 'asc' },
    });

    return sedes.map((s) => ({
      address: s.direccion ?? '',
      city: s.localidad.ciudad.nombre,
      id: String(s.id_sede),
      siteId: String(s.id_sede),
      locality: s.localidad.nombre,
      name: s.nombre,
      status: 'active' as const,
    }));
  }

  async updatePracticeSites(studentAccountId: number, siteIds: number[]): Promise<StudentPracticeSiteDto[]> {
    const student = await this.prisma.cuenta_estudiante.findUnique({
      where: { id_cuenta: studentAccountId },
      select: { id_universidad: true },
    });

    if (!student) throw new NotFoundException('No encontramos el estudiante.');

    // Verify all sedes belong to the student's university
    const validSedes = await this.prisma.sede.findMany({
      where: { id_sede: { in: siteIds }, id_universidad: student.id_universidad, estado: 'ACTIVO' },
      select: { id_sede: true },
    });
    const validIds = validSedes.map((s) => s.id_sede);

    // Delete removed, upsert kept/added
    await this.prisma.$transaction([
      this.prisma.estudiante_sede_practica.deleteMany({
        where: { id_cuenta_estudiante: studentAccountId, id_sede: { notIn: validIds } },
      }),
      ...validIds.map((id_sede) =>
        this.prisma.estudiante_sede_practica.upsert({
          where: { id_cuenta_estudiante_id_sede: { id_cuenta_estudiante: studentAccountId, id_sede } },
          create: { id_cuenta_estudiante: studentAccountId, id_sede, estado: 'ACTIVO' },
          update: { estado: 'ACTIVO' },
        }),
      ),
    ]);

    const updated = await this.prisma.estudiante_sede_practica.findMany({
      where: { id_cuenta_estudiante: studentAccountId },
      include: { sede: { include: { localidad: { include: { ciudad: true } } } } },
      orderBy: { sede: { nombre: 'asc' } },
    });

    return updated.map((sp) => ({
      address: sp.sede.direccion ?? '',
      city: sp.sede.localidad.ciudad.nombre,
      id: String(sp.id_estudiante_sede_practica),
      siteId: String(sp.id_sede),
      locality: sp.sede.localidad.nombre,
      name: sp.sede.nombre,
      status: sp.estado === 'ACTIVO' ? 'active' as const : 'inactive' as const,
    }));
  }

  async getTreatmentTypes(): Promise<StudentTreatmentTypeDto[]> {
    const types = await this.prisma.tipo_tratamiento.findMany({
      orderBy: { nombre: 'asc' },
    });
    return types.map((t) => ({
      id: String(t.id_tipo_tratamiento),
      name: t.nombre,
      description: t.descripcion ?? '',
    }));
  }

  async updateTreatments(studentAccountId: number, treatmentTypeIds: number[]): Promise<StudentTreatmentDto[]> {
    await this.prisma.$transaction([
      this.prisma.estudiante_tratamiento.deleteMany({
        where: { id_cuenta_estudiante: studentAccountId, id_tipo_tratamiento: { notIn: treatmentTypeIds } },
      }),
      ...treatmentTypeIds.map((id_tipo_tratamiento) =>
        this.prisma.estudiante_tratamiento.upsert({
          where: { id_cuenta_estudiante_id_tipo_tratamiento: { id_cuenta_estudiante: studentAccountId, id_tipo_tratamiento } },
          create: { id_cuenta_estudiante: studentAccountId, id_tipo_tratamiento, estado: 'ACTIVO' },
          update: { estado: 'ACTIVO' },
        }),
      ),
    ]);

    const updated = await this.prisma.estudiante_tratamiento.findMany({
      where: { id_cuenta_estudiante: studentAccountId },
      include: { tipo_tratamiento: true },
      orderBy: { tipo_tratamiento: { nombre: 'asc' } },
    });

    return updated.map((t) => ({
      description: t.tipo_tratamiento.descripcion ?? '',
      id: String(t.id_estudiante_tratamiento),
      treatmentTypeId: String(t.id_tipo_tratamiento),
      name: t.tipo_tratamiento.nombre,
      status: t.estado === 'ACTIVO' ? 'active' as const : 'inactive' as const,
    }));
  }

  // ─── Schedule block helpers ─────────────────────────────────────────────────

  private formatBlockTime(date: Date): string {
    return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
  }

  private parseBlockTime(timeStr: string): Date {
    const [h = 0, m = 0] = timeStr.split(':').map(Number);
    return new Date(Date.UTC(2000, 0, 1, h, m, 0));
  }

  private toScheduleBlockDto(block: {
    id_horario_bloqueado: number;
    tipo_bloqueo: string;
    fecha_especifica: Date | null;
    dia_semana: number | null;
    hora_inicio: Date;
    hora_fin: Date;
    fecha_inicio_recurrencia: Date | null;
    fecha_fin_recurrencia: Date | null;
    motivo: string | null;
    estado: string;
  }): StudentScheduleBlockDto {
    return {
      dayOfWeek: block.dia_semana,
      endTime: this.formatBlockTime(block.hora_fin),
      id: String(block.id_horario_bloqueado),
      reason: block.motivo,
      recurrenceEndDate: block.fecha_fin_recurrencia?.toISOString().split('T')[0] ?? null,
      recurrenceStartDate: block.fecha_inicio_recurrencia?.toISOString().split('T')[0] ?? null,
      specificDate: block.fecha_especifica?.toISOString().split('T')[0] ?? null,
      startTime: this.formatBlockTime(block.hora_inicio),
      status: block.estado === 'ACTIVO' ? 'active' : 'inactive',
      type: block.tipo_bloqueo as 'ESPECIFICO' | 'RECURRENTE',
    };
  }

  // ─── Appointment conflict detection ────────────────────────────────────────

  private utcToBogota(utcDate: Date): Date {
    return new Date(utcDate.getTime() - 5 * 60 * 60 * 1000);
  }

  private floorDateToMinute(date: Date): Date {
    return new Date(Math.floor(date.getTime() / 60000) * 60000);
  }

  private minuteRangesOverlap(
    firstStart: Date,
    firstEnd: Date,
    secondStart: Date,
    secondEnd: Date,
  ): boolean {
    return (
      this.floorDateToMinute(firstStart) < this.floorDateToMinute(secondEnd) &&
      this.floorDateToMinute(secondStart) < this.floorDateToMinute(firstEnd)
    );
  }

  private async checkAppointmentConflicts(
    studentAccountId: number,
    startAt: Date,
    endAt: Date,
    excludeAppointmentId?: number,
  ): Promise<string | null> {
    const normalizedStartAt = this.floorDateToMinute(startAt);
    const normalizedEndAt = this.floorDateToMinute(endAt);
    const bogotaStart = this.utcToBogota(normalizedStartAt);
    const bogotaEnd = this.utcToBogota(normalizedEndAt);
    const bogotaStartMin = bogotaStart.getUTCHours() * 60 + bogotaStart.getUTCMinutes();
    const bogotaEndMin = bogotaEnd.getUTCHours() * 60 + bogotaEnd.getUTCMinutes();
    const bogotaDateStr = `${bogotaStart.getUTCFullYear()}-${String(bogotaStart.getUTCMonth() + 1).padStart(2, '0')}-${String(bogotaStart.getUTCDate()).padStart(2, '0')}`;
    const rawDow = bogotaStart.getUTCDay();
    const bogotaDow = rawDow === 0 ? 7 : rawDow;

    const blocks = await this.prisma.horario_bloqueado.findMany({
      where: { id_cuenta_estudiante: studentAccountId, estado: 'ACTIVO' },
    });

    for (const block of blocks) {
      const blockStartMin = block.hora_inicio.getUTCHours() * 60 + block.hora_inicio.getUTCMinutes();
      const blockEndMin = block.hora_fin.getUTCHours() * 60 + block.hora_fin.getUTCMinutes();
      if (bogotaStartMin >= blockEndMin || bogotaEndMin <= blockStartMin) continue;

      if (block.tipo_bloqueo === 'ESPECIFICO' && block.fecha_especifica) {
        const blockDate = block.fecha_especifica.toISOString().split('T')[0];
        if (blockDate === bogotaDateStr) {
          return `La franja seleccionada se encuentra bloqueada en tu agenda${block.motivo ? ` (${block.motivo})` : ''}.`;
        }
      } else if (block.tipo_bloqueo === 'RECURRENTE' && block.dia_semana === bogotaDow) {
        const recStart = block.fecha_inicio_recurrencia?.toISOString().split('T')[0];
        const recEnd = block.fecha_fin_recurrencia?.toISOString().split('T')[0];
        const withinRange =
          (!recStart || bogotaDateStr >= recStart) && (!recEnd || bogotaDateStr <= recEnd);
        if (withinRange) {
          return `La franja seleccionada se encuentra bloqueada en tu agenda${block.motivo ? ` (${block.motivo})` : ''}.`;
        }
      }
    }

    const conflictingAppointments = await this.prisma.cita.findMany({
      where: {
        solicitud: { id_cuenta_estudiante: studentAccountId },
        estado: { in: ['PROPUESTA', 'ACEPTADA'] },
        ...(excludeAppointmentId !== undefined ? { id_cita: { not: excludeAppointmentId } } : {}),
        fecha_hora_inicio: { lt: normalizedEndAt },
        fecha_hora_fin: { gt: normalizedStartAt },
      },
      include: { tipo_cita: true },
    });

    const conflicting = conflictingAppointments.find((appointment) =>
      this.minuteRangesOverlap(
        normalizedStartAt,
        normalizedEndAt,
        appointment.fecha_hora_inicio,
        appointment.fecha_hora_fin,
      ),
    );

    if (conflicting) {
      return `Ya tienes una cita (${conflicting.tipo_cita.nombre}) programada para ese horario.`;
    }

    const pendingRescheduleConflicts = await this.prisma.reprogramacion_cita.findMany({
      where: {
        estado: 'PENDIENTE',
        ...(excludeAppointmentId !== undefined ? { id_cita: { not: excludeAppointmentId } } : {}),
        nueva_fecha_hora_inicio: { lt: normalizedEndAt },
        nueva_fecha_hora_fin: { gt: normalizedStartAt },
        cita: {
          solicitud: { id_cuenta_estudiante: studentAccountId },
        },
      },
      include: { cita: { include: { tipo_cita: true } } },
    });

    const pendingRescheduleConflict = pendingRescheduleConflicts.find((reschedule) =>
      this.minuteRangesOverlap(
        normalizedStartAt,
        normalizedEndAt,
        reschedule.nueva_fecha_hora_inicio,
        reschedule.nueva_fecha_hora_fin,
      ),
    );

    if (pendingRescheduleConflict) {
      return `Ya tienes una reprogramacion pendiente (${pendingRescheduleConflict.cita.tipo_cita.nombre}) para ese horario.`;
    }

    return null;
  }

  private async checkPatientAppointmentConflicts(
    patientAccountId: number,
    startAt: Date,
    endAt: Date,
    excludeAppointmentId?: number,
  ): Promise<string | null> {
    const normalizedStartAt = this.floorDateToMinute(startAt);
    const normalizedEndAt = this.floorDateToMinute(endAt);
    const conflictingAppointments = await this.prisma.cita.findMany({
      where: {
        solicitud: { id_cuenta_paciente: patientAccountId },
        estado: { in: ['PROPUESTA', 'ACEPTADA'] },
        ...(excludeAppointmentId !== undefined ? { id_cita: { not: excludeAppointmentId } } : {}),
        fecha_hora_inicio: { lt: normalizedEndAt },
        fecha_hora_fin: { gt: normalizedStartAt },
      },
      include: { tipo_cita: true },
    });

    const conflicting = conflictingAppointments.find((appointment) =>
      this.minuteRangesOverlap(
        normalizedStartAt,
        normalizedEndAt,
        appointment.fecha_hora_inicio,
        appointment.fecha_hora_fin,
      ),
    );

    if (conflicting) {
      return `El paciente ya tiene una cita (${conflicting.tipo_cita.nombre}) programada para ese horario.`;
    }

    const pendingRescheduleConflicts = await this.prisma.reprogramacion_cita.findMany({
      where: {
        estado: 'PENDIENTE',
        ...(excludeAppointmentId !== undefined ? { id_cita: { not: excludeAppointmentId } } : {}),
        nueva_fecha_hora_inicio: { lt: normalizedEndAt },
        nueva_fecha_hora_fin: { gt: normalizedStartAt },
        cita: {
          solicitud: { id_cuenta_paciente: patientAccountId },
        },
      },
      include: { cita: { include: { tipo_cita: true } } },
    });

    const pendingRescheduleConflict = pendingRescheduleConflicts.find((reschedule) =>
      this.minuteRangesOverlap(
        normalizedStartAt,
        normalizedEndAt,
        reschedule.nueva_fecha_hora_inicio,
        reschedule.nueva_fecha_hora_fin,
      ),
    );

    if (pendingRescheduleConflict) {
      return `El paciente ya tiene una reprogramacion pendiente (${pendingRescheduleConflict.cita.tipo_cita.nombre}) para ese horario.`;
    }

    return null;
  }

  // ─── Schedule block CRUD ────────────────────────────────────────────────────

  async createScheduleBlock(
    studentAccountId: number,
    payload: UpsertStudentScheduleBlockDto,
  ): Promise<StudentScheduleBlockDto> {
    const block = await this.prisma.horario_bloqueado.create({
      data: {
        id_cuenta_estudiante: studentAccountId,
        tipo_bloqueo: payload.type,
        fecha_especifica: payload.specificDate ? new Date(`${payload.specificDate}T00:00:00Z`) : null,
        dia_semana: payload.dayOfWeek ? parseInt(payload.dayOfWeek, 10) : null,
        hora_inicio: this.parseBlockTime(payload.startTime),
        hora_fin: this.parseBlockTime(payload.endTime),
        fecha_inicio_recurrencia: payload.recurrenceStartDate ? new Date(`${payload.recurrenceStartDate}T00:00:00Z`) : null,
        fecha_fin_recurrencia: payload.recurrenceEndDate ? new Date(`${payload.recurrenceEndDate}T00:00:00Z`) : null,
        motivo: payload.reason || null,
        estado: 'ACTIVO',
      },
    });

    return this.toScheduleBlockDto(block);
  }

  async updateScheduleBlock(
    studentAccountId: number,
    blockId: number,
    payload: UpsertStudentScheduleBlockDto,
  ): Promise<StudentScheduleBlockDto> {
    const block = await this.prisma.horario_bloqueado.findFirst({
      where: { id_horario_bloqueado: blockId, id_cuenta_estudiante: studentAccountId },
    });

    if (!block) {
      throw new NotFoundException('El bloqueo no existe o no te pertenece.');
    }

    const updated = await this.prisma.horario_bloqueado.update({
      where: { id_horario_bloqueado: blockId },
      data: {
        tipo_bloqueo: payload.type,
        fecha_especifica: payload.specificDate ? new Date(`${payload.specificDate}T00:00:00Z`) : null,
        dia_semana: payload.dayOfWeek ? parseInt(payload.dayOfWeek, 10) : null,
        hora_inicio: this.parseBlockTime(payload.startTime),
        hora_fin: this.parseBlockTime(payload.endTime),
        fecha_inicio_recurrencia: payload.recurrenceStartDate ? new Date(`${payload.recurrenceStartDate}T00:00:00Z`) : null,
        fecha_fin_recurrencia: payload.recurrenceEndDate ? new Date(`${payload.recurrenceEndDate}T00:00:00Z`) : null,
        motivo: payload.reason || null,
        fecha_actualizacion: new Date(),
      },
    });

    return this.toScheduleBlockDto(updated);
  }

  async toggleScheduleBlockStatus(
    studentAccountId: number,
    blockId: number,
  ): Promise<{ blockId: string; status: 'active' | 'inactive' }> {
    const block = await this.prisma.horario_bloqueado.findFirst({
      where: { id_horario_bloqueado: blockId, id_cuenta_estudiante: studentAccountId },
    });

    if (!block) {
      throw new NotFoundException('El bloqueo no existe o no te pertenece.');
    }

    const nextEstado = block.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    await this.prisma.horario_bloqueado.update({
      where: { id_horario_bloqueado: blockId },
      data: { estado: nextEstado, fecha_actualizacion: new Date() },
    });

    return { blockId: String(blockId), status: nextEstado === 'ACTIVO' ? 'active' : 'inactive' };
  }

  async deleteScheduleBlock(
    studentAccountId: number,
    blockId: number,
  ): Promise<{ blockId: string }> {
    const block = await this.prisma.horario_bloqueado.findFirst({
      where: { id_horario_bloqueado: blockId, id_cuenta_estudiante: studentAccountId },
    });

    if (!block) {
      throw new NotFoundException('El bloqueo no existe o no te pertenece.');
    }

    await this.prisma.horario_bloqueado.delete({ where: { id_horario_bloqueado: blockId } });

    return { blockId: String(blockId) };
  }

  async updateRequestStatus(
    studentAccountId: number,
    requestId: number,
    payload: { status: 'ACEPTADA' | 'RECHAZADA' | 'CERRADA' },
  ): Promise<StudentRequestDto> {
    const solicitud = await this.prisma.solicitud.findFirst({
      where: { id_solicitud: requestId, id_cuenta_estudiante: studentAccountId },
      include: { conversacion: true },
    });

    if (!solicitud) {
      throw new NotFoundException('La solicitud no existe o no te pertenece.');
    }

    if (payload.status === 'CERRADA') {
      if (solicitud.estado !== 'ACEPTADA') {
        throw new BadRequestException('Solo se pueden cerrar solicitudes aceptadas.');
      }

      const updated = await this.prisma.$transaction(async (tx) => {
        const closedConversation = await tx.conversacion.updateMany({
          where: { id_solicitud: requestId },
          data: { estado: 'CERRADA' },
        });

        if (closedConversation.count === 0) {
          await tx.conversacion.create({
            data: {
              id_solicitud: requestId,
              estado: 'CERRADA',
            },
          });
        }

        return tx.solicitud.findUniqueOrThrow({
          where: { id_solicitud: requestId },
          include: {
            cuenta_paciente: {
              include: {
                persona: true,
                localidad: { include: { ciudad: true } },
              },
            },
            conversacion: true,
            cita: true,
          },
        });
      });
      const patientReviewsByAccountId = await this.getPatientReviewsByAccountId(
        [updated.cuenta_paciente.id_cuenta],
        studentAccountId,
      );

      return this.toStudentRequestDto(
        updated,
        patientReviewsByAccountId.get(updated.cuenta_paciente.id_cuenta) ?? [],
      );
    }

    if (solicitud.estado !== 'PENDIENTE') {
      throw new BadRequestException('Solo se pueden responder solicitudes pendientes.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.solicitud.update({
        where: { id_solicitud: requestId },
        data: {
          estado: payload.status,
          fecha_respuesta: new Date(),
          fecha_actualizacion: new Date(),
        },
      });

      if (payload.status === 'ACEPTADA') {
        const activatedConversation = await tx.conversacion.updateMany({
          where: { id_solicitud: requestId },
          data: {
            estado: 'ACTIVA',
            solo_lectura_at: null,
          },
        });

        if (activatedConversation.count === 0) {
          await tx.conversacion.create({
            data: {
              id_solicitud: requestId,
              estado: 'ACTIVA',
            },
          });
        }
      }

      return tx.solicitud.findUniqueOrThrow({
        where: { id_solicitud: requestId },
        include: {
          cuenta_paciente: {
            include: {
              persona: true,
              localidad: { include: { ciudad: true } },
            },
          },
          conversacion: true,
          cita: true,
        },
      });
    });
    const patientReviewsByAccountId = await this.getPatientReviewsByAccountId(
      [updated.cuenta_paciente.id_cuenta],
      studentAccountId,
    );

    return this.toStudentRequestDto(
      updated,
      patientReviewsByAccountId.get(updated.cuenta_paciente.id_cuenta) ?? [],
    );
  }

  async getConversations(studentAccountId: number): Promise<StudentConversationDto[]> {
    const student = await this.prisma.cuenta_estudiante.findUnique({
      where: { id_cuenta: studentAccountId },
      include: { persona: true },
    });

    const studentName = student
      ? `${student.persona.nombres} ${student.persona.apellidos}`
      : 'Estudiante';

    const solicitudes = await this.prisma.solicitud.findMany({
      where: {
        id_cuenta_estudiante: studentAccountId,
        estado: 'ACEPTADA',
        conversacion: { isNot: null },
      },
      include: {
        cuenta_paciente: {
          include: {
            persona: true,
            localidad: { include: { ciudad: true } },
          },
        },
        conversacion: {
          include: {
            mensaje: {
              orderBy: { enviado_at: 'asc' },
              include: { cuenta_acceso: { select: { tipo_cuenta: true } } },
            },
          },
        },
      },
      orderBy: { fecha_envio: 'desc' },
    });

    return solicitudes
      .filter((s) => s.conversacion !== null)
      .map((s) => {
        const conv = s.conversacion!;
        const patientName = `${s.cuenta_paciente.persona.nombres} ${s.cuenta_paciente.persona.apellidos}`;
        return {
          id: String(conv.id_conversacion),
          messages: conv.mensaje.map((m) => ({
            author: m.cuenta_acceso.tipo_cuenta === 'PACIENTE' ? ('PACIENTE' as const) : ('ESTUDIANTE' as const),
            authorName: m.cuenta_acceso.tipo_cuenta === 'PACIENTE' ? patientName : studentName,
            content: m.contenido,
            id: String(m.id_mensaje),
            sentAt: m.enviado_at.toISOString(),
          })),
          patientAge: calcAge(s.cuenta_paciente.fecha_nacimiento),
          patientCity: s.cuenta_paciente.localidad.ciudad.nombre,
          patientName,
          reason: s.motivo_consulta ?? null,
          requestId: String(s.id_solicitud),
          status: conv.estado,
          unreadCount: 0,
        };
      });
  }

  async getConversation(studentAccountId: number, conversationId: number): Promise<StudentConversationDto | null> {
    const student = await this.prisma.cuenta_estudiante.findUnique({
      where: { id_cuenta: studentAccountId },
      include: { persona: true },
    });

    const studentName = student
      ? `${student.persona.nombres} ${student.persona.apellidos}`
      : 'Estudiante';

    const solicitud = await this.prisma.solicitud.findFirst({
      where: {
        id_cuenta_estudiante: studentAccountId,
        estado: 'ACEPTADA',
        conversacion: { id_conversacion: conversationId },
      },
      include: {
        cuenta_paciente: {
          include: {
            persona: true,
            localidad: { include: { ciudad: true } },
          },
        },
        conversacion: {
          include: {
            mensaje: {
              orderBy: { enviado_at: 'asc' },
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
    const patientName = `${solicitud.cuenta_paciente.persona.nombres} ${solicitud.cuenta_paciente.persona.apellidos}`;

    return {
      id: String(conv.id_conversacion),
      messages: conv.mensaje.map((m) => ({
        author: m.cuenta_acceso.tipo_cuenta === 'PACIENTE' ? ('PACIENTE' as const) : ('ESTUDIANTE' as const),
        authorName: m.cuenta_acceso.tipo_cuenta === 'PACIENTE' ? patientName : studentName,
        content: m.contenido,
        id: String(m.id_mensaje),
        sentAt: m.enviado_at.toISOString(),
      })),
      patientAge: calcAge(solicitud.cuenta_paciente.fecha_nacimiento),
      patientCity: solicitud.cuenta_paciente.localidad.ciudad.nombre,
      patientName,
      reason: solicitud.motivo_consulta ?? null,
      requestId: String(solicitud.id_solicitud),
      status: conv.estado,
      unreadCount: 0,
    };
  }

  async sendConversationMessage(
    studentAccountId: number,
    conversationId: number,
    content: string,
  ): Promise<StudentConversationMessageDto> {
    const conv = await this.prisma.conversacion.findFirst({
      where: {
        id_conversacion: conversationId,
        estado: 'ACTIVA',
        solicitud: { id_cuenta_estudiante: studentAccountId },
      },
      include: {
        solicitud: {
          include: {
            cuenta_estudiante: { include: { persona: true } },
          },
        },
      },
    });

    if (!conv) {
      throw new NotFoundException('La conversacion no existe, no te pertenece o no esta activa.');
    }

    const msg = await this.prisma.mensaje.create({
      data: {
        id_conversacion: conversationId,
        id_cuenta_remitente: studentAccountId,
        contenido: content,
      },
    });

    const student = conv.solicitud.cuenta_estudiante;
    const authorName = `${student.persona.nombres} ${student.persona.apellidos}`;

    return {
      id: String(msg.id_mensaje),
      author: 'ESTUDIANTE' as const,
      authorName,
      content: msg.contenido,
      sentAt: msg.enviado_at.toISOString(),
    };
  }

  private buildCitaDateTime(dateStr: string, timeStr: string): Date {
    const [year = 2026, month = 1, day = 1] = dateStr.split('-').map(Number);
    const [hours = 0, minutes = 0] = timeStr.split(':').map(Number);
    // Input is Bogota time (UTC-5). Add 5 hours to store as UTC.
    return new Date(Date.UTC(year, month - 1, day, hours + 5, minutes, 0, 0));
  }

  private assertAppointmentStartsInFuture(startAt: Date) {
    if (this.floorDateToMinute(startAt) < this.floorDateToMinute(new Date())) {
      throw new BadRequestException(
        'La cita debe iniciar en una fecha y hora actuales o futuras.',
      );
    }
  }

  private assertAppointmentHasMinimumNotice(startAt: Date) {
    const earliestStartAt = new Date(Date.now() + APPOINTMENT_CHANGE_NOTICE_MS);

    if (this.floorDateToMinute(startAt) < this.floorDateToMinute(earliestStartAt)) {
      throw new BadRequestException(RESCHEDULE_NOTICE_ERROR_MESSAGE);
    }
  }

  private isDatabaseConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2004' || error.code === 'P2010')
    );
  }

  private assertAppointmentDateRange(startAt: Date, endAt: Date) {
    if (endAt <= startAt) {
      throw new BadRequestException('La hora final debe ser posterior a la inicial.');
    }
  }

  private toCitaAppointmentDto(
    cita: {
      id_cita: number;
      id_tipo_cita: number;
      id_sede: number;
      informacion_adicional: string | null;
      fecha_hora_inicio: Date;
      fecha_hora_fin: Date;
      fecha_creacion: Date;
      respondida_at: Date | null;
      estado: string;
      id_docente_universidad: number;
      tipo_cita: { nombre: string };
      sede: { nombre: string; localidad: { ciudad: { nombre: string } } };
      docente_universidad: { docente: { nombres: string; apellidos: string } };
      cita_tratamiento: { id_tipo_tratamiento: number; tipo_tratamiento: { nombre: string } }[];
      reprogramacion_cita?: {
        nueva_id_sede: number | null;
        nuevo_id_docente_universidad: number | null;
        nueva_fecha_hora_inicio: Date;
        nueva_fecha_hora_fin: Date;
        nueva_sede: { nombre: string; localidad: { ciudad: { nombre: string } } } | null;
        nuevo_docente_universidad: { docente: { nombres: string; apellidos: string } } | null;
      }[];
      solicitud: { id_solicitud: number; cuenta_paciente: { persona: { nombres: string; apellidos: string } } };
    },
  ): StudentAgendaAppointmentDto {
    const pendingReschedule = cita.reprogramacion_cita?.[0] ?? null;
    const displaySite = pendingReschedule?.nueva_sede ?? cita.sede;
    const displaySupervisor =
      pendingReschedule?.nuevo_docente_universidad ?? cita.docente_universidad;

    return {
      additionalInfo: cita.informacion_adicional ?? null,
      appointmentTypeId: String(cita.id_tipo_cita),
      appointmentType: cita.tipo_cita.nombre,
      city: displaySite.localidad.ciudad.nombre,
      createdAt: cita.fecha_creacion.toISOString(),
      endAt: (pendingReschedule?.nueva_fecha_hora_fin ?? cita.fecha_hora_fin).toISOString(),
      id: String(cita.id_cita),
      isRescheduleProposal: Boolean(pendingReschedule),
      myRating: null,
      patientName: `${cita.solicitud.cuenta_paciente.persona.nombres} ${cita.solicitud.cuenta_paciente.persona.apellidos}`,
      requestId: String(cita.solicitud.id_solicitud),
      respondedAt: cita.respondida_at?.toISOString() ?? null,
      siteId: String(pendingReschedule?.nueva_id_sede ?? cita.id_sede),
      siteName: displaySite.nombre,
      startAt: (pendingReschedule?.nueva_fecha_hora_inicio ?? cita.fecha_hora_inicio).toISOString(),
      status: cita.estado,
      supervisorId: String(
        pendingReschedule?.nuevo_id_docente_universidad ?? cita.id_docente_universidad,
      ),
      supervisorName: `${displaySupervisor.docente.nombres} ${displaySupervisor.docente.apellidos}`,
      treatmentIds: cita.cita_tratamiento.map((ct) => String(ct.id_tipo_tratamiento)),
      treatmentNames: cita.cita_tratamiento.map((ct) => ct.tipo_tratamiento.nombre),
    };
  }

  private getCitaWithRelationsArgs() {
    return {
      tipo_cita: true,
      sede: { include: { localidad: { include: { ciudad: true } } } },
      docente_universidad: { include: { docente: true } },
      cita_tratamiento: { include: { tipo_tratamiento: true } },
      reprogramacion_cita: {
        where: { estado: 'PENDIENTE' },
        orderBy: { fecha_creacion: 'desc' },
        take: 1,
        include: {
          nueva_sede: { include: { localidad: { include: { ciudad: true } } } },
          nuevo_docente_universidad: { include: { docente: true } },
        },
      },
      solicitud: { include: { cuenta_paciente: { include: { persona: true } } } },
    } as const;
  }

  async createAppointment(
    studentAccountId: number,
    payload: UpsertStudentAppointmentDto,
  ): Promise<StudentAgendaAppointmentDto> {
    // Verify solicitud belongs to this student and has an active conversation.
    const solicitud = await this.prisma.solicitud.findFirst({
      where: { id_solicitud: payload.requestId, id_cuenta_estudiante: studentAccountId },
      include: { conversacion: true },
    });

    if (!solicitud) {
      throw new NotFoundException('La solicitud no existe o no te pertenece.');
    }

    if (solicitud.estado !== 'ACEPTADA' || solicitud.conversacion?.estado !== 'ACTIVA') {
      throw new BadRequestException('Solo puedes programar citas para solicitudes aceptadas y activas.');
    }

    // Verify supervisor belongs to the student's university
    const student = await this.prisma.cuenta_estudiante.findUnique({
      where: { id_cuenta: studentAccountId },
      select: { id_universidad: true },
    });

    const docente = await this.prisma.docente_universidad.findFirst({
      where: {
        id_docente_universidad: payload.supervisorId,
        id_universidad: student?.id_universidad,
        estado: 'ACTIVO',
      },
    });

    if (!docente) {
      throw new NotFoundException('El docente supervisor no existe o no pertenece a tu universidad.');
    }

    // Verify sede is valid
    const sede = await this.prisma.sede.findFirst({
      where: { id_sede: payload.siteId, estado: 'ACTIVO' },
    });

    if (!sede) {
      throw new NotFoundException('La sede no existe o no esta activa.');
    }

    const tipoCita = await this.prisma.tipo_cita.findUnique({
      where: { id_tipo_cita: payload.appointmentTypeId },
    });

    if (!tipoCita) {
      throw new NotFoundException('El tipo de cita seleccionado no existe.');
    }

    // Verify all treatments exist
    const tratamientos = await this.prisma.tipo_tratamiento.findMany({
      where: { id_tipo_tratamiento: { in: payload.treatmentIds } },
      select: { nombre: true },
    });

    if (tratamientos.length !== payload.treatmentIds.length) {
      throw new BadRequestException('Uno o mas tratamientos seleccionados no son validos.');
    }

    const startAt = this.buildCitaDateTime(payload.startDate, payload.startTime);
    const endAt = this.buildCitaDateTime(payload.startDate, payload.endTime);

    this.assertAppointmentDateRange(startAt, endAt);
    this.assertAppointmentStartsInFuture(startAt);

    const conflict = await this.checkAppointmentConflicts(studentAccountId, startAt, endAt);
    if (conflict) {
      throw new BadRequestException(conflict);
    }

    const patientConflict = await this.checkPatientAppointmentConflicts(
      solicitud.id_cuenta_paciente,
      startAt,
      endAt,
    );
    if (patientConflict) {
      throw new BadRequestException(patientConflict);
    }

    const cita = await this.prisma.cita.create({
      data: {
        id_solicitud: payload.requestId,
        id_docente_universidad: payload.supervisorId,
        id_sede: payload.siteId,
        id_tipo_cita: tipoCita.id_tipo_cita,
        fecha_hora_inicio: startAt,
        fecha_hora_fin: endAt,
        informacion_adicional: payload.additionalInfo?.trim() || null,
        estado: 'PROPUESTA',
        cita_tratamiento: {
          create: payload.treatmentIds.map((id_tipo_tratamiento) => ({ id_tipo_tratamiento })),
        },
      },
      include: this.getCitaWithRelationsArgs(),
    });

    const dto = this.toCitaAppointmentDto(cita);

    // Send email notification to patient about the new appointment proposal
    const patientAccount = await this.prisma.cuenta_acceso.findUnique({
      where: { id_cuenta: solicitud.id_cuenta_paciente },
      select: { correo: true },
    });
    const patientPerson = await this.prisma.cuenta_paciente.findUnique({
      where: { id_cuenta: solicitud.id_cuenta_paciente },
      include: { persona: true },
    });
    const studentInfo = await this.prisma.cuenta_estudiante.findUnique({
      where: { id_cuenta: studentAccountId },
      include: { persona: true },
    });

    if (patientAccount && patientPerson && studentInfo) {
      const patientName = `${patientPerson.persona.nombres} ${patientPerson.persona.apellidos}`;
      const studentName = `${studentInfo.persona.nombres} ${studentInfo.persona.apellidos}`;
      void this.mailService.sendAppointmentProposalToPatient(
        patientAccount.correo,
        patientName,
        studentName,
        dto.appointmentType,
        dto.siteName,
        dto.city,
        dto.startAt,
        dto.endAt,
      );
    }

    return dto;
  }

  async updateAppointment(
    studentAccountId: number,
    appointmentId: number,
    payload: UpsertStudentAppointmentDto,
  ): Promise<StudentAgendaAppointmentDto> {
    const cita = await this.prisma.cita.findFirst({
      where: {
        id_cita: appointmentId,
        solicitud: { id_cuenta_estudiante: studentAccountId },
      },
      include: {
        solicitud: { select: { id_cuenta_paciente: true } },
        reprogramacion_cita: {
          where: { estado: 'PENDIENTE' },
          orderBy: { fecha_creacion: 'desc' },
          take: 1,
        },
      },
    });

    if (!cita) {
      throw new NotFoundException('La cita no existe o no te pertenece.');
    }

    if (cita.estado !== 'PROPUESTA') {
      throw new BadRequestException('Solo puedes editar citas en estado PROPUESTA.');
    }

    if (cita.reprogramacion_cita.length > 0) {
      throw new BadRequestException(
        'Esta cita tiene una reprogramacion pendiente y no puede editarse directamente.',
      );
    }

    // Verify new sede
    const sede = await this.prisma.sede.findFirst({
      where: { id_sede: payload.siteId, estado: 'ACTIVO' },
    });

    if (!sede) {
      throw new NotFoundException('La sede no existe o no esta activa.');
    }

    const tipoCita = await this.prisma.tipo_cita.findUnique({
      where: { id_tipo_cita: payload.appointmentTypeId },
    });

    if (!tipoCita) {
      throw new NotFoundException('El tipo de cita seleccionado no existe.');
    }

    // Verify supervisor
    const student = await this.prisma.cuenta_estudiante.findUnique({
      where: { id_cuenta: studentAccountId },
      select: { id_universidad: true },
    });

    const docente = await this.prisma.docente_universidad.findFirst({
      where: {
        id_docente_universidad: payload.supervisorId,
        id_universidad: student?.id_universidad,
        estado: 'ACTIVO',
      },
    });

    if (!docente) {
      throw new NotFoundException('El docente supervisor no existe o no pertenece a tu universidad.');
    }

    // Verify treatments
    const tratamientos = await this.prisma.tipo_tratamiento.findMany({
      where: { id_tipo_tratamiento: { in: payload.treatmentIds } },
      select: { nombre: true },
    });

    if (tratamientos.length !== payload.treatmentIds.length) {
      throw new BadRequestException('Uno o mas tratamientos seleccionados no son validos.');
    }

    const startAt = this.buildCitaDateTime(payload.startDate, payload.startTime);
    const endAt = this.buildCitaDateTime(payload.startDate, payload.endTime);

    this.assertAppointmentDateRange(startAt, endAt);
    this.assertAppointmentStartsInFuture(startAt);

    const conflict = await this.checkAppointmentConflicts(studentAccountId, startAt, endAt, appointmentId);
    if (conflict) {
      throw new BadRequestException(conflict);
    }

    const patientConflict = await this.checkPatientAppointmentConflicts(
      cita.solicitud.id_cuenta_paciente,
      startAt,
      endAt,
      appointmentId,
    );
    if (patientConflict) {
      throw new BadRequestException(patientConflict);
    }

    // Delete old treatments and update the cita in a transaction
    await this.prisma.$transaction([
      this.prisma.cita_tratamiento.deleteMany({ where: { id_cita: appointmentId } }),
      this.prisma.cita.update({
        where: { id_cita: appointmentId },
        data: {
          id_docente_universidad: payload.supervisorId,
          id_sede: payload.siteId,
          id_tipo_cita: tipoCita.id_tipo_cita,
          fecha_hora_inicio: startAt,
          fecha_hora_fin: endAt,
          informacion_adicional: payload.additionalInfo?.trim() || null,
          cita_tratamiento: {
            create: payload.treatmentIds.map((id_tipo_tratamiento) => ({ id_tipo_tratamiento })),
          },
        },
      }),
    ]);

    const updated = await this.prisma.cita.findUniqueOrThrow({
      where: { id_cita: appointmentId },
      include: this.getCitaWithRelationsArgs(),
    });

    return this.toCitaAppointmentDto(updated);
  }

  async rescheduleAppointment(
    studentAccountId: number,
    appointmentId: number,
    payload: UpsertStudentAppointmentDto,
  ): Promise<StudentAgendaAppointmentDto> {
    const cita = await this.prisma.cita.findFirst({
      where: {
        id_cita: appointmentId,
        solicitud: { id_cuenta_estudiante: studentAccountId },
      },
      include: {
        solicitud: { select: { id_cuenta_paciente: true } },
        reprogramacion_cita: {
          where: { estado: 'PENDIENTE' },
          orderBy: { fecha_creacion: 'desc' },
          take: 1,
        },
      },
    });

    if (!cita) {
      throw new NotFoundException('La cita no existe o no te pertenece.');
    }

    if (cita.estado !== 'ACEPTADA') {
      throw new BadRequestException('Solo puedes reprogramar citas aceptadas.');
    }

    if (cita.reprogramacion_cita.length > 0) {
      throw new BadRequestException('Ya existe una reprogramacion pendiente para esta cita.');
    }

    const sede = await this.prisma.sede.findFirst({
      where: { id_sede: payload.siteId, estado: 'ACTIVO' },
    });

    if (!sede) {
      throw new NotFoundException('La sede no existe o no esta activa.');
    }

    const student = await this.prisma.cuenta_estudiante.findUnique({
      where: { id_cuenta: studentAccountId },
      select: { id_universidad: true },
    });

    const docente = await this.prisma.docente_universidad.findFirst({
      where: {
        id_docente_universidad: payload.supervisorId,
        id_universidad: student?.id_universidad,
        estado: 'ACTIVO',
      },
    });

    if (!docente) {
      throw new NotFoundException('El docente supervisor no existe o no pertenece a tu universidad.');
    }

    const startAt = this.buildCitaDateTime(payload.startDate, payload.startTime);
    const endAt = this.buildCitaDateTime(payload.startDate, payload.endTime);

    this.assertAppointmentDateRange(startAt, endAt);
    this.assertAppointmentStartsInFuture(startAt);
    this.assertAppointmentHasMinimumNotice(startAt);

    const conflict = await this.checkAppointmentConflicts(studentAccountId, startAt, endAt, appointmentId);
    if (conflict) {
      throw new BadRequestException(conflict);
    }

    const patientConflict = await this.checkPatientAppointmentConflicts(
      cita.solicitud.id_cuenta_paciente,
      startAt,
      endAt,
      appointmentId,
    );
    if (patientConflict) {
      throw new BadRequestException(patientConflict);
    }

    try {
      await this.prisma.$transaction([
        this.prisma.reprogramacion_cita.create({
          data: {
            id_cita: appointmentId,
            propuesta_por_cuenta: studentAccountId,
            nueva_id_sede: payload.siteId,
            nuevo_id_docente_universidad: payload.supervisorId,
            nueva_fecha_hora_inicio: startAt,
            nueva_fecha_hora_fin: endAt,
            motivo: payload.additionalInfo?.trim() || null,
            estado: 'PENDIENTE',
          },
        }),
        this.prisma.cita.update({
          where: { id_cita: appointmentId },
          data: {
            estado: 'PROPUESTA',
            respondida_at: null,
            fecha_actualizacion: new Date(),
          },
        }),
        this.prisma.notificacion.create({
          data: {
            id_cuenta_destino: cita.solicitud.id_cuenta_paciente,
            tipo: 'REPROGRAMACION',
            contenido: 'El estudiante solicito reprogramar tu cita. Revisa la nueva fecha y hora propuesta.',
          },
        }),
      ]);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Ya existe una reprogramacion pendiente para esta cita.',
        );
      }

      if (this.isDatabaseConstraintError(error)) {
        throw new BadRequestException(RESCHEDULE_NOTICE_ERROR_MESSAGE);
      }

      throw error;
    }

    const updated = await this.prisma.cita.findUniqueOrThrow({
      where: { id_cita: appointmentId },
      include: this.getCitaWithRelationsArgs(),
    });

    return this.toCitaAppointmentDto(updated);
  }

  async updateAppointmentStatus(
    studentAccountId: number,
    appointmentId: number,
    status: string,
  ): Promise<StudentAgendaAppointmentDto> {
    const cita = await this.prisma.cita.findFirst({
      where: {
        id_cita: appointmentId,
        solicitud: { id_cuenta_estudiante: studentAccountId },
      },
    });

    if (!cita) {
      throw new NotFoundException('La cita no existe o no te pertenece.');
    }

    if (status === 'FINALIZADA' && cita.fecha_hora_fin > new Date()) {
      throw new BadRequestException(
        'Solo puedes finalizar una cita cuya hora de finalizacion ya haya pasado.',
      );
    }

    const responseDate = new Date();

    if (status === 'CANCELADA') {
      await this.prisma.reprogramacion_cita.updateMany({
        where: { id_cita: appointmentId, estado: 'PENDIENTE' },
        data: {
          estado: 'RECHAZADA',
          respuesta_por_cuenta: studentAccountId,
          fecha_respuesta: responseDate,
        },
      });
    }

    const updated = await this.prisma.cita.update({
      where: { id_cita: appointmentId },
      data: {
        estado: status as any,
        ...(status === 'CANCELADA'
          ? {
              cancelada_por_cuenta: studentAccountId,
              respondida_at: responseDate,
              motivo_cancelacion: 'Cancelada por el estudiante',
            }
          : {}),
        ...(status === 'FINALIZADA'
          ? { finalizada_at: responseDate, respondida_at: responseDate }
          : {}),
      },
      include: this.getCitaWithRelationsArgs(),
    });

    if (status === 'CANCELADA') {
      await this.prisma.notificacion.create({
        data: {
          id_cuenta_destino: updated.solicitud.id_cuenta_paciente,
          tipo: 'CANCELACION_CITA',
          contenido: 'El estudiante cancelo una de tus citas agendadas.',
        },
      });

      const patientAccountId = updated.solicitud.id_cuenta_paciente;
      const [patientAccount, studentInfo] = await Promise.all([
        this.prisma.cuenta_acceso.findUnique({
          where: { id_cuenta: patientAccountId },
          select: { correo: true },
        }),
        this.prisma.cuenta_estudiante.findUnique({
          where: { id_cuenta: studentAccountId },
          include: { persona: true },
        }),
      ]);

      if (patientAccount && studentInfo) {
        const patientName = `${updated.solicitud.cuenta_paciente.persona.nombres} ${updated.solicitud.cuenta_paciente.persona.apellidos}`;
        const studentName = `${studentInfo.persona.nombres} ${studentInfo.persona.apellidos}`;
        void this.mailService.sendAppointmentCancelledToPatient(
          patientAccount.correo,
          patientName,
          studentName,
          updated.tipo_cita.nombre,
          updated.sede.nombre,
          updated.sede.localidad.ciudad.nombre,
          updated.fecha_hora_inicio.toISOString(),
          updated.fecha_hora_fin.toISOString(),
        );
      }
    }

    return this.toCitaAppointmentDto(updated);
  }

  async createAppointmentReview(
    studentAccountId: number,
    appointmentId: number,
    payload: CreateStudentAppointmentReviewDto,
  ): Promise<StudentAgendaAppointmentDto> {
    const cita = await this.prisma.cita.findFirst({
      where: {
        id_cita: appointmentId,
        solicitud: { id_cuenta_estudiante: studentAccountId },
        estado: 'FINALIZADA',
      },
      include: {
        tipo_cita: true,
        sede: { include: { localidad: { include: { ciudad: true } } } },
        docente_universidad: { include: { docente: true } },
        cita_tratamiento: { include: { tipo_tratamiento: true } },
        solicitud: { include: { cuenta_paciente: { include: { persona: true } } } },
        valoracion: {
          where: { id_cuenta_emisor: studentAccountId },
          take: 1,
        },
      },
    });

    if (!cita) {
      throw new NotFoundException('La cita no existe, no esta finalizada o no te pertenece.');
    }

    if (cita.valoracion.length > 0) {
      throw new ConflictException('Ya has valorado esta cita.');
    }

    await this.prisma.valoracion.create({
      data: {
        id_cita: appointmentId,
        id_cuenta_emisor: studentAccountId,
        id_cuenta_receptor: cita.solicitud.id_cuenta_paciente,
        calificacion: payload.rating,
        comentario: payload.comment?.trim() || null,
      },
    });

    return {
      additionalInfo: cita.informacion_adicional ?? null,
      appointmentTypeId: String(cita.id_tipo_cita),
      appointmentType: cita.tipo_cita.nombre,
      city: cita.sede.localidad.ciudad.nombre,
      createdAt: cita.fecha_creacion.toISOString(),
      endAt: cita.fecha_hora_fin.toISOString(),
      id: String(cita.id_cita),
      isRescheduleProposal: false,
      myRating: payload.rating,
      patientName: `${cita.solicitud.cuenta_paciente.persona.nombres} ${cita.solicitud.cuenta_paciente.persona.apellidos}`,
      requestId: String(cita.solicitud.id_solicitud),
      respondedAt: cita.respondida_at?.toISOString() ?? null,
      siteId: String(cita.id_sede),
      siteName: cita.sede.nombre,
      startAt: cita.fecha_hora_inicio.toISOString(),
      status: cita.estado,
      supervisorId: String(cita.id_docente_universidad),
      supervisorName: `${cita.docente_universidad.docente.nombres} ${cita.docente_universidad.docente.apellidos}`,
      treatmentIds: cita.cita_tratamiento.map((ct) => String(ct.id_tipo_tratamiento)),
      treatmentNames: cita.cita_tratamiento.map((ct) => ct.tipo_tratamiento.nombre),
    };
  }
}
