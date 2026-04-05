import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.from = this.configService.get<string>('mail.from') ?? 'no-reply@docqee.com';

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('mail.host'),
      port: this.configService.get<number>('mail.port'),
      secure: false,
      auth: {
        user: this.configService.get<string>('mail.user'),
        pass: this.configService.get<string>('mail.pass'),
      },
    });
  }

  async sendVerificationCode(to: string, code: string) {
    await this.transporter.sendMail({
      from: `"Docqee" <${this.from}>`,
      to,
      subject: 'Verifica tu correo electrónico',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Verifica tu correo</h2>
          <p>Tu código de verificación es:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 24px; background: #f4f4f4; border-radius: 8px;">
            ${code}
          </div>
          <p style="color: #666; font-size: 14px;">Este código expira en 10 minutos.</p>
        </div>
      `,
    });

    this.logger.log(`Verification code sent to ${to}`);
  }

  async sendPasswordResetCode(to: string, code: string) {
    await this.transporter.sendMail({
      from: `"Docqee" <${this.from}>`,
      to,
      subject: 'Recuperación de contraseña',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Recupera tu contraseña</h2>
          <p>Tu código de recuperación es:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 24px; background: #f4f4f4; border-radius: 8px;">
            ${code}
          </div>
          <p style="color: #666; font-size: 14px;">Este código expira en 10 minutos. Si no solicitaste este cambio, ignora este mensaje.</p>
        </div>
      `,
    });

    this.logger.log(`Password reset code sent to ${to}`);
  }
}
