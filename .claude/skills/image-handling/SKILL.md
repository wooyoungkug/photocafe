---
name: image-handling
description: 인쇄용 이미지 처리 및 관리. 이미지 업로드, 포맷 변환, 해상도 검증, 파일 최적화 작업 시 사용합니다.
---

# 이미지 처리 스킬

포토북/앨범 인쇄를 위한 이미지 처리 가이드입니다.

## 인쇄용 이미지 요구사항

### 해상도 기준
| 용도 | 최소 해상도 | 권장 해상도 |
|------|------------|------------|
| 포토북 | 300 DPI | 300-400 DPI |
| 대형 인쇄물 | 150 DPI | 200+ DPI |
| 웹 미리보기 | 72 DPI | 72-96 DPI |

### 지원 포맷
- **입력**: JPG, PNG, TIFF, PSD, PDF
- **인쇄용**: TIFF (무손실), PDF/X-1a
- **미리보기**: JPG (품질 80%), WebP

### 색상 모드
- 인쇄: CMYK
- 웹: sRGB

## 이미지 처리 코드 패턴

### Sharp 라이브러리 사용 (권장)

```typescript
import sharp from 'sharp';

// 이미지 리사이즈 및 최적화
async function processImage(inputPath: string, outputPath: string) {
  await sharp(inputPath)
    .resize(2000, 2000, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 85, progressive: true })
    .toFile(outputPath);
}

// 썸네일 생성
async function createThumbnail(inputPath: string) {
  return sharp(inputPath)
    .resize(300, 300, { fit: 'cover' })
    .jpeg({ quality: 70 })
    .toBuffer();
}

// 이미지 메타데이터 추출
async function getImageInfo(inputPath: string) {
  const metadata = await sharp(inputPath).metadata();
  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    dpi: metadata.density || 72,
    colorSpace: metadata.space
  };
}
```

### 해상도 검증

```typescript
function validatePrintResolution(
  width: number,
  height: number,
  dpi: number,
  printWidthMm: number,
  printHeightMm: number
): { valid: boolean; message: string } {
  const requiredWidth = Math.ceil((printWidthMm / 25.4) * 300);
  const requiredHeight = Math.ceil((printHeightMm / 25.4) * 300);

  if (width < requiredWidth || height < requiredHeight) {
    return {
      valid: false,
      message: `최소 ${requiredWidth}x${requiredHeight}px 필요 (현재: ${width}x${height}px)`
    };
  }

  return { valid: true, message: '인쇄 가능' };
}
```

## 파일 업로드 구조

```typescript
// 업로드 경로 구조
interface UploadPaths {
  original: string;    // /uploads/orders/{orderId}/original/
  processed: string;   // /uploads/orders/{orderId}/processed/
  thumbnail: string;   // /uploads/orders/{orderId}/thumbnails/
}

// 파일명 규칙
// {orderId}_{itemIndex}_{timestamp}.{ext}
// 예: ORD-2024-001_01_1703750400.jpg
```

## S3 업로드 패턴

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const client = new S3Client({ region: process.env.AWS_REGION });

  await client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'private'
  }));

  return `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;
}
```

## 에러 처리

```typescript
class ImageProcessingError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_FORMAT' | 'LOW_RESOLUTION' | 'FILE_TOO_LARGE' | 'CORRUPTED'
  ) {
    super(message);
    this.name = 'ImageProcessingError';
  }
}

// 사용 예시
if (!['jpg', 'jpeg', 'png', 'tiff'].includes(format)) {
  throw new ImageProcessingError(
    '지원하지 않는 이미지 형식입니다',
    'INVALID_FORMAT'
  );
}
```

## 체크리스트

이미지 기능 구현 시 확인사항:

- [ ] 파일 크기 제한 없음
- [ ] 허용 확장자 검증
- [ ] 해상도 검증 (인쇄용 300DPI 이상)
- [ ] 썸네일 자동 생성
- [ ] EXIF 방향 정보 처리
- [ ] 에러 시 원본 파일 정리
- [ ] 업로드 진행률 표시 (프론트엔드)
