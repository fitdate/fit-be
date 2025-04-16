export interface GenderStatistics {
  male: number;
  female: number;
  other: number;
  total: number;
}

export interface AgeGroupStatistics {
  '10대': number;
  '20대': number;
  '30대': number;
  '40대': number;
  '50대 이상': number;
  total: number;
}

export interface LocationStatistics {
  [location: string]: number;
  total: number;
}
