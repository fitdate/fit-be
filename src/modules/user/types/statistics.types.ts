export interface AgeGroupStats {
  count: number;
  percentage: number;
}

export interface AgeGroups {
  '10대': AgeGroupStats;
  '20대': AgeGroupStats;
  '30대': AgeGroupStats;
  '40대': AgeGroupStats;
  '50대 이상': AgeGroupStats;
}

export interface GenderStatistics {
  total: number;
  male: AgeGroupStats;
  female: AgeGroupStats;
}

export interface AgeGroupStatistics {
  total: number;
  ageGroups: AgeGroups;
}

export interface LocationStats {
  sido: string;
  sigungu: string;
  count: number;
  percentage: number;
}

export interface LocationStatistics {
  total: number;
  locations: LocationStats[];
}
