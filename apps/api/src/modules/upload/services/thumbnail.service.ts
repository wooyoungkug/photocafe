import { Injectable, Logger } from '@nestjs/common';
import { join, extname } from 'path';
import sharp = require('sharp');

@Injectable()
export class ThumbnailService {
  private readonly logger = new Logger(ThumbnailService.name);
  private readonly maxSize: number;

  constructor() {
    this.maxSize = parseInt(process.env.THUMBNAIL_MAX_SIZE || '500', 10);
  }

  /** 원본 이미지에서 썸네일 생성 */
  async generateThumbnail(
    originalPath: string,
    outputDir: string,
    fileName: string,
  ): Promise<string> {
    const ext = extname(fileName);
    const base = fileName.slice(0, -ext.length);
    const thumbName = `${base}_thumb.jpg`;
    const thumbPath = join(outputDir, thumbName);

    try {
      await sharp(originalPath)
        .resize(this.maxSize, this.maxSize, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toFile(thumbPath);

      return thumbPath;
    } catch (err) {
      this.logger.error(`Thumbnail generation failed for ${fileName}:`, err);
      throw err;
    }
  }
}
