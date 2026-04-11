import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import { json, urlencoded } from 'express';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { appValidationPipe } from './shared/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use(json({ limit: '6mb' }));
  app.use(urlencoded({ extended: true, limit: '6mb' }));
  app.use(compression());

  app.enableCors({
    origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : true,
    credentials: true,
  });

  app.useGlobalPipes(appValidationPipe);
  app.useGlobalFilters(new HttpExceptionFilter());

  // Health check para Railway / proxies
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req: unknown, res: { json: (body: object) => void }) => {
    res.json({ status: 'ok' });
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
}

bootstrap();
