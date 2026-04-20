import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '@/shared/database/prisma.service';
import { MailService } from '@/shared/mail/mail.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sendAppointmentReminders() {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const citas = await this.prisma.cita.findMany({
      where: {
        estado: 'ACEPTADA',
        recordatorio_24h_enviado: false,
        fecha_hora_inicio: { gte: windowStart, lte: windowEnd },
      },
      include: {
        tipo_cita: true,
        sede: { include: { localidad: { include: { ciudad: true } } } },
        solicitud: {
          include: {
            cuenta_estudiante: {
              include: {
                persona: true,
                cuenta_acceso: { select: { correo: true } },
              },
            },
            cuenta_paciente: {
              include: {
                persona: true,
                cuenta_acceso: { select: { correo: true } },
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
        const city = cita.sede.localidad.ciudad.nombre;
        const startAt = cita.fecha_hora_inicio.toISOString();
        const endAt = cita.fecha_hora_fin.toISOString();

        await this.prisma.cita.update({
          where: { id_cita: cita.id_cita },
          data: { recordatorio_24h_enviado: true },
        });

        const sends: Promise<void>[] = [];

        if (studentEmail) {
          sends.push(
            this.mailService.sendAppointmentReminderToStudent(
              studentEmail, studentName, patientName,
              appointmentType, siteName, city, startAt, endAt,
            ),
          );
        }

        if (patientEmail) {
          sends.push(
            this.mailService.sendAppointmentReminderToPatient(
              patientEmail, patientName, studentName,
              appointmentType, siteName, city, startAt, endAt,
            ),
          );
        }

        await Promise.all(sends);
      }),
    );
  }
}
