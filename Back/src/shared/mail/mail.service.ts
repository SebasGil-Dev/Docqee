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
