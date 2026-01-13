"use client";

import Firebase from "@/utils/firebase";
import { db } from "@/utils/firebaseConfig";
import { getPeriod, setPeriod } from "@/utils/storage";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

interface Product {
  id: string;
  name: string;
}

export default function App() {
  const saved = getPeriod();

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

  const [year, setYear] = useState<number>(saved.year);
  const [month, setMonth] = useState<number>(saved.month);

  const [products, setProducts] = useState<Product[]>([]);
  const [showWarning, setShowWarning] = useState(false);
  const [loading, setLoading] = useState(false);

  // save period
  useEffect(() => {
    setPeriod({ year, month });
  }, [year, month]);

  // check + load products
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setProducts([]);
      setShowWarning(false);

      const monthName = months[month - 1].name;

      const exists = await Firebase.isProductsCollectionExists(year, monthName);

      if (!exists) {
        setShowWarning(true);
        setLoading(false);
        return;
      }

      const data = await Firebase.getProductsByPeriod<Product>(year, monthName);

      setProducts(data);
      setLoading(false);
    };

    run();
  }, [year, month]);

  return (
    <div className="p-4 space-y-4 max-w-md">
      <h2 className="text-lg font-semibold">Select Period</h2>

      {/* Year */}
      <div>
        <label className="block mb-1 text-sm">Year</label>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
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
          onChange={(e) => setMonth(Number(e.target.value))}
          className="w-full border p-2 rounded"
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div className="text-sm text-gray-600">
        Selected:{" "}
        <strong>
          {month}/{year}
        </strong>
      </div>

      {/* Loading */}
      {loading && <p className="text-sm">Loading...</p>}
      {/* Products */}
      {/* {!loading && products.length > 0 && (
        <div className="border rounded p-3 space-y-2">
          <h3 className="font-medium">Products</h3>
          {products.map((p) => (
            <div key={p.id} className="text-sm">
              • {p.name}
            </div>
          ))}
        </div>
      )} */}

      {/* Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-5 rounded w-80 space-y-3">
            <h3 className="font-semibold text-red-600">Warning</h3>
            <p className="text-sm">
              This period has no products collection.
              <br />
              Please create products first.
            </p>
            <button
              onClick={() => setShowWarning(false)}
              className="w-full border p-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
