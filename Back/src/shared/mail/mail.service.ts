import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.from = this.configService.get<string>('mail.from') ?? 'no-reply@docqee.com';
    this.resend = new Resend(this.configService.get<string>('mail.resendApiKey'));
  }

  async sendVerificationCode(to: string, code: string) {
    try {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject: 'Verifica tu correo electrónico',
        html: `
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

  async sendPasswordResetCode(to: string, code: string) {
    try {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject: 'Recuperación de contraseña',
        html: `
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
