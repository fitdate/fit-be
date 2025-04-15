export interface SeedService {
  extractSeed(): Promise<any[]>;
  initializeSeed(): Promise<void>;
  createManyFromSeed?(data: any[]): Promise<any>;
}

export interface FeedbackService {
  findAllFeedback(): Promise<any[]>;
}

export interface IntroductionService {
  findAllIntroduction(): Promise<any[]>;
}

export interface InterestCategoryService {
  findAllInterestCategory(): Promise<any[]>;
}

export interface FindAllService {
  findAll(): Promise<any[]>;
}

export interface SeedData {
  [key: string]: unknown[];
}

export interface SeedServiceMap {
  [key: string]: SeedService;
}

export interface SeedInitializeConfig {
  services: SeedServiceMap;
  data: SeedData;
}
