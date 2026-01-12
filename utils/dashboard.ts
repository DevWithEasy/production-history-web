// utils/dashboard.ts
import { Product } from "@/types/Product.Types";
import { ManPower } from "@/types/Manpower.Types";

/* ================= TOTAL PRODUCT ================= */
export function calcProductTotals(products?: Product[]) {
  if (!Array.isArray(products)) {
    return {
      totalCarton: 0,
      totalBatch: 0,
      totalManpower: 0,
      totalValue: 0,
    };
  }

  let totalCarton = 0;
  let totalBatch = 0;
  let totalManpower = 0;
  let totalValue = 0;

  products.forEach(p => {
    if (!Array.isArray(p.data)) return;

    const carton = p.data.reduce((s, d) => s + (d.carton || 0), 0);
    const batch = p.data.reduce((s, d) => s + (d.batch || 0), 0);
    const manpower = p.data.reduce((s, d) => s + (d.manpower || 0), 0);

    totalCarton += carton;
    totalBatch += batch;
    totalManpower += manpower;
    totalValue += carton * (p.price || 0);
  });

  return { totalCarton, totalBatch, totalManpower, totalValue };
}

/* ================= SECTION WISE ================= */
export function calcSectionWise(products?: Product[]) {
  if (!Array.isArray(products)) return [];

  const map: Record<string, any> = {};

  products.forEach(p => {
    if (!p.section || !Array.isArray(p.data)) return;

    if (!map[p.section]) {
      map[p.section] = {
        section: p.section,
        carton: 0,
        batch: 0,
        manpower: 0,
        value: 0,
      };
    }

    const carton = p.data.reduce((s, d) => s + (d.carton || 0), 0);
    const batch = p.data.reduce((s, d) => s + (d.batch || 0), 0);
    const manpower = p.data.reduce((s, d) => s + (d.manpower || 0), 0);

    map[p.section].carton += carton;
    map[p.section].batch += batch;
    map[p.section].manpower += manpower;
    map[p.section].value += carton * (p.price || 0);
  });

  return Object.values(map);
}

/* ================= FACTORY MANPOWER ================= */
export function calcTotalFactoryManpower(
  manpower?: ManPower | null
) {
  if (!manpower || !Array.isArray(manpower.data)) return 0;

  return manpower.data.reduce(
    (s, d) => s + (d.manpower || 0),
    0
  );
}
