import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET ?? 'change_me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change_me_too',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  platformAdminEmail: process.env.PLATFORM_ADMIN_EMAIL ?? 'admin@docqee.local',
  platformAdminPassword: process.env.PLATFORM_ADMIN_PASSWORD ?? 'Admin123!',
}));
