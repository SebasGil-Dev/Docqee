import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@/shared/database/prisma.service';
import { normalizeText } from '@/shared/utils/front-format.util';
import { UpdateStudentProfileDto } from '../../application/dto/update-student-profile.dto';
import { StudentAgendaAppointmentDto } from '../../application/dto/student-agenda-appointment.dto';
import { StudentAppointmentReviewDto } from '../../application/dto/student-appointment-review.dto';
import { StudentConversationDto } from '../../application/dto/student-conversation.dto';
import { StudentPortalDashboardDto } from '../../application/dto/student-portal-dashboard.dto';
import { StudentPracticeSiteDto } from '../../application/dto/student-practice-site.dto';
import { StudentProfileDto } from '../../application/dto/student-profile.dto';
import { StudentRequestDto } from '../../application/dto/student-request.dto';
import { StudentScheduleBlockDto } from '../../application/dto/student-schedule-block.dto';
import { StudentSupervisorDto } from '../../application/dto/student-supervisor.dto';
import { StudentTreatmentDto } from '../../application/dto/student-treatment.dto';
import { StudentPortalRepository } from '../../domain/repositories/student-portal.repository';

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

@Injectable()
export class PrismaStudentPortalRepository extends StudentPortalRepository {
  constructor(private readonly prisma: PrismaService) {
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

  async getDashboard(studentAccountId: number): Promise<StudentPortalDashboardDto> {
    const [student, solicitudes, bloques, valoraciones] = await Promise.all([
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
    ]);

    const studentName = student
      ? `${student.persona.nombres} ${student.persona.apellidos}`
      : 'Estudiante';

    const profile = this.toStudentProfileDto(student);

    const treatments: StudentTreatmentDto[] = (student?.estudiante_tratamiento ?? []).map((t) => ({
      description: t.tipo_tratamiento.descripcion ?? '',
      id: String(t.id_estudiante_tratamiento),
      name: t.tipo_tratamiento.nombre,
      status: t.estado === 'ACTIVO' ? 'active' : 'inactive',
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

    const scheduleBlocks: StudentScheduleBlockDto[] = bloques.map((b) => ({
      dayOfWeek: b.dia_semana ?? null,
      endTime: b.hora_fin.toISOString(),
      id: String(b.id_horario_bloqueado),
      reason: b.motivo ?? null,
      recurrenceEndDate: b.fecha_fin_recurrencia?.toISOString().split('T')[0] ?? null,
      recurrenceStartDate: b.fecha_inicio_recurrencia?.toISOString().split('T')[0] ?? null,
      specificDate: b.fecha_especifica?.toISOString().split('T')[0] ?? null,
      startTime: b.hora_inicio.toISOString(),
      status: b.estado === 'ACTIVO' ? 'active' : 'inactive',
      type: b.tipo_bloqueo,
    }));

    const requests: StudentRequestDto[] = solicitudes.map((s) => ({
      appointmentsCount: s.cita.length,
      conversationEnabled: s.conversacion?.estado === 'ACTIVA',
      conversationId: s.conversacion ? String(s.conversacion.id_conversacion) : null,
      id: String(s.id_solicitud),
      patientAge: calcAge(s.cuenta_paciente.fecha_nacimiento),
      patientCity: s.cuenta_paciente.localidad.ciudad.nombre,
      patientName: `${s.cuenta_paciente.persona.nombres} ${s.cuenta_paciente.persona.apellidos}`,
      reason: s.motivo_consulta ?? null,
      responseAt: s.fecha_respuesta?.toISOString() ?? null,
      sentAt: s.fecha_envio.toISOString(),
      status: s.estado,
    }));

    const appointments: StudentAgendaAppointmentDto[] = solicitudes.flatMap((s) =>
      s.cita.map((c) => ({
        additionalInfo: c.informacion_adicional ?? null,
        appointmentType: c.tipo_cita.nombre,
        city: c.sede.localidad.ciudad.nombre,
        endAt: c.fecha_hora_fin.toISOString(),
        id: String(c.id_cita),
        patientName: `${s.cuenta_paciente.persona.nombres} ${s.cuenta_paciente.persona.apellidos}`,
        requestId: String(s.id_solicitud),
        siteId: String(c.id_sede),
        siteName: c.sede.nombre,
        startAt: c.fecha_hora_inicio.toISOString(),
        status: c.estado,
        supervisorId: String(c.id_docente_universidad),
        supervisorName: `${c.docente_universidad.docente.nombres} ${c.docente_universidad.docente.apellidos}`,
        treatmentIds: c.cita_tratamiento.map((ct) => String(ct.id_tipo_tratamiento)),
        treatmentNames: c.cita_tratamiento.map((ct) => ct.tipo_tratamiento.nombre),
      })),
    );

    const conversations: StudentConversationDto[] = solicitudes
      .filter((s) => s.conversacion !== null)
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
      appointmentLabel: v.cita.tipo_cita.nombre,
      comment: v.comentario ?? null,
      createdAt: v.fecha_creacion.toISOString(),
      id: String(v.id_valoracion),
      patientName: `${v.cita.solicitud.cuenta_paciente.persona.nombres} ${v.cita.solicitud.cuenta_paciente.persona.apellidos}`,
      rating: v.calificacion,
      siteName: v.cita.sede.nombre,
    }));

    const supervisorMap = new Map<number, StudentSupervisorDto>();
    for (const s of solicitudes) {
      for (const c of s.cita) {
        const sid = c.id_docente_universidad;
        if (!supervisorMap.has(sid)) {
          supervisorMap.set(sid, {
            id: String(sid),
            name: `${c.docente_universidad.docente.nombres} ${c.docente_universidad.docente.apellidos}`,
            status: c.docente_universidad.estado === 'ACTIVO' ? 'active' : 'inactive',
          });
        }
      }
    }
    const supervisors: StudentSupervisorDto[] = [...supervisorMap.values()];

    return {
      appointments,
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

  createScheduleBlock(): never {
    throw new Error('PrismaStudentPortalRepository.createScheduleBlock is pending implementation.');
  }

  updateScheduleBlock(): never {
    throw new Error('PrismaStudentPortalRepository.updateScheduleBlock is pending implementation.');
  }

  async updateRequestStatus(
    studentAccountId: number,
    requestId: number,
    payload: { status: 'ACEPTADA' | 'RECHAZADA' },
  ): Promise<StudentRequestDto> {
    const solicitud = await this.prisma.solicitud.findFirst({
      where: { id_solicitud: requestId, id_cuenta_estudiante: studentAccountId },
    });

    if (!solicitud) {
      throw new NotFoundException('La solicitud no existe o no te pertenece.');
    }

    if (solicitud.estado !== 'PENDIENTE') {
      throw new NotFoundException('Solo se pueden responder solicitudes pendientes.');
    }

    const updated = await this.prisma.solicitud.update({
      where: { id_solicitud: requestId },
      data: {
        estado: payload.status,
        fecha_respuesta: new Date(),
      },
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

    return {
      appointmentsCount: updated.cita.length,
      conversationEnabled: updated.conversacion?.estado === 'ACTIVA',
      conversationId: updated.conversacion ? String(updated.conversacion.id_conversacion) : null,
      id: String(updated.id_solicitud),
      patientAge: calcAge(updated.cuenta_paciente.fecha_nacimiento),
      patientCity: updated.cuenta_paciente.localidad.ciudad.nombre,
      patientName: `${updated.cuenta_paciente.persona.nombres} ${updated.cuenta_paciente.persona.apellidos}`,
      reason: updated.motivo_consulta ?? null,
      responseAt: updated.fecha_respuesta?.toISOString() ?? null,
      sentAt: updated.fecha_envio.toISOString(),
      status: updated.estado,
    };
  }
}
