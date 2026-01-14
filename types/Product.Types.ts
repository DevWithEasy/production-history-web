export interface Product {
  section: string;
  name: string;
  code: string;
  sku: string;
  price: number;
  opening: number;
  sales_target: number;
  production_target: number;

  data: {
    manpower: number;
    manpower: number;
    date: number;
    batch: number;
    carton: number;
  }[];

  infos: {
    name: string;
    unit: string;
    value: number;
  }[];
}
