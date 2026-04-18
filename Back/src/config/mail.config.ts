import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  from: process.env.MAIL_FROM ?? 'no-reply@docqee.com',
  brevoApiKey: process.env.BREVO_API_KEY ?? '',
  institutionalPartnershipEmail:
    process.env.INSTITUTIONAL_PARTNERSHIP_EMAIL ?? 'docqeelopcoy@gmail.com',
}));
