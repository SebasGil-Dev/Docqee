import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/shared/database/prisma.service';
import { StudentPortalDashboardDto } from '../../application/dto/student-portal-dashboard.dto';
import { StudentPracticeSiteDto } from '../../application/dto/student-practice-site.dto';
import { StudentProfileDto } from '../../application/dto/student-profile.dto';
import { StudentRequestDto } from '../../application/dto/student-request.dto';
import { StudentScheduleBlockDto } from '../../application/dto/student-schedule-block.dto';
import { StudentTreatmentDto } from '../../application/dto/student-treatment.dto';
import { StudentPortalRepository } from '../../domain/repositories/student-portal.repository';

@Injectable()
export class PrismaStudentPortalRepository extends StudentPortalRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getDashboard(studentAccountId: number): Promise<StudentPortalDashboardDto> {
    const [student, solicitudes, bloques] = await Promise.all([
      this.prisma.cuenta_estudiante.findUnique({
        where: { id_cuenta: studentAccountId },
        include: {
          persona: true,
          universidad: true,
          cuenta_acceso: { select: { correo: true } },
          perfil_estudiante: true,
          enlace_profesional: true,
          estudiante_tratamiento: {
            include: { tipo_tratamiento: true },
          },
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
          conversacion: { select: { id_conversacion: true, estado: true } },
          cita: { select: { id_cita: true } },
        },
        orderBy: { fecha_envio: 'desc' },
      }),
      this.prisma.horario_bloqueado.findMany({
        where: { id_cuenta_estudiante: studentAccountId },
        orderBy: { hora_inicio: 'asc' },
      }),
    ]);

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

    const requests: StudentRequestDto[] = solicitudes.map((s) => {
      const birthDate = s.cuenta_paciente.fecha_nacimiento;
      const today = new Date();
      const age =
        today.getFullYear() -
        birthDate.getFullYear() -
        (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0);

      return {
        appointmentsCount: s.cita.length,
        conversationEnabled: s.conversacion?.estado === 'ACTIVA',
        id: String(s.id_solicitud),
        patientAge: age,
        patientCity: s.cuenta_paciente.localidad.ciudad.nombre,
        patientName: `${s.cuenta_paciente.persona.nombres} ${s.cuenta_paciente.persona.apellidos}`,
        reason: s.motivo_consulta ?? null,
        responseAt: s.fecha_respuesta?.toISOString() ?? null,
        sentAt: s.fecha_envio.toISOString(),
        status: s.estado,
      };
    });

    return { practiceSites, profile, requests, scheduleBlocks, treatments };
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
