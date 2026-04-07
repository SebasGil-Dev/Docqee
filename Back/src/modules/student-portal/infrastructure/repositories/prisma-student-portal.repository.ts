import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/shared/database/prisma.service';
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

@Injectable()
export class PrismaStudentPortalRepository extends StudentPortalRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
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

    const profile: StudentProfileDto = student
      ? {
          availabilityGeneral: student.perfil_estudiante?.disponibilidad_general ?? '',
          avatarAlt: `Foto de perfil de ${student.persona.nombres}`,
          avatarFileName: null,
          avatarSrc: student.perfil_estudiante?.foto_url ?? null,
          biography: student.perfil_estudiante?.descripcion ?? '',
          email: student.cuenta_acceso.correo,
          firstName: student.persona.nombres,
          id: String(student.id_cuenta),
          lastName: student.persona.apellidos,
          links: student.enlace_profesional.map((l) => ({
            id: String(l.id_enlace_profesional),
            type: l.tipo_enlace,
            url: l.url,
          })),
          semester: String(student.semestre),
          universityName: student.universidad.nombre,
        }
      : {
          availabilityGeneral: '',
          avatarAlt: '',
          avatarFileName: null,
          avatarSrc: null,
          biography: '',
          email: '',
          firstName: '',
          id: '',
          lastName: '',
          links: [],
          semester: '',
          universityName: '',
        };

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

  updateProfile(): never {
    throw new Error('PrismaStudentPortalRepository.updateProfile is pending implementation.');
  }

  createScheduleBlock(): never {
    throw new Error('PrismaStudentPortalRepository.createScheduleBlock is pending implementation.');
  }

  updateScheduleBlock(): never {
    throw new Error('PrismaStudentPortalRepository.updateScheduleBlock is pending implementation.');
  }

  updateRequestStatus(): never {
    throw new Error('PrismaStudentPortalRepository.updateRequestStatus is pending implementation.');
  }
}
