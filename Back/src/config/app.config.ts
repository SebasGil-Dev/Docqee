import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  name: 'docqee-backend',
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
}));
