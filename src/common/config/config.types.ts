export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
}

export interface AppConfig {
  name: string;
  env: string;
  port: number;
  host: string;
}

export interface JwtConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenTtl: string;
  refreshTokenTtl: string;
  audience: string;
  issuer: string;
}

export interface SeedInitializeConfig {
  introduction: boolean;
  feedback: boolean;
  interestCategory: boolean;
}

export interface RedisConfig {
  host: string;
  port: number;
}

export interface MailerConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  tokenTtl: string;
}

export interface SocialConfig {
  google: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
  kakao: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
  naver: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
  socialFrontendUrl: string;
}
export interface AllConfig {
  database: DatabaseConfig;
  app: AppConfig;
  jwt: JwtConfig;
  seedInitialize: SeedInitializeConfig;
  mailer: MailerConfig;
  redis: RedisConfig;
  social: SocialConfig;
}
