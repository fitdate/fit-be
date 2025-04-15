export const MBTI_VALUES = [
  'ISTJ',
  'ISFJ',
  'INFJ',
  'INTJ',
  'ISTP',
  'ISFP',
  'INFP',
  'INTP',
  'ESTP',
  'ESFP',
  'ENFP',
  'ENTP',
  'ESTJ',
  'ESFJ',
  'ENFJ',
  'ENTJ',
] as const;

export type MbtiType = (typeof MBTI_VALUES)[number];

export interface MbtiList {
  [key: string]: MbtiType;
}

export interface MbtiRecommendList {
  [key: string]: MbtiType[];
}

export const MBTI_LIST: MbtiList = {
  ISTJ: 'ISTJ',
  ISFJ: 'ISFJ',
  INFJ: 'INFJ',
  INTJ: 'INTJ',
  ISTP: 'ISTP',
  ISFP: 'ISFP',
  INFP: 'INFP',
  INTP: 'INTP',
  ESTP: 'ESTP',
  ESFP: 'ESFP',
  ENFP: 'ENFP',
  ENTP: 'ENTP',
  ESTJ: 'ESTJ',
  ESFJ: 'ESFJ',
  ENFJ: 'ENFJ',
  ENTJ: 'ENTJ',
};

export const MBTI_RECOMMEND_LIST: MbtiRecommendList = {
  ISTJ: ['ENFP', 'ESFP', 'ISFJ', 'ESTJ'],
  ISFJ: ['ESTP', 'ENFP', 'ISTJ', 'ESFJ'],
  INFJ: ['ENTP', 'ENFP', 'ISFP', 'INTP'],
  INTJ: ['ENTP', 'ENFP', 'INFJ', 'ISFJ'],
  ISTP: ['ESFP', 'ESTP', 'ISFP', 'ENFP'],
  ISFP: ['ESTJ', 'ESFP', 'ISFP', 'ENFP'],
  INFP: ['ENFJ', 'ENFP', 'INFJ', 'ISFJ'],
  INTP: ['ENTP', 'INTJ', 'ENFP', 'INFJ'],
  ESTP: ['ISFJ', 'ISTP', 'ESFP', 'ENFP'],
  ESFP: ['ISTJ', 'INFP', 'ISFP', 'ENFP'],
  ENFP: ['INFJ', 'ISFJ', 'ISTJ', 'ENFJ'],
  ENTP: ['INTJ', 'INFJ', 'INFP', 'ENTP'],
  ESTJ: ['ISFP', 'ISTJ', 'ENFJ', 'ESFP'],
  ESFJ: ['INFP', 'ISFP', 'ENFJ', 'ISTJ'],
  ENFJ: ['INFJ', 'ENFP', 'INFP', 'ISFP'],
  ENTJ: ['INTJ', 'ENFJ', 'INTP', 'ENFP'],
};
