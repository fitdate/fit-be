import { SEED_PATH } from '../constant/seed-path';

// 시드 키 타입
export type SeedKey = keyof typeof SEED_PATH;

// 시드 메타데이터의 기본 구조
export interface SeedPathConfig {
  path: string;
  configKey: SeedKey;
  fieldName: string;
  extractMethod: string;
  servicePath: string;
  serviceMethod?: string;
}

// 시드 설정 타입
export type SeedConfig = Record<SeedKey, boolean>;
