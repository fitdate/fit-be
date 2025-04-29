export interface FestivalItem {
  title: string;
  eventstartdate: string;
  eventenddate: string;
  addr1: string;
  areacode: string;
  firstimage2: string;
  areaCode: string;
}

export interface FestivalResponse {
  response: {
    body: {
      items: {
        item: FestivalItem[];
      };
    };
  };
}

export interface FestivalApiResponse {
  response: {
    body: {
      items: {
        item: Array<{
          title: string;
          eventstartdate: string;
          eventenddate: string;
          addr1: string;
          areacode: string;
          firstimage2: string;
        }>;
      };
    };
  };
}
