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
