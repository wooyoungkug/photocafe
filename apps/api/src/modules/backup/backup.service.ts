import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly s3: S3Client;

  constructor(private config: ConfigService) {
    this.s3 = new S3Client({
      region: 'us-east-005',
      endpoint: config.get('B2_BACKUP_ENDPOINT'),
      credentials: {
        accessKeyId: config.get('B2_BACKUP_KEY_ID'),
        secretAccessKey: config.get('B2_BACKUP_APP_KEY'),
      },
    });
  }

  @Cron('0 18 * * *')
  async runDailyBackup() {
    this.logger.log('🗄️ DB 백업 시작...');
    const date = new Date().toISOString().slice(0, 10);
    const filename = `photocafe-${date}.dump`;
    const tmpPath = `/tmp/${filename}`;
    try {
      await execAsync(`pg_dump "${this.config.get('DATABASE_URL')}" -Fc -f ${tmpPath}`);
      const buffer = fs.readFileSync(tmpPath);
      await this.s3.send(new PutObjectCommand({
        Bucket: this.config.get('B2_BACKUP_BUCKET'),
        Key: `db/${filename}`,
        Body: buffer,
        ContentType: 'application/octet-stream',
      }));
      fs.unlinkSync(tmpPath);
      this.logger.log(`✅ 백업 완료: db/${filename}`);
    } catch (err) {
      this.logger.error('❌ 백업 실패', err);
    }
  }
}
