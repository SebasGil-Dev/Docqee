import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { UploadImageFile } from '@/shared/storage/cloudinary.service';
import { CloudinaryService } from '@/shared/storage/cloudinary.service';
import type { RequestUser } from '@/shared/types/request-user.type';
import { UpdateStudentProfileDto } from './application/dto/update-student-profile.dto';
import { UpdateStudentRequestStatusDto } from './application/dto/update-student-request-status.dto';
import { UpdateStudentTreatmentsDto } from './application/dto/update-student-treatments.dto';
import { StudentPortalRepository } from './domain/repositories/student-portal.repository';

@Injectable()
export class StudentPortalService {
  constructor(
    private readonly studentPortalRepository: StudentPortalRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  getDashboard(user: RequestUser) {
    return this.studentPortalRepository.getDashboard(user.id);
  }

  getUniversitySites(user: RequestUser) {
    return this.studentPortalRepository.getUniversitySites(user.id);
  }

  updatePracticeSites(user: RequestUser, siteIds: string[]) {
    return this.studentPortalRepository.updatePracticeSites(user.id, siteIds.map(Number));
  }

  getTreatmentTypes() {
    return this.studentPortalRepository.getTreatmentTypes();
  }

  updateTreatments(user: RequestUser, payload: UpdateStudentTreatmentsDto) {
    return this.studentPortalRepository.updateTreatments(user.id, payload.treatmentTypeIds.map(Number));
  }

  updateRequestStatus(user: RequestUser, requestId: number, payload: UpdateStudentRequestStatusDto) {
    return this.studentPortalRepository.updateRequestStatus(user.id, requestId, payload);
  }

  getConversations(user: RequestUser) {
    return this.studentPortalRepository.getConversations(user.id);
  }

  getConversation(user: RequestUser, conversationId: number) {
    return this.studentPortalRepository.getConversation(user.id, conversationId);
  }

  sendConversationMessage(user: RequestUser, conversationId: number, content: string) {
    return this.studentPortalRepository.sendConversationMessage(user.id, conversationId, content);
  }

  async updateProfile(user: RequestUser, payload: UpdateStudentProfileDto) {
    const nextAvatarSrc = await this.resolveAvatarUrl(payload.avatarSrc, user.id);

    return this.studentPortalRepository.updateProfile(user.id, {
      ...payload,
      avatarSrc: nextAvatarSrc,
    });
  }

  async uploadProfileAvatar(user: RequestUser, file: UploadImageFile | undefined) {
    if (!file) {
      throw new BadRequestException('Selecciona una foto de perfil.');
    }

    const uploadedAvatar = await this.cloudinaryService.uploadImageFile(file, {
      folder: `docqee/estudiantes/${user.id}/perfil`,
      publicId: `avatar-${Date.now()}-${randomUUID()}`,
    });

    return {
      avatarFileName: file.originalname ?? 'Foto cargada',
      avatarSrc: uploadedAvatar.secureUrl,
      publicId: uploadedAvatar.publicId,
    };
  }

  private async resolveAvatarUrl(
    avatarSrc: string | null | undefined,
    studentAccountId: number,
  ): Promise<string | null> {
    const normalizedAvatarSrc = avatarSrc?.trim();

    if (!normalizedAvatarSrc) {
      return null;
    }

    if (this.cloudinaryService.isImageDataUri(normalizedAvatarSrc)) {
      const uploadedAvatar = await this.cloudinaryService.uploadImageDataUri(
        normalizedAvatarSrc,
        {
          folder: `docqee/estudiantes/${studentAccountId}`,
          publicId: 'avatar',
        },
      );

      return uploadedAvatar.secureUrl;
    }

    if (/^https?:\/\//i.test(normalizedAvatarSrc)) {
      return normalizedAvatarSrc;
    }

    throw new BadRequestException('La foto de perfil no tiene un formato valido.');
  }
}
