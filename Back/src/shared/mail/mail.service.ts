import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly client: BrevoClient;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.from = this.configService.get<string>('mail.from') ?? 'no-reply@docqee.com';
    this.client = new BrevoClient({
      apiKey: this.configService.get<string>('mail.brevoApiKey') ?? '',
    });
  }

  async sendVerificationCode(to: string, code: string) {
    try {
      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.from },
        to: [{ email: to }],
        subject: 'Verifica tu correo electrónico',
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>Verifica tu correo</h2>
            <p>Tu código de verificación es:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 24px; background: #f4f4f4; border-radius: 8px;">
              ${code}
            </div>
            <p style="color: #666; font-size: 14px;">Este código expira en 5 minutos.</p>
          </div>
        `,
      });
      this.logger.log(`Verification code sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send verification code to ${to}`, error);
    }
  }

  async sendUniversityAdminCredentials(to: string, adminName: string, universityName: string, temporaryPassword: string) {
    try {
      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.from },
        to: [{ email: to }],
        subject: 'Tus credenciales de acceso a Docqee',
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>Bienvenido a Docqee</h2>
            <p>Hola <strong>${adminName}</strong>, se ha creado tu cuenta como administrador de <strong>${universityName}</strong>.</p>
            <p>Tus credenciales de acceso son:</p>
            <div style="background: #f4f4f4; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>Correo:</strong> ${to}</p>
              <p style="margin: 4px 0;"><strong>Contraseña temporal:</strong> ${temporaryPassword}</p>
            </div>
            <p style="color: #666; font-size: 14px;">Por seguridad, te pediremos cambiar tu contraseña en el primer ingreso.</p>
          </div>
        `,
      });
      this.logger.log(`University admin credentials sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send credentials to ${to}`, error);
    }
  }

  async sendStudentCredentials(to: string, studentName: string, temporaryPassword: string) {
    try {
      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.from },
        to: [{ email: to }],
        subject: 'Tus credenciales de acceso a Docqee',
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>Bienvenido a Docqee</h2>
            <p>Hola <strong>${studentName}</strong>, se ha creado tu cuenta como estudiante en la plataforma.</p>
            <p>Tus credenciales de acceso son:</p>
            <div style="background: #f4f4f4; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>Correo:</strong> ${to}</p>
              <p style="margin: 4px 0;"><strong>Contraseña temporal:</strong> ${temporaryPassword}</p>
            </div>
            <p style="color: #666; font-size: 14px;">Por seguridad, te pediremos cambiar tu contraseña en el primer ingreso.</p>
          </div>
        `,
      });
      this.logger.log(`Student credentials sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send student credentials to ${to}`, error);
    }
  }

  private formatAppointmentDate(isoString: string) {
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      month: 'long',
      timeZone: 'America/Bogota',
      weekday: 'long',
      year: 'numeric',
    }).format(new Date(isoString));
  }

  private formatAppointmentTime(isoString: string) {
    return new Intl.DateTimeFormat('es-CO', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/Bogota',
    }).format(new Date(isoString));
  }

  private appointmentDetailsBlock(
    appointmentType: string,
    siteName: string,
    city: string,
    startAt: string,
    endAt: string,
  ) {
    return `
      <div style="background:#f4f8ff;border-radius:10px;padding:18px 20px;margin:16px 0;font-size:14px;line-height:1.7;">
        <p style="margin:4px 0;"><strong>Tipo de cita:</strong> ${appointmentType}</p>
        <p style="margin:4px 0;"><strong>Sede:</strong> ${siteName} - ${city}</p>
        <p style="margin:4px 0;"><strong>Fecha:</strong> ${this.formatAppointmentDate(startAt)}</p>
        <p style="margin:4px 0;"><strong>Hora:</strong> ${this.formatAppointmentTime(startAt)} – ${this.formatAppointmentTime(endAt)}</p>
      </div>
    `;
  }

  async sendAppointmentProposalToPatient(
    to: string,
    patientName: string,
    studentName: string,
    appointmentType: string,
    siteName: string,
    city: string,
    startAt: string,
    endAt: string,
  ) {
    try {
      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.from },
        to: [{ email: to }],
        subject: 'Tienes una nueva propuesta de cita - Docqee',
        htmlContent: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a2e;">
            <h2 style="color:#2563eb;">Nueva propuesta de cita</h2>
            <p>Hola <strong>${patientName}</strong>,</p>
            <p>El estudiante <strong>${studentName}</strong> ha propuesto una cita contigo en Docqee.</p>
            ${this.appointmentDetailsBlock(appointmentType, siteName, city, startAt, endAt)}
            <p>Ingresa a la plataforma para aceptar o rechazar la propuesta.</p>
            <p style="color:#666;font-size:13px;">Si tienes dudas, comunícate con el estudiante a través del chat de Docqee.</p>
          </div>
        `,
      });
      this.logger.log(`Appointment proposal email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send appointment proposal email to ${to}`, error);
    }
  }

  async sendAppointmentConfirmedToStudent(
    to: string,
    studentName: string,
    patientName: string,
    appointmentType: string,
    siteName: string,
    city: string,
    startAt: string,
    endAt: string,
  ) {
    try {
      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.from },
        to: [{ email: to }],
        subject: 'Cita aceptada - Docqee',
        htmlContent: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a2e;">
            <h2 style="color:#16a34a;">¡Tu cita fue aceptada!</h2>
            <p>Hola <strong>${studentName}</strong>,</p>
            <p>El paciente <strong>${patientName}</strong> ha aceptado tu propuesta de cita.</p>
            ${this.appointmentDetailsBlock(appointmentType, siteName, city, startAt, endAt)}
            <div style="background:#fef9c3;border-left:4px solid #ca8a04;border-radius:6px;padding:12px 16px;margin:16px 0;font-size:13px;color:#713f12;">
              <strong>Importante:</strong> Una vez confirmada la cita, no es posible cancelarla cuando falten menos de 48 horas para la fecha programada.
            </div>
            <p style="color:#666;font-size:13px;">Asegúrate de estar disponible en la fecha y hora indicadas.</p>
          </div>
        `,
      });
      this.logger.log(`Appointment confirmation email sent to student ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send appointment confirmation email to student ${to}`, error);
    }
  }

  async sendAppointmentConfirmedToPatient(
    to: string,
    patientName: string,
    studentName: string,
    appointmentType: string,
    siteName: string,
    city: string,
    startAt: string,
    endAt: string,
  ) {
    try {
      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.from },
        to: [{ email: to }],
        subject: 'Confirmación de cita - Docqee',
        htmlContent: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a2e;">
            <h2 style="color:#16a34a;">Cita confirmada</h2>
            <p>Hola <strong>${patientName}</strong>,</p>
            <p>Has confirmado tu cita con el estudiante <strong>${studentName}</strong>.</p>
            ${this.appointmentDetailsBlock(appointmentType, siteName, city, startAt, endAt)}
            <div style="background:#fef9c3;border-left:4px solid #ca8a04;border-radius:6px;padding:12px 16px;margin:16px 0;font-size:13px;color:#713f12;">
              <strong>Importante:</strong> Una vez confirmada la cita, no es posible cancelarla cuando falten menos de 48 horas para la fecha programada.
            </div>
            <p style="color:#666;font-size:13px;">Si necesitas reprogramar, contáctate con el estudiante desde el chat de Docqee.</p>
          </div>
        `,
      });
      this.logger.log(`Appointment confirmation email sent to patient ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send appointment confirmation email to patient ${to}`, error);
    }
  }

  async sendAppointmentCancelledToPatient(
    to: string,
    patientName: string,
    studentName: string,
    appointmentType: string,
    siteName: string,
    city: string,
    startAt: string,
    endAt: string,
  ) {
    try {
      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.from },
        to: [{ email: to }],
        subject: 'Tu cita fue cancelada - Docqee',
        htmlContent: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a2e;">
            <h2 style="color:#dc2626;">Cita cancelada</h2>
            <p>Hola <strong>${patientName}</strong>,</p>
            <p>El estudiante <strong>${studentName}</strong> ha cancelado la siguiente cita:</p>
            ${this.appointmentDetailsBlock(appointmentType, siteName, city, startAt, endAt)}
            <p style="color:#666;font-size:13px;">Si tienes dudas, comunícate con el estudiante a través del chat de Docqee.</p>
          </div>
        `,
      });
      this.logger.log(`Appointment cancellation email sent to patient ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send appointment cancellation email to patient ${to}`, error);
    }
  }

  async sendAppointmentCancelledToStudent(
    to: string,
    studentName: string,
    patientName: string,
    appointmentType: string,
    siteName: string,
    city: string,
    startAt: string,
    endAt: string,
  ) {
    try {
      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.from },
        to: [{ email: to }],
        subject: 'El paciente canceló la cita - Docqee',
        htmlContent: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a2e;">
            <h2 style="color:#dc2626;">Cita cancelada</h2>
            <p>Hola <strong>${studentName}</strong>,</p>
            <p>El paciente <strong>${patientName}</strong> ha cancelado la siguiente cita:</p>
            ${this.appointmentDetailsBlock(appointmentType, siteName, city, startAt, endAt)}
            <p style="color:#666;font-size:13px;">Si tienes dudas, comunícate con el paciente a través del chat de Docqee.</p>
          </div>
        `,
      });
      this.logger.log(`Appointment cancellation email sent to student ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send appointment cancellation email to student ${to}`, error);
    }
  }

  async sendPasswordResetCode(to: string, code: string) {
    try {
      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.from },
        to: [{ email: to }],
        subject: 'Recuperación de contraseña',
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>Recupera tu contraseña</h2>
            <p>Tu código de recuperación es:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 24px; background: #f4f4f4; border-radius: 8px;">
              ${code}
            </div>
            <p style="color: #666; font-size: 14px;">Este código expira en 5 minutos. Si no solicitaste este cambio, ignora este mensaje.</p>
          </div>
        `,
      });
      this.logger.log(`Password reset code sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset code to ${to}`, error);
    }
  }
}
