interface FestivalItem {
  title: string;
  eventstartdate: string;
  eventenddate: string;
  addr1: string;
  areacode: string;
  firstimage: string;
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
