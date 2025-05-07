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
    callbackUrlDev: string;
    callbackUrlLocal: string;
  };
  kakao: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
    callbackUrlDev: string;
    callbackUrlLocal: string;
  };
  naver: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
    callbackUrlDev: string;
    callbackUrlLocal: string;
  };
  socialFrontendUrl: string;
}

export interface AwsConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
  cloudfrontDomain: string;
}

export interface PublicApiConfig {
  festivalEncodingApiKey: string;
  festivalDecodingApiKey: string;
}

export interface AllConfig {
  database: DatabaseConfig;
  app: AppConfig;
  jwt: JwtConfig;
  seedInitialize: SeedInitializeConfig;
  mailer: MailerConfig;
  redis: RedisConfig;
  social: SocialConfig;
  aws: AwsConfig;
  publicApi: PublicApiConfig;
}
