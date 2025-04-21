import { CookieOptions } from 'express';

export interface JwtTokenResponse {
  accessToken: string;
  refreshToken: string;
  accessOptions: CookieOptions;
  refreshOptions: CookieOptions;
}

export interface LoginResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
}
