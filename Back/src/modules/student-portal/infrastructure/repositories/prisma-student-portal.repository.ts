import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@/shared/database/prisma.service';
import { MailService } from '@/shared/mail/mail.service';
import { normalizeText } from '@/shared/utils/front-format.util';
import { UpsertStudentAppointmentDto } from '../../application/dto/upsert-student-appointment.dto';
import { UpdateStudentProfileDto } from '../../application/dto/update-student-profile.dto';
import { StudentAgendaAppointmentDto } from '../../application/dto/student-agenda-appointment.dto';
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
      treatmentTypeId: String(t.id_tipo_tratamiento),
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
        createdAt: c.fecha_creacion.toISOString(),
        endAt: c.fecha_hora_fin.toISOString(),
        id: String(c.id_cita),
        patientName: `${s.cuenta_paciente.persona.nombres} ${s.cuenta_paciente.persona.apellidos}`,
        requestId: String(s.id_solicitud),
        respondedAt: c.respondida_at?.toISOString() ?? null,
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

  private getAppointmentTypeLabel(treatmentNames: string[]): string {
    if (treatmentNames.length === 1) return treatmentNames[0] ?? 'Cita clinica';
    if (treatmentNames.length > 1) return 'Atencion clinica programada';
    return 'Cita clinica';
  }

  private toCitaAppointmentDto(
    cita: {
      id_cita: number;
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
      solicitud: { id_solicitud: number; cuenta_paciente: { persona: { nombres: string; apellidos: string } } };
    },
  ): StudentAgendaAppointmentDto {
    return {
      additionalInfo: cita.informacion_adicional ?? null,
      appointmentType: cita.tipo_cita.nombre,
      city: cita.sede.localidad.ciudad.nombre,
      createdAt: cita.fecha_creacion.toISOString(),
      endAt: cita.fecha_hora_fin.toISOString(),
      id: String(cita.id_cita),
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

  private getCitaWithRelationsArgs() {
    return {
      tipo_cita: true,
      sede: { include: { localidad: { include: { ciudad: true } } } },
      docente_universidad: { include: { docente: true } },
      cita_tratamiento: { include: { tipo_tratamiento: true } },
      solicitud: { include: { cuenta_paciente: { include: { persona: true } } } },
    } as const;
  }

  async createAppointment(
    studentAccountId: number,
    payload: UpsertStudentAppointmentDto,
  ): Promise<StudentAgendaAppointmentDto> {
    // Verify solicitud belongs to this student and is in ACEPTADA status
    const solicitud = await this.prisma.solicitud.findFirst({
      where: { id_solicitud: payload.requestId, id_cuenta_estudiante: studentAccountId },
    });

    if (!solicitud) {
      throw new NotFoundException('La solicitud no existe o no te pertenece.');
    }

    if (solicitud.estado !== 'ACEPTADA') {
      throw new BadRequestException('Solo puedes programar citas para solicitudes aceptadas.');
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

    // Verify all treatments exist
    const tratamientos = await this.prisma.tipo_tratamiento.findMany({
      where: { id_tipo_tratamiento: { in: payload.treatmentIds } },
      select: { nombre: true },
    });

    if (tratamientos.length !== payload.treatmentIds.length) {
      throw new BadRequestException('Uno o mas tratamientos seleccionados no son validos.');
    }

    // Find or create the tipo_cita based on treatment names
    const tipoCitaNombre = this.getAppointmentTypeLabel(tratamientos.map((t) => t.nombre));
    const tipoCita = await this.prisma.tipo_cita.upsert({
      where: { nombre: tipoCitaNombre },
      create: { nombre: tipoCitaNombre },
      update: {},
    });

    const startAt = this.buildCitaDateTime(payload.startDate, payload.startTime);
    const endAt = this.buildCitaDateTime(payload.startDate, payload.endTime);

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
    });

    if (!cita) {
      throw new NotFoundException('La cita no existe o no te pertenece.');
    }

    if (cita.estado !== 'PROPUESTA') {
      throw new BadRequestException('Solo puedes editar citas en estado PROPUESTA.');
    }

    // Verify new sede
    const sede = await this.prisma.sede.findFirst({
      where: { id_sede: payload.siteId, estado: 'ACTIVO' },
    });

    if (!sede) {
      throw new NotFoundException('La sede no existe o no esta activa.');
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

    const tipoCitaNombre = this.getAppointmentTypeLabel(tratamientos.map((t) => t.nombre));
    const tipoCita = await this.prisma.tipo_cita.upsert({
      where: { nombre: tipoCitaNombre },
      create: { nombre: tipoCitaNombre },
      update: {},
    });

    const startAt = this.buildCitaDateTime(payload.startDate, payload.startTime);
    const endAt = this.buildCitaDateTime(payload.startDate, payload.endTime);

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

    const updated = await this.prisma.cita.update({
      where: { id_cita: appointmentId },
      data: {
        estado: status as any,
        ...(status === 'CANCELADA'
          ? {
              cancelada_por_cuenta: studentAccountId,
              respondida_at: new Date(),
              motivo_cancelacion: 'Cancelada por el estudiante',
            }
          : {}),
        ...(status === 'FINALIZADA' ? { finalizada_at: new Date(), respondida_at: new Date() } : {}),
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
}
