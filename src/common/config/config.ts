import * as Joi from 'joi';

export const config = () => ({
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
    accessTokenSecret: process.env.JWT_ACCESS_TOKEN_SECRET,
    refreshTokenSecret: process.env.JWT_REFRESH_TOKEN_SECRET,
    accessTokenTtl: process.env.JWT_ACCESS_TOKEN_TTL || '1d',
    refreshTokenTtl: process.env.JWT_REFRESH_TOKEN_TTL || '7d',
    audience: process.env.JWT_TOKEN_AUDIENCE,
    issuer: process.env.JWT_TOKEN_ISSUER,
  },
  seedInitialize: {
    introduction: process.env.SEED_ENABLE_INTRODUCTION,
    feedback: process.env.SEED_ENABLE_FEEDBACK,
    interestCategory: process.env.SEED_ENABLE_INTEREST_CATEGORY,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  },
  mailer: {
    host: process.env.MAILER_HOST,
    port: Number(process.env.MAILER_PORT),
    user: process.env.MAILER_USER,
    password: process.env.MAILER_PASSWORD,
    tokenTtl: process.env.MAILER_TOKEN_TTL,
  },
  social: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    },
    kakao: {
      clientId: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
      callbackUrl: process.env.KAKAO_CALLBACK_URL,
    },
    naver: {
      clientId: process.env.NAVER_CLIENT_ID,
      clientSecret: process.env.NAVER_CLIENT_SECRET,
      callbackUrl: process.env.NAVER_CALLBACK_URL,
    },
    socialFrontendUrl: process.env.SOCIAL_FRONTEND_URL,
  },
});

export const validationSchema = Joi.object({
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
  SEED_ENABLE_INTRODUCTION: Joi.boolean().required(),
  SEED_ENABLE_FEEDBACK: Joi.boolean().required(),
  SEED_ENABLE_INTEREST_CATEGORY: Joi.boolean().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  GOOGLE_CALLBACK_URL: Joi.string().required(),
  KAKAO_CLIENT_ID: Joi.string().required(),
  KAKAO_CLIENT_SECRET: Joi.string().required(),
  KAKAO_CALLBACK_URL: Joi.string().required(),
  NAVER_CLIENT_ID: Joi.string().required(),
  NAVER_CLIENT_SECRET: Joi.string().required(),
  NAVER_CALLBACK_URL: Joi.string().required(),
  SOCIAL_FRONTEND_URL: Joi.string().required(),
  MAILER_HOST: Joi.string().required(),
  MAILER_PORT: Joi.number().required(),
  MAILER_USER: Joi.string().required(),
  MAILER_PASSWORD: Joi.string().required(),
  MAILER_TOKEN_TTL: Joi.string().required(),
});

export const ConfigModuleOptions = {
  isGlobal: true,
  load: [config],
  validationSchema,
  validationOptions: {
    allowUnknown: true,
    abortEarly: false,
  },
};
