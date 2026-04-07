import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import mailConfig from './config/mail.config';
import { PrismaModule } from './shared/database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogsModule } from './modules/catalogs/catalogs.module';
import { PlatformAdminModule } from './modules/platform-admin/platform-admin.module';
import { UniversityAdminModule } from './modules/university-admin/university-admin.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { CredentialsModule } from './modules/credentials/credentials.module';
import { PatientPortalModule } from './modules/patient-portal/patient-portal.module';
import { StudentPortalModule } from './modules/student-portal/student-portal.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, databaseConfig, mailConfig],
    }),
    PrismaModule,
    AuthModule,
    CatalogsModule,
    PlatformAdminModule,
    UniversityAdminModule,
    StudentsModule,
    TeachersModule,
    CredentialsModule,
    PatientPortalModule,
    StudentPortalModule,
  ],
})
export class AppModule {}
