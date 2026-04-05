import { registerAs } from '@nestjs/config';

export default registerAs('upload', () => ({
  dir: process.env.UPLOAD_DIR ?? 'storage/uploads',
}));
