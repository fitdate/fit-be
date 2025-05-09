import { Logger } from '@nestjs/common';

export interface MaskEmailResultInterface {
  maskedEmail: string;
}

export function maskEmail(email: string): MaskEmailResultInterface {
  const logger = new Logger('EmailMaskUtil');

  if (!email || !email.includes('@')) {
    logger.error('유효하지 않은 이메일 형식입니다.');
    return { maskedEmail: '' };
  }

  const [local, domain] = email.split('@');

  // 앞에서 최대 3글자까지만 보여줌
  const visibleLength = Math.min(3, local.length);
  const visiblePart = local.slice(0, visibleLength);
  const maskedPart = '*'.repeat(local.length - visibleLength);

  return { maskedEmail: `${visiblePart}${maskedPart}@${domain}` };
}
