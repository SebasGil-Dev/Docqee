import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import mailConfig from './config/mail.config';
import uploadConfig from './config/upload.config';
import { PrismaModule } from './shared/database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CatalogsModule } from './modules/catalogs/catalogs.module';
import { UniversitiesModule } from './modules/universities/universities.module';
import { PlatformAdminModule } from './modules/platform-admin/platform-admin.module';
import { UniversityAdminModule } from './modules/university-admin/university-admin.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { CredentialsModule } from './modules/credentials/credentials.module';
import { BulkUploadModule } from './modules/bulk-upload/bulk-upload.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FilesModule } from './modules/files/files.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, databaseConfig, mailConfig, uploadConfig],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CatalogsModule,
    UniversitiesModule,
    PlatformAdminModule,
    UniversityAdminModule,
    StudentsModule,
    TeachersModule,
    CredentialsModule,
    BulkUploadModule,
    NotificationsModule,
    FilesModule,
  ],
})
export class AppModule {}
