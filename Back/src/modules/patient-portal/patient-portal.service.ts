import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { CloudinaryService } from '@/shared/storage/cloudinary.service';
import type { UploadImageFile } from '@/shared/storage/cloudinary.service';
import type { RequestUser } from '@/shared/types/request-user.type';
import { UpdatePatientAppointmentStatusDto } from './application/dto/update-patient-appointment-status.dto';
import { UpdatePatientProfileDto } from './application/dto/update-patient-profile.dto';
import { UpdatePatientRequestStatusDto } from './application/dto/update-patient-request-status.dto';
import { CreatePatientRequestDto } from './application/dto/create-patient-request.dto';
import { PatientPortalRepository } from './domain/repositories/patient-portal.repository';

@Injectable()
export class PatientPortalService {
  constructor(
    private readonly patientPortalRepository: PatientPortalRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  getDashboard(user: RequestUser) {
    return this.patientPortalRepository.getDashboard(user.id);
  }

  async updateProfile(user: RequestUser, payload: UpdatePatientProfileDto) {
    const nextAvatarSrc = await this.resolveAvatarUrl(payload.avatarSrc, user.id);
    return this.patientPortalRepository.updateProfile(user.id, { ...payload, avatarSrc: nextAvatarSrc });
  }

  async uploadProfileAvatar(user: RequestUser, file: UploadImageFile | undefined) {
    if (!file) {
      throw new BadRequestException('Selecciona una foto de perfil.');
    }

    const uploaded = await this.cloudinaryService.uploadImageFile(file, {
      folder: `docqee/pacientes/${user.id}/perfil`,
      publicId: `avatar-${Date.now()}-${randomUUID()}`,
    });

    return {
      avatarFileName: file.originalname ?? 'Foto cargada',
      avatarSrc: uploaded.secureUrl,
      publicId: uploaded.publicId,
    };
  }

  createRequest(user: RequestUser, payload: CreatePatientRequestDto) {
    return this.patientPortalRepository.createRequest(user.id, payload);
  }

  updateRequestStatus(user: RequestUser, requestId: number, payload: UpdatePatientRequestStatusDto) {
    return this.patientPortalRepository.updateRequestStatus(user.id, requestId, payload);
  }

  updateAppointmentStatus(user: RequestUser, appointmentId: number, payload: UpdatePatientAppointmentStatusDto) {
    return this.patientPortalRepository.updateAppointmentStatus(user.id, appointmentId, payload);
  }

  private async resolveAvatarUrl(avatarSrc: string | null | undefined, patientAccountId: number): Promise<string | null> {
    const normalized = avatarSrc?.trim();
    if (!normalized) return null;

    if (this.cloudinaryService.isImageDataUri(normalized)) {
      const uploaded = await this.cloudinaryService.uploadImageDataUri(normalized, {
        folder: `docqee/pacientes/${patientAccountId}`,
        publicId: 'avatar',
      });
      return uploaded.secureUrl;
    }

    if (/^https?:\/\//i.test(normalized)) return normalized;

    throw new BadRequestException('La foto de perfil no tiene un formato valido.');
  }
}
