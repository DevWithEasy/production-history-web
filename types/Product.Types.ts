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
    date: number;
    batch: number;
    carton: number;
    manpower: number;
  }[];

  infos: {
    name: string;
    unit: string;
    value: number;
  }[];
}
