import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Brevo from '@getbrevo/brevo';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiInstance: Brevo.TransactionalEmailsApi;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.from = this.configService.get<string>('mail.from') ?? 'no-reply@docqee.com';
    this.apiInstance = new Brevo.TransactionalEmailsApi();
    this.apiInstance.setApiKey(
      Brevo.TransactionalEmailsApiApiKeys.apiKey,
      this.configService.get<string>('mail.brevoApiKey') ?? '',
    );
  }

  async sendVerificationCode(to: string, code: string) {
    try {
      const email = new Brevo.SendSmtpEmail();
      email.sender = { email: this.from };
      email.to = [{ email: to }];
      email.subject = 'Verifica tu correo electrónico';
      email.htmlContent = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Verifica tu correo</h2>
          <p>Tu código de verificación es:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 24px; background: #f4f4f4; border-radius: 8px;">
            ${code}
          </div>
          <p style="color: #666; font-size: 14px;">Este código expira en 5 minutos.</p>
        </div>
      `;
      await this.apiInstance.sendTransacEmail(email);
      this.logger.log(`Verification code sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send verification code to ${to}`, error);
    }
  }

  async sendPasswordResetCode(to: string, code: string) {
    try {
      const email = new Brevo.SendSmtpEmail();
      email.sender = { email: this.from };
      email.to = [{ email: to }];
      email.subject = 'Recuperación de contraseña';
      email.htmlContent = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Recupera tu contraseña</h2>
          <p>Tu código de recuperación es:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 24px; background: #f4f4f4; border-radius: 8px;">
            ${code}
          </div>
          <p style="color: #666; font-size: 14px;">Este código expira en 5 minutos. Si no solicitaste este cambio, ignora este mensaje.</p>
        </div>
      `;
      await this.apiInstance.sendTransacEmail(email);
      this.logger.log(`Password reset code sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset code to ${to}`, error);
    }
  }
}
