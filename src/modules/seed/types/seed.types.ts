// Seed 관련 상수 정의
export const SEED_PATH = {
  feedback: {
    path: 'seeds/feedback.seed.json',
    configKey: 'feedback',
    fieldName: 'name',
    method: 'findAllFeedback',
  },
  interestCategory: {
    path: 'seeds/interest-category.seed.json',
    configKey: 'interestCategory',
    fieldName: 'name',
    method: 'findAllInterestCategory',
  },
  introduction: {
    path: 'seeds/introduction.seed.json',
    configKey: 'introduction',
    fieldName: 'name',
    method: 'findAllIntroduction',
  },
} as const;

// Seed 키 타입
export type SeedKey = keyof typeof SEED_PATH;

// Seed 설정 타입
export type SeedConfig = Record<SeedKey, boolean>;

// Seed 메타데이터 타입
export type SeedMeta = (typeof SEED_PATH)[SeedKey];

// 서비스 메서드 타입
export type ServiceMethod =
  | 'findAllFeedback'
  | 'findAllIntroduction'
  | 'findAllInterestCategory';

// 서비스 인터페이스
export type SeedService = {
  [K in ServiceMethod]: () => Promise<any[]>;
};
