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

export interface AllConfig {
  database: DatabaseConfig;
  app: AppConfig;
  jwt: JwtConfig;
  seedInitialize: SeedInitializeConfig;
}
