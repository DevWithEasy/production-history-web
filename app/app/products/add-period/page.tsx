"use client";

import { Product } from "@/types/Product.Types";
import Firebase from "@/utils/firebase";
import { getPeriod, setPeriod } from "@/utils/storage";
import { useEffect, useState } from "react";

type Section = {
  id: string;
  name: string;
};

export default function CreatePeriod() {
  const years = Array.from({ length: 5 }, (_, i) => 2026 + i);

  const months = [
    { name: "January", value: 1 },
    { name: "February", value: 2 },
    { name: "March", value: 3 },
    { name: "April", value: 4 },
    { name: "May", value: 5 },
    { name: "June", value: 6 },
    { name: "July", value: 7 },
    { name: "August", value: 8 },
    { name: "September", value: 9 },
    { name: "October", value: 10 },
    { name: "November", value: 11 },
    { name: "December", value: 12 },
  ];

  const [period, setPeriodState] = useState(() => {
    if (typeof window === "undefined") {
      return { year: years[0], month: 1 };
    }
    return getPeriod();
  });

  const [isPeriodExist, setIsPeriodExist] = useState(false);

  const { year, month } = period;

  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    setPeriod(period);

    const checkPeriod = async () => {
      const monthName = months[month - 1].name;
      const exists = await Firebase.isProductsCollectionExists(year, monthName);
      setIsPeriodExist(exists);
    };
    checkPeriod();
    Firebase.getDocuments<Section>("sections")
      .then(setSections)
      .catch(console.error);
  }, [year, month]);

  async function createPeriod() {
    const monthName = months[month - 1].name;

    /* ---------- 1. Copy products ---------- */
    const products = await Firebase.getDocuments<Product>("products");

    for (const product of products) {
      await Firebase.createDocWithName(
        `production/${year}/months/${monthName}/products`,
        product.name,
        product
      );
    }

    /* ---------- 2. Build dynamic section fields ---------- */
    const sectionFields = sections.reduce((acc, section) => {
      acc[section.id] = 0;
      return acc;
    }, {} as Record<string, number>);

    /* ---------- 3. Create manpower month ---------- */
    await Firebase.createDocWithName(`manpowers/${year}/months`, monthName, {
      data: Array.from({ length: 31 }, (_, i) => ({
        date: i + 1,
        ...sectionFields,
        total_manpower: 0,
      })),
    });

    setIsPeriodExist(true);
  }

  return (
    <div className="p-4 space-y-4 max-w-sm">
      <h2 className="text-lg font-semibold">Select Period</h2>

      {/* Year */}
      <div>
        <label className="block mb-1 text-sm">Year</label>
        <select
          value={year}
          onChange={(e) =>
            setPeriodState({ ...period, year: Number(e.target.value) })
          }
          className="w-full border p-2 rounded"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Month */}
      <div>
        <label className="block mb-1 text-sm">Month</label>
        <select
          value={month}
          onChange={(e) =>
            setPeriodState({ ...period, month: Number(e.target.value) })
          }
          className="w-full border p-2 rounded"
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div className="text-sm">
        <p>
          Selected:{" "}
          <b>
            {months[month - 1].name} {year}
          </b>{" "}
          Directory -
          {`prouction/${year}/months/${months[month - 1].name}/products`}
        </p>
      </div>

      <div className="text-sm">
        Period status:{" "}
        {isPeriodExist ? (
          <span className="text-green-600 font-medium">Products exist</span>
        ) : (
          <button
            onClick={createPeriod}
            className="text-red-600 font-medium border p-2 cursor-pointer"
          >
            Create Products
          </button>
        )}
      </div>
    </div>
  );
}
