/**
 * 전화번호 자동 포맷팅 유틸리티
 * 숫자만 입력하면 자동으로 하이픈(-) 추가
 */

/**
 * 전화번호 포맷팅
 * @param value - 입력된 전화번호 (숫자만 또는 하이픈 포함)
 * @returns 포맷팅된 전화번호
 *
 * 지원 형식:
 * - 휴대폰: 010-1234-5678, 011-123-4567
 * - 서울: 02-1234-5678, 02-123-4567
 * - 지역: 031-123-4567, 055-1234-5678
 * - 대표번호: 1588-1234, 1600-1234
 */
export function formatPhoneNumber(value: string): string {
  // 숫자만 추출
  const numbers = value.replace(/[^0-9]/g, '');

  if (!numbers) return '';

  // 대표번호 (15xx, 16xx, 18xx 등)
  if (numbers.startsWith('15') || numbers.startsWith('16') || numbers.startsWith('18')) {
    if (numbers.length <= 4) {
      return numbers;
    }
    return `${numbers.slice(0, 4)}-${numbers.slice(4, 8)}`;
  }

  // 서울 지역번호 (02)
  if (numbers.startsWith('02')) {
    if (numbers.length <= 2) {
      return numbers;
    }
    if (numbers.length <= 5) {
      return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
    }
    if (numbers.length <= 9) {
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 5)}-${numbers.slice(5)}`;
    }
    return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
  }

  // 휴대폰 또는 지역번호 (3자리)
  if (numbers.length <= 3) {
    return numbers;
  }
  if (numbers.length <= 6) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  }
  if (numbers.length <= 10) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`;
  }
  // 11자리 (010-1234-5678)
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
}

/**
 * 전화번호에서 숫자만 추출
 * @param value - 포맷팅된 전화번호
 * @returns 숫자만 포함된 문자열
 */
export function getPhoneNumberDigits(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

/**
 * 전화번호 유효성 검사
 * @param value - 전화번호
 * @returns 유효 여부
 */
export function isValidPhoneNumber(value: string): boolean {
  const digits = getPhoneNumberDigits(value);

  // 대표번호 (8자리)
  if (digits.startsWith('15') || digits.startsWith('16') || digits.startsWith('18')) {
    return digits.length === 8;
  }

  // 서울 (9-10자리)
  if (digits.startsWith('02')) {
    return digits.length >= 9 && digits.length <= 10;
  }

  // 휴대폰/지역번호 (10-11자리)
  return digits.length >= 10 && digits.length <= 11;
}
