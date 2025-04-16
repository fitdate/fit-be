/**
 * 시간 문자열을 초 단위로 변환하는 유틸리티 함수
 * @param timeStr 시간 문자열 (예: '5m', '1h', '30s', '7d')
 * @returns 초 단위의 시간
 */
export function parseTimeToSeconds(timeStr: string): number {
  const unit = timeStr.slice(-1);
  const value = parseInt(timeStr.slice(0, -1));
  
  switch (unit) {
    case 's': 
      return value; // 초
    case 'm': 
      return value * 60; // 분
    case 'h': 
      return value * 60 * 60; // 시간
    case 'd': 
      return value * 60 * 60 * 24; // 일
    default: 
      return 60 * 15; // 기본값 15분
  }
} 
