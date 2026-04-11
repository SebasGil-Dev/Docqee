const CLOUDINARY_UPLOAD_SEGMENT = '/image/upload/';
const DEFAULT_OUTPUT_TYPE = 'image/webp';
const DEFAULT_OUTPUT_QUALITY = 0.86;

type ImageFitMode = 'contain' | 'cover';

type OptimizedImageFileOptions = {
  fit: ImageFitMode;
  maxHeight: number;
  maxWidth: number;
  outputType?: string;
  quality?: number;
};

function normalizeImageSource(src: string | null | undefined) {
  const normalizedSrc = src?.trim();
  return normalizedSrc ? normalizedSrc : undefined;
}

function getCloudinaryImageUrl(src: string | null | undefined, transformation: string) {
  const normalizedSrc = normalizeImageSource(src);

  if (
    !normalizedSrc ||
    normalizedSrc.startsWith('data:') ||
    !normalizedSrc.includes(CLOUDINARY_UPLOAD_SEGMENT)
  ) {
    return normalizedSrc;
  }

  return normalizedSrc.replace(
    CLOUDINARY_UPLOAD_SEGMENT,
    `${CLOUDINARY_UPLOAD_SEGMENT}${transformation}/`,
  );
}

export function getOptimizedAvatarUrl(src: string | null | undefined, size = 240) {
  return getCloudinaryImageUrl(
    src,
    `f_auto,q_auto,c_fill,g_face,w_${size},h_${size},dpr_auto`,
  );
}

export function getOptimizedLogoUrl(
  src: string | null | undefined,
  width = 360,
  height = 240,
) {
  return getCloudinaryImageUrl(
    src,
    `e_trim:10,f_auto,q_auto:best,c_fit,w_${width},h_${height},dpr_auto`,
  );
}

function readFileAsDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('No pudimos leer la imagen seleccionada.'));
    };

    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onerror = () => reject(new Error('No pudimos preparar la imagen.'));
    image.onload = () => resolve(image);
    image.src = src;
  });
}

function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  outputType: string,
  quality: number,
) {
  return new Promise<string>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          try {
            resolve(canvas.toDataURL(outputType, quality));
          } catch (error) {
            reject(error);
          }

          return;
        }

        readFileAsDataUrl(blob).then(resolve).catch(reject);
      },
      outputType,
      quality,
    );
  });
}

function getContainDimensions(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number,
) {
  const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);

  return {
    height: Math.max(1, Math.round(sourceHeight * scale)),
    width: Math.max(1, Math.round(sourceWidth * scale)),
  };
}

export async function readOptimizedImageFileAsDataUrl(
  file: File,
  options: OptimizedImageFileOptions,
) {
  if (
    typeof document === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return readFileAsDataUrl(file);
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!sourceWidth || !sourceHeight || !context) {
      return readFileAsDataUrl(file);
    }

    if (options.fit === 'cover') {
      canvas.width = options.maxWidth;
      canvas.height = options.maxHeight;

      const scale = Math.max(
        options.maxWidth / sourceWidth,
        options.maxHeight / sourceHeight,
      );
      const drawWidth = sourceWidth * scale;
      const drawHeight = sourceHeight * scale;
      const drawX = (options.maxWidth - drawWidth) / 2;
      const drawY = (options.maxHeight - drawHeight) / 2;

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    } else {
      const { height, width } = getContainDimensions(
        sourceWidth,
        sourceHeight,
        options.maxWidth,
        options.maxHeight,
      );

      canvas.width = width;
      canvas.height = height;

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, width, height);
    }

    return canvasToDataUrl(
      canvas,
      options.outputType ?? DEFAULT_OUTPUT_TYPE,
      options.quality ?? DEFAULT_OUTPUT_QUALITY,
    );
  } catch {
    return readFileAsDataUrl(file);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
