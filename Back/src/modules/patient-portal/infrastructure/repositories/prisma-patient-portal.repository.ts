import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/shared/database/prisma.service';
import { PatientAppointmentDto } from '../../application/dto/patient-appointment.dto';
import { PatientConversationDto } from '../../application/dto/patient-conversation.dto';
import { PatientPortalDashboardDto } from '../../application/dto/patient-portal-dashboard.dto';
import { PatientProfileDto } from '../../application/dto/patient-profile.dto';
import { PatientRequestDto } from '../../application/dto/patient-request.dto';
import { PatientStudentDirectoryItemDto } from '../../application/dto/patient-student-directory-item.dto';
import { PatientPortalRepository } from '../../domain/repositories/patient-portal.repository';

@Injectable()
export class PrismaPatientPortalRepository extends PatientPortalRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getDashboard(patientAccountId: number): Promise<PatientPortalDashboardDto> {
    const patient = await this.prisma.cuenta_paciente.findUnique({
      where: { id_cuenta: patientAccountId },
      include: {
        persona: true,
        localidad: { include: { ciudad: true } },
        tutor_responsable: true,
        cuenta_acceso: { select: { correo: true } },
      },
    });

    const solicitudes = await this.prisma.solicitud.findMany({
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
          },
        },
      },
      orderBy: { fecha_envio: 'desc' },
    });

    const students = await this.prisma.cuenta_estudiante.findMany({
      where: { cuenta_acceso: { estado: 'ACTIVO' } },
      include: {
        persona: true,
        universidad: true,
        perfil_estudiante: true,
        estudiante_tratamiento: {
          where: { estado: 'ACTIVO' },
          include: { tipo_tratamiento: true },
        },
        estudiante_sede_practica: {
          where: { estado: 'ACTIVO' },
          include: { sede: { include: { localidad: { include: { ciudad: true } } } } },
        },
      },
    });

    const profile = patient ? this.toProfileDto(patient) : this.emptyProfile();

    const requests: PatientRequestDto[] = solicitudes.map((s) => ({
      appointmentsCount: s.cita.length,
      conversationId: s.conversacion ? String(s.conversacion.id_conversacion) : null,
      id: String(s.id_solicitud),
      reason: s.motivo_consulta ?? null,
      responseAt: s.fecha_respuesta?.toISOString() ?? null,
      sentAt: s.fecha_envio.toISOString(),
      status: s.estado,
      studentId: String(s.id_cuenta_estudiante),
      studentName: `${s.cuenta_estudiante.persona.nombres} ${s.cuenta_estudiante.persona.apellidos}`,
      universityName: s.cuenta_estudiante.universidad.nombre,
    }));

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
            author: m.cuenta_acceso.tipo_cuenta === 'PACIENTE' ? 'PACIENTE' : 'ESTUDIANTE',
            authorName: m.cuenta_acceso.tipo_cuenta === 'PACIENTE' ? profile.firstName : studentName,
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

    const studentDirectory: PatientStudentDirectoryItemDto[] = students.map((s) => {
      const sede = s.estudiante_sede_practica[0]?.sede;
      return {
        availabilityGeneral: s.perfil_estudiante?.disponibilidad_general ?? '',
        availabilityStatus: 'available',
        biography: s.perfil_estudiante?.descripcion ?? '',
        city: sede?.localidad?.ciudad?.nombre ?? '',
        firstName: s.persona.nombres,
        id: String(s.id_cuenta),
        lastName: s.persona.apellidos,
        locality: sede?.localidad?.nombre ?? '',
        practiceSite: sede?.nombre ?? '',
        semester: String(s.semestre),
        treatments: s.estudiante_tratamiento.map((t) => t.tipo_tratamiento.nombre),
        universityName: s.universidad.nombre,
      };
    });

    return {
      appointments,
      conversations,
      profile,
      requests,
      students: studentDirectory,
    };
  }

  updateProfile(): never {
    throw new Error('PrismaPatientPortalRepository.updateProfile is pending implementation.');
  }

  createRequest(): never {
    throw new Error('PrismaPatientPortalRepository.createRequest is pending implementation.');
  }

  updateRequestStatus(): never {
    throw new Error('PrismaPatientPortalRepository.updateRequestStatus is pending implementation.');
  }

  updateAppointmentStatus(): never {
    throw new Error('PrismaPatientPortalRepository.updateAppointmentStatus is pending implementation.');
  }

  private toProfileDto(patient: {
    id_cuenta: number;
    celular: string;
    sexo: 'FEMENINO' | 'MASCULINO' | 'OTRO';
    fecha_nacimiento: Date;
    foto_url: string | null;
    persona: { nombres: string; apellidos: string };
    localidad: { nombre: string; ciudad: { nombre: string } };
    tutor_responsable: { nombres: string; apellidos: string; correo: string; celular: string } | null;
    cuenta_acceso: { correo: string };
  }): PatientProfileDto {
    return {
      avatarAlt: `Foto de perfil de ${patient.persona.nombres}`,
      avatarFileName: null,
      avatarSrc: patient.foto_url ?? null,
      birthDate: patient.fecha_nacimiento.toISOString().split('T')[0],
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
      avatarAlt: '',
      avatarFileName: null,
      avatarSrc: null,
      birthDate: '',
      city: '',
      email: '',
      firstName: '',
      id: '',
      lastName: '',
      locality: '',
      phone: '',
      sex: 'OTRO',
      tutor: null,
    };
  }
}
