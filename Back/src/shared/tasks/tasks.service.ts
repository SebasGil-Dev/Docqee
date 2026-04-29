import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '@/shared/database/prisma.service';
import { MailService } from '@/shared/mail/mail.service';

const APPOINTMENT_REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  private getBogotaDateKey(date: Date) {
    return new Intl.DateTimeFormat('en-CA', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'America/Bogota',
      year: 'numeric',
    }).format(date);
  }

  private getAppointmentReminderTiming(
    startAt: Date,
    referenceDate: Date,
  ): 'today' | 'tomorrow' {
    return this.getBogotaDateKey(startAt) === this.getBogotaDateKey(referenceDate)
      ? 'today'
      : 'tomorrow';
  }

  @Cron(CronExpression.EVERY_HOUR)
  async sendAppointmentReminders() {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + APPOINTMENT_REMINDER_WINDOW_MS);

    const citas = await this.prisma.cita.findMany({
      where: {
        estado: 'ACEPTADA',
        recordatorio_24h_enviado: false,
        fecha_hora_inicio: { gt: now, lte: next24Hours },
      },
      include: {
        tipo_cita: true,
        sede: { include: { localidad: { include: { ciudad: true } } } },
        solicitud: {
          include: {
            cuenta_estudiante: {
              include: {
                persona: true,
                universidad: true,
                cuenta_acceso: { select: { correo: true } },
              },
            },
            cuenta_paciente: {
              include: {
                persona: true,
                cuenta_acceso: { select: { correo: true } },
                tutor_responsable: true,
              },
            },
          },
        },
      },
    });

    if (citas.length === 0) {
      return;
    }

    this.logger.log(`Sending 24h reminders for ${citas.length} appointment(s)`);

    await Promise.all(
      citas.map(async (cita) => {
        const studentEmail = cita.solicitud.cuenta_estudiante.cuenta_acceso?.correo;
        const patientEmail = cita.solicitud.cuenta_paciente.cuenta_acceso?.correo;
        const studentName = `${cita.solicitud.cuenta_estudiante.persona.nombres} ${cita.solicitud.cuenta_estudiante.persona.apellidos}`;
        const patientName = `${cita.solicitud.cuenta_paciente.persona.nombres} ${cita.solicitud.cuenta_paciente.persona.apellidos}`;
        const appointmentType = cita.tipo_cita.nombre;
        const siteName = cita.sede.nombre;
        const siteAddress = cita.sede.direccion;
        const universityName = cita.solicitud.cuenta_estudiante.universidad.nombre;
        const city = cita.sede.localidad.ciudad.nombre;
        const startAt = cita.fecha_hora_inicio.toISOString();
        const endAt = cita.fecha_hora_fin.toISOString();
        const reminderTiming = this.getAppointmentReminderTiming(
          cita.fecha_hora_inicio,
          now,
        );

        await this.prisma.cita.update({
          where: { id_cita: cita.id_cita },
          data: { recordatorio_24h_enviado: true },
        });

        const sends: Promise<void>[] = [];

        if (studentEmail) {
          sends.push(
            this.mailService.sendAppointmentReminderToStudent(
              studentEmail, studentName, patientName,
              appointmentType, siteName, city, startAt, endAt, reminderTiming,
              siteAddress, universityName,
            ),
          );
        }

        if (patientEmail) {
          sends.push(
            this.mailService.sendAppointmentReminderToPatient(
              patientEmail, patientName, studentName,
              appointmentType, siteName, city, startAt, endAt, reminderTiming,
              siteAddress, universityName,
            ),
          );
        }

        const tutor = cita.solicitud.cuenta_paciente.tutor_responsable;
        const birthDate = cita.solicitud.cuenta_paciente.fecha_nacimiento;
        const eighteenYearsAgo = new Date(now);
        eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
        const isMinor = birthDate > eighteenYearsAgo;

        if (isMinor && tutor) {
          sends.push(
            this.mailService.sendAppointmentReminderToPatient(
              tutor.correo, patientName, studentName,
              appointmentType, siteName, city, startAt, endAt, reminderTiming,
              siteAddress, universityName,
            ),
          );
        }

        await Promise.all(sends);
      }),
    );
  }
}
