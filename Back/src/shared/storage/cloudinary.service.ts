import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_DATA_URI_PATTERN = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i;

type UploadImageOptions = {
  folder: string;
  publicId: string;
};

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('cloudinary.cloudName') ?? '';
    const apiKey = this.configService.get<string>('cloudinary.apiKey') ?? '';
    const apiSecret = this.configService.get<string>('cloudinary.apiSecret') ?? '';
    const cloudinaryUrl = this.configService.get<string>('cloudinary.url') ?? '';

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        api_key: apiKey,
        api_secret: apiSecret,
        cloud_name: cloudName,
        secure: true,
      });
      this.isConfigured = true;
      return;
    }

    if (cloudinaryUrl) {
      cloudinary.config({ secure: true });
      this.isConfigured = true;
      return;
    }

    this.isConfigured = false;
    this.logger.warn('Cloudinary no esta configurado. Las subidas de imagen fallaran.');
  }

  isImageDataUri(value: string) {
    return value.startsWith('data:image/');
  }

  async uploadImageDataUri(dataUri: string, options: UploadImageOptions) {
    if (!this.isConfigured) {
      throw new BadRequestException('Cloudinary no esta configurado en el servidor.');
    }

    const normalizedDataUri = this.validateImageDataUri(dataUri);

    const result = await cloudinary.uploader.upload(normalizedDataUri, {
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      folder: options.folder,
      overwrite: true,
      public_id: options.publicId,
      resource_type: 'image',
    });

    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
    };
  }

  private validateImageDataUri(dataUri: string) {
    const match = IMAGE_DATA_URI_PATTERN.exec(dataUri);

    if (!match) {
      throw new BadRequestException('El logo debe ser una imagen JPG, PNG o WEBP valida.');
    }

    const mimeType = match[1].toLowerCase();
    const base64Payload = match[2].replace(/\s/g, '');
    const byteLength = Buffer.byteLength(base64Payload, 'base64');

    if (byteLength > MAX_IMAGE_BYTES) {
      throw new BadRequestException('El logo no puede pesar mas de 5 MB.');
    }

    return `data:${mimeType};base64,${base64Payload}`;
  }
}
