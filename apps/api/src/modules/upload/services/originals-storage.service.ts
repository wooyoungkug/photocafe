import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class OriginalsStorageService {
    private readonly s3: S3Client;
    private readonly bucket: string;

    constructor(private readonly config: ConfigService) {
        this.bucket = config.get<string>('B2_ORIGINALS_BUCKET', '');
        this.s3 = new S3Client({
            region: 'auto',
            endpoint: config.get<string>('B2_ORIGINALS_ENDPOINT'),
            credentials: {
                accessKeyId: config.get<string>('B2_ORIGINALS_KEY_ID', ''),
                secretAccessKey: config.get<string>('B2_ORIGINALS_APP_KEY', ''),
            },
        });
    }

    async upload(buffer: Buffer, key: string, mimetype: string): Promise<void> {
        await this.s3.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: buffer,
                ContentType: mimetype,
            }),
        );
    }

    async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
        return getSignedUrl(
            this.s3,
            new GetObjectCommand({ Bucket: this.bucket, Key: key }),
            { expiresIn },
        );
    }

    async delete(key: string): Promise<void> {
        await this.s3.send(
            new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
        );
    }
}
