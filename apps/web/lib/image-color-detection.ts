import type { ImageColorSpace } from '@/stores/multi-folder-upload-store';

/**
 * 이미지 파일의 컬러 스페이스를 감지합니다.
 * JPEG, PNG, TIFF 파일의 헤더와 EXIF 데이터를 분석합니다.
 */
export async function detectImageColorSpace(file: File): Promise<ImageColorSpace> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const ext = file.name.toLowerCase();

    // JPEG 파일 분석
    if (ext.endsWith('.jpg') || ext.endsWith('.jpeg')) {
      return detectJPEGColorSpace(bytes);
    }

    // TIFF 파일 분석
    if (ext.endsWith('.tif') || ext.endsWith('.tiff')) {
      return detectTIFFColorSpace(bytes);
    }

    // PNG 파일 분석
    if (ext.endsWith('.png')) {
      return detectPNGColorSpace(bytes);
    }

    return 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
}

/**
 * JPEG 파일의 컬러 스페이스 감지
 * APP14 마커(Adobe) 또는 JFIF 마커를 확인
 */
function detectJPEGColorSpace(bytes: Uint8Array): ImageColorSpace {
  // JPEG 시그니처 확인 (FF D8)
  if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) {
    return 'Unknown';
  }

  let offset = 2;

  while (offset < bytes.length - 10) {
    // JPEG 마커 확인 (0xFF로 시작)
    if (bytes[offset] !== 0xFF) {
      offset++;
      continue;
    }

    const marker = bytes[offset + 1];

    // SOS 마커(Start of Scan, 0xDA)에 도달하면 종료
    if (marker === 0xDA) {
      break;
    }

    // APP14 마커 (Adobe, 0xEE) - CMYK 정보 포함
    if (marker === 0xEE) {
      const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];

      // Adobe 마커 확인 ("Adobe" 문자열)
      if (offset + 11 < bytes.length) {
        const adobeSignature = String.fromCharCode(...bytes.slice(offset + 4, offset + 9));
        if (adobeSignature === 'Adobe') {
          // Color transform 값 확인 (offset + 15)
          if (offset + 15 < bytes.length) {
            const colorTransform = bytes[offset + 15];
            // 0 = CMYK/RGB, 1 = YCbCr, 2 = YCCK (CMYK)
            if (colorTransform === 0 || colorTransform === 2) {
              // 추가로 컴포넌트 수 확인 (SOF0 마커에서)
              const numComponents = findJPEGComponentCount(bytes);
              if (numComponents === 4) {
                return 'CMYK';
              }
            }
          }
        }
      }
    }

    // SOF0/SOF2 마커 (Start of Frame, 0xC0/0xC2) - 컴포넌트 수 확인
    if (marker === 0xC0 || marker === 0xC2) {
      const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
      if (offset + 9 < bytes.length) {
        const numComponents = bytes[offset + 9];

        if (numComponents === 4) {
          return 'CMYK';
        } else if (numComponents === 3) {
          return 'RGB';
        } else if (numComponents === 1) {
          return 'Grayscale';
        }
      }
    }

    // 다음 마커로 이동
    const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
    offset += 2 + segmentLength;
  }

  // 기본값: sRGB
  return 'sRGB';
}

/**
 * JPEG 파일의 컴포넌트 수 확인 (SOF 마커에서)
 */
function findJPEGComponentCount(bytes: Uint8Array): number {
  let offset = 2;

  while (offset < bytes.length - 10) {
    if (bytes[offset] !== 0xFF) {
      offset++;
      continue;
    }

    const marker = bytes[offset + 1];

    // SOF0 또는 SOF2 마커
    if (marker === 0xC0 || marker === 0xC2) {
      if (offset + 9 < bytes.length) {
        return bytes[offset + 9];
      }
    }

    if (marker === 0xDA) break;

    const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
    offset += 2 + segmentLength;
  }

  return 3; // 기본값: RGB
}

/**
 * TIFF 파일의 컬러 스페이스 감지
 * Photometric Interpretation 태그 확인
 */
function detectTIFFColorSpace(bytes: Uint8Array): ImageColorSpace {
  // TIFF 시그니처 확인
  const isBigEndian = bytes[0] === 0x4D && bytes[1] === 0x4D; // MM
  const isLittleEndian = bytes[0] === 0x49 && bytes[1] === 0x49; // II

  if (!isBigEndian && !isLittleEndian) {
    return 'Unknown';
  }

  const readUint16 = (offset: number) => {
    if (isBigEndian) {
      return (bytes[offset] << 8) | bytes[offset + 1];
    } else {
      return bytes[offset] | (bytes[offset + 1] << 8);
    }
  };

  const readUint32 = (offset: number) => {
    if (isBigEndian) {
      return (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
    } else {
      return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
    }
  };

  // IFD (Image File Directory) 오프셋 읽기
  const ifdOffset = readUint32(4);

  if (ifdOffset >= bytes.length) {
    return 'Unknown';
  }

  // IFD 엔트리 수
  const numEntries = readUint16(ifdOffset);

  // Photometric Interpretation 태그 찾기 (262 = 0x106)
  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifdOffset + 2 + (i * 12);
    if (entryOffset + 12 > bytes.length) break;

    const tag = readUint16(entryOffset);

    // Photometric Interpretation (262)
    if (tag === 262) {
      const value = readUint16(entryOffset + 8);

      // 0 = WhiteIsZero (Grayscale)
      // 1 = BlackIsZero (Grayscale)
      // 2 = RGB
      // 3 = Palette
      // 5 = CMYK
      // 6 = YCbCr

      if (value === 5) {
        return 'CMYK';
      } else if (value === 2) {
        return 'RGB';
      } else if (value === 0 || value === 1) {
        return 'Grayscale';
      }
    }

    // SamplesPerPixel 태그 (277) - 추가 확인
    if (tag === 277) {
      const value = readUint16(entryOffset + 8);
      if (value === 4) {
        return 'CMYK';
      }
    }
  }

  return 'RGB';
}

/**
 * PNG 파일의 컬러 스페이스 감지
 * iCCP 청크 또는 IHDR 청크 확인
 */
function detectPNGColorSpace(bytes: Uint8Array): ImageColorSpace {
  // PNG 시그니처 확인
  if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4E || bytes[3] !== 0x47) {
    return 'Unknown';
  }

  let offset = 8; // 시그니처 다음부터

  while (offset < bytes.length - 12) {
    // 청크 길이 (Big Endian)
    const chunkLength = (bytes[offset] << 24) | (bytes[offset + 1] << 16) |
                        (bytes[offset + 2] << 8) | bytes[offset + 3];

    // 청크 타입 (4바이트)
    const chunkType = String.fromCharCode(bytes[offset + 4], bytes[offset + 5],
                                           bytes[offset + 6], bytes[offset + 7]);

    // IHDR 청크 (이미지 헤더)
    if (chunkType === 'IHDR') {
      if (offset + 12 + 9 <= bytes.length) {
        const colorType = bytes[offset + 8 + 9];

        // Color Type:
        // 0 = Grayscale
        // 2 = RGB
        // 3 = Indexed (Palette)
        // 4 = Grayscale + Alpha
        // 6 = RGBA

        if (colorType === 2 || colorType === 6) {
          return 'sRGB'; // PNG는 기본적으로 sRGB
        } else if (colorType === 0 || colorType === 4) {
          return 'Grayscale';
        }
      }
    }

    // iCCP 청크 (ICC 프로파일)
    if (chunkType === 'iCCP') {
      // ICC 프로파일 이름 읽기
      let nameEnd = offset + 8;
      while (nameEnd < offset + 8 + chunkLength && bytes[nameEnd] !== 0) {
        nameEnd++;
      }

      const profileName = String.fromCharCode(...bytes.slice(offset + 8, nameEnd)).toLowerCase();

      if (profileName.includes('cmyk')) {
        return 'CMYK';
      }
    }

    // IEND 청크에 도달하면 종료
    if (chunkType === 'IEND') {
      break;
    }

    // 다음 청크로 이동 (길이 + 타입 + 데이터 + CRC)
    offset += 4 + 4 + chunkLength + 4;
  }

  return 'sRGB';
}
