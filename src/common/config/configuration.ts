import * as Joi from 'joi';

export const configuration = () => ({
  database: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
  },
  app: {
    name: process.env.APP_NAME,
    env: process.env.APP_ENV || 'development',
    port: Number(process.env.APP_PORT),
    host: process.env.APP_HOST,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    accessTokenTtl: process.env.JWT_ACCESS_TOKEN_TTL || '30m',
    refreshTokenTtl: process.env.JWT_REFRESH_TOKEN_TTL || '7d',
    audience: process.env.JWT_TOKEN_AUDIENCE,
    issuer: process.env.JWT_TOKEN_ISSUER,
  },
});

export const validationSchema = Joi.object({
  //외부 db url 있으면 외부 db url 사용 없으면 .env db 설정 사용
  DB_URL: Joi.string().uri().allow(''),
  DB_HOST: Joi.when('DB_URL', {
    is: Joi.string().min(1),
    then: Joi.forbidden(),
    otherwise: Joi.string().required(),
  }),
  DB_PORT: Joi.when('DB_URL', {
    is: Joi.string().min(1),
    then: Joi.forbidden(),
    otherwise: Joi.number().default(5432),
  }),
  DB_USERNAME: Joi.when('DB_URL', {
    is: Joi.string().min(1),
    then: Joi.forbidden(),
    otherwise: Joi.string().required(),
  }),
  DB_PASSWORD: Joi.when('DB_URL', {
    is: Joi.string().min(1),
    then: Joi.forbidden(),
    otherwise: Joi.string().required(),
  }),
  DB_NAME: Joi.when('DB_URL', {
    is: Joi.string().min(1),
    then: Joi.forbidden(),
    otherwise: Joi.string().required(),
  }),
  APP_NAME: Joi.string().required(),
  APP_ENV: Joi.string().required(),
  APP_PORT: Joi.number().required(),
  APP_HOST: Joi.string().required(),
  JWT_ACCESS_TOKEN_TTL: Joi.string().required(),
  JWT_REFRESH_TOKEN_TTL: Joi.string().required(),
  JWT_TOKEN_AUDIENCE: Joi.string().required(),
  JWT_TOKEN_ISSUER: Joi.string().required(),
});

export const ConfigModuleOptions = {
  isGlobal: true,
  load: [configuration],
  validationSchema,
  validationOptions: {
    allowUnknown: true,
    abortEarly: false,
  },
};

// 변수 사용할때 이런식으로 타입 주입해서 사용하는걸 추천
// constructor(private configService: ConfigService<AllConfig>) {}
// return this.configService.getOrThrow('database.host', { infer: true });
