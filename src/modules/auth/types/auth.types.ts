import { CookieOptions } from 'express';
import { UserRole } from '../../../common/enum/user-role.enum';

export interface JwtTokenResponse {
  accessToken: string;
  refreshToken: string;
  accessOptions: CookieOptions;
  refreshOptions: CookieOptions;
}

export interface LoginResponse {
  message: string;
  user: {
    id: string;
    email: string;
    nickname: string;
    name: string;
    role: UserRole;
    isProfileComplete: boolean;
    profileId?: string;
  };
}
