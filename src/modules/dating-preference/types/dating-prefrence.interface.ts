export interface DatingPreferenceDto {
  ageMin: number;
  ageMax: number;
  heightMin: number;
  heightMax: number;
  region?: string;
}

export interface UserProfileResponse {
  id: string;
  nickname: string;
  region: string;
  height: number;
  age: number;
  likeCount: number;
  profileImageId: string;
  profileImageUrl: string;
}

export interface DatingPreferenceListResponse {
  users: UserProfileResponse[];
  nextCursor: string | null;
}
