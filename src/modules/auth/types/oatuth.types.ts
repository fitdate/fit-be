import { UserRole } from 'src/common/enum/user-role.enum';

export interface GoogleProfileInfo {
  emails?: Array<{ value: string; verified?: boolean }>;
  photos?: Array<{ value: string }>;
  displayName?: string;
  name?: {
    familyName?: string;
    givenName?: string;
  };
}

export interface GoogleUser {
  email: string;
  name?: string;
  nickname?: string;
  profileImage?: string | null;
}

export enum AuthProvider {
  EMAIL = 'email',
  GOOGLE = 'google',
  KAKAO = 'kakao',
  NAVER = 'naver',
}

// 소셜 로그인 사용자 정보 타입
export interface SocialUserInfo {
  id?: string;
  email: string;
  name?: string;
  role?: UserRole;
  isProfileComplete?: boolean;
  authProvider: AuthProvider;
}

export interface SocialTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

export interface KakaoUserInfo {
  id: number;
  kakao_account: {
    email: string;
    email_verified: boolean;
    profile: {
      nickname: string;
      profile_image_url: string;
    };
  };
}

export interface NaverUserInfo {
  response: {
    id: string;
    email: string;
    name: string;
    nickname: string;
    profile_image: string;
  };
}

export interface SocialLoginResponse {
  redirectUrl: string;
  user: {
    id: string;
    email: string;
    isProfileComplete: boolean;
  };
}
