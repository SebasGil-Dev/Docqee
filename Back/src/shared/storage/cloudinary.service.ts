import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'node:stream';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_DATA_URI_PATTERN = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i;
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type UploadImageOptions = {
  folder: string;
  publicId?: string;
};

export type UploadImageFile = {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
  size: number;
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
    const cloudinaryUrlConfig = this.parseCloudinaryUrl(cloudinaryUrl);
    const resolvedCloudName = cloudName || cloudinaryUrlConfig?.cloudName || '';
    const resolvedApiKey = apiKey || cloudinaryUrlConfig?.apiKey || '';
    const resolvedApiSecret = apiSecret || cloudinaryUrlConfig?.apiSecret || '';

    if (
      resolvedCloudName &&
      resolvedApiKey &&
      resolvedApiSecret &&
      !this.hasPlaceholderValue(resolvedCloudName, resolvedApiKey, resolvedApiSecret)
    ) {
      cloudinary.config({
        api_key: resolvedApiKey,
        api_secret: resolvedApiSecret,
        cloud_name: resolvedCloudName,
        secure: true,
      });
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

    const result = await cloudinary.uploader
      .upload(normalizedDataUri, {
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        folder: options.folder,
        overwrite: true,
        public_id: options.publicId,
        resource_type: 'image',
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        this.logger.warn(`Cloudinary rechazo la subida de imagen: ${message}`);
        throw new BadRequestException(
          'No pudimos subir el logo a Cloudinary. Revisa las variables CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET.',
        );
      });

    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
    };
  }

  async uploadImageFile(file: UploadImageFile, options: UploadImageOptions) {
    if (!this.isConfigured) {
      throw new BadRequestException('Cloudinary no esta configurado en el servidor.');
    }

    this.validateImageFile(file);

    const result = await new Promise<{ public_id: string; secure_url: string }>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            folder: options.folder,
            overwrite: Boolean(options.publicId),
            public_id: options.publicId,
            resource_type: 'image',
          },
          (error, uploadResult) => {
            if (error || !uploadResult) {
              reject(error ?? new Error('Cloudinary no retorno informacion de la imagen.'));
              return;
            }

            resolve({
              public_id: uploadResult.public_id,
              secure_url: uploadResult.secure_url,
            });
          },
        );

        Readable.from(file.buffer).pipe(uploadStream).on('error', reject);
      },
    ).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.warn(`Cloudinary rechazo la subida de imagen: ${message}`);
      throw new BadRequestException(
        'No pudimos subir el logo a Cloudinary. Revisa las variables CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET.',
      );
    });

    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
    };
  }

  private parseCloudinaryUrl(value: string) {
    if (!value) {
      return null;
    }

    try {
      const url = new URL(value);

      if (url.protocol !== 'cloudinary:') {
        return null;
      }

      return {
        apiKey: decodeURIComponent(url.username),
        apiSecret: decodeURIComponent(url.password),
        cloudName: url.hostname,
      };
    } catch {
      return null;
    }
  }

  private hasPlaceholderValue(...values: string[]) {
    return values.some((value) => value.includes('<') || value.includes('>') || value.startsWith('your_'));
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

  private validateImageFile(file: UploadImageFile) {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('El logo debe ser una imagen JPG, PNG o WEBP valida.');
    }

    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('El logo no puede pesar mas de 5 MB.');
    }
  }
}
