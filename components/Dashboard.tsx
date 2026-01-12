"use client";

import { Product } from "@/types/Product.Types";
import { ManPower } from "@/types/Manpower.Types";
import {
  calcProductTotals,
  calcSectionWise,
  calcTotalFactoryManpower,
} from "@/utils/dashboard";

export default function Dashboard({
  products = [],
  prevProducts = [],
  manpower = null,
  prevManpower = null,
}: {
  products?: Product[];
  prevProducts?: Product[];
  manpower?: ManPower | null;
  prevManpower?: ManPower | null;
}) {
  const current = calcProductTotals(products);
  const previous = calcProductTotals(prevProducts);

  const factoryManpower = calcTotalFactoryManpower(manpower);
  const prevFactoryManpower = calcTotalFactoryManpower(prevManpower);

  const sections = calcSectionWise(products);
  const totalValue = current.totalValue;

  const topSections = [...sections]
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  return (
    <div className="space-y-8">

      {/* 1️⃣ OVERALL */}
      <div className="grid grid-cols-2 gap-4">
        <Stat title="Total Production Value" value={`৳ ${current.totalValue}`} />
        <Stat title="Total Factory Manpower" value={factoryManpower} />
      </div>

      {/* 2️⃣ SECTION WISE */}
      <div>
        <h3 className="font-semibold mb-2">Section Wise Production</h3>

        {sections.map(s => (
          <div key={s.section} className="border p-3 rounded mb-2">
            <div className="font-medium capitalize">{s.section}</div>

            <div className="text-sm">
              Value: ৳ {s.value} (
              {totalValue > 0
                ? ((s.value / totalValue) * 100).toFixed(1)
                : "0.0"}
              %)
            </div>

            <div className="text-sm">
              Batch: {s.batch} | Carton: {s.carton} | Manpower: {s.manpower}
            </div>
          </div>
        ))}
      </div>

      {/* 3️⃣ TOP SECTIONS */}
      <div>
        <h3 className="font-semibold mb-2">Top 3 Sections</h3>
        {topSections.map((s, i) => (
          <div key={s.section} className="text-sm">
            {i + 1}. {s.section} – ৳ {s.value}
          </div>
        ))}
      </div>

      {/* 4️⃣ MONTH COMPARISON */}
      <div>
        <h3 className="font-semibold mb-2">Month Comparison</h3>

        <Compare
          label="Production Value"
          current={current.totalValue}
          previous={previous.totalValue}
        />
        <Compare
          label="Batch"
          current={current.totalBatch}
          previous={previous.totalBatch}
        />
        <Compare
          label="Carton"
          current={current.totalCarton}
          previous={previous.totalCarton}
        />
        <Compare
          label="Factory Manpower"
          current={factoryManpower}
          previous={prevFactoryManpower}
        />
      </div>
    </div>
  );
}

/* ================= UI HELPERS ================= */

function Stat({ title, value }: { title: string; value: any }) {
  return (
    <div className="border p-4 rounded">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function Compare({
  label,
  current,
  previous,
}: {
  label: string;
  current: number;
  previous: number;
}) {
  const diff = current - previous;
  return (
    <div className="text-sm">
      {label}: {current}{" "}
      <span className={diff >= 0 ? "text-green-600" : "text-red-600"}>
        ({diff >= 0 ? "+" : ""}
        {diff})
      </span>
    </div>
  );
}
