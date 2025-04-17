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
