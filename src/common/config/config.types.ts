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

export interface AllConfig {
  database: DatabaseConfig;
  app: AppConfig;
  jwt: JwtConfig;
}
