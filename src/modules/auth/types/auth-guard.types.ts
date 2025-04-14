import { UserRole } from 'src/common/enum/user-role.enum';
import { Request } from 'express';

export const TOKEN_ERROR_TYPES = {
  EXPIRED: 'TOKEN_EXPIRED',
  INVALID: 'TOKEN_INVALID',
  FORMAT_ERROR: 'TOKEN_FORMAT_ERROR',
  TYPE_ERROR: 'TOKEN_TYPE_ERROR',
} as const;

export type TokenErrorType =
  (typeof TOKEN_ERROR_TYPES)[keyof typeof TOKEN_ERROR_TYPES];

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  type: string;
  iat: number;
  exp: number;
}

export interface RequestWithAuth extends Request {
  user?: JwtPayload;
  tokenExpired?: boolean;
  tokenInvalid?: boolean;
  tokenError?: string;
  tokenErrorType?: TokenErrorType;
}
