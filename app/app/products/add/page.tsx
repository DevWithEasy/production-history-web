"use client";

import { Product } from "@/types/Product.Types";
import Firebase from "@/utils/firebase";
import { getPeriod } from "@/utils/storage";
import { useEffect, useState } from "react";

interface Section {
  id: string;
  name: string;
}

interface Info {
  name: string;
  unit: string;
  value: number;
}

export default function ProductAdd() {
  const [sections, setSections] = useState<Section[]>([]);
  const [infos, setInfos] = useState<Info[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    section: "",
    name: "",
    sku: "",
    code: "",
    price: "",
  });

  // 🔽 Load sections
  useEffect(() => {
    Firebase.getDocuments<{ name: string }>("sections").then((data) => {
      setSections(data);
      setForm({ ...form, section: data[0].id });
    });
  }, []);

  // 🔁 Load infos template from existing product (READ ONLY)
  useEffect(() => {
    if (!form.section) {
      setInfos([]);
      return;
    }

    const loadInfos = async () => {
      const products = await Firebase.getFindDocuments<Product>(
        "products",
        "section",
        form.section
      );

      if (products.length > 0) {
        setInfos(
          products[0].infos.map((i) => ({
            name: i.name,
            unit: i.unit,
            value: i.value,
          }))
        );
      }
    };

    loadInfos();
  }, [form.section]);

  // ✍️ form input
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ✍️ ONLY VALUE CHANGE
  const handleInfoValueChange = (index: number, value: string) => {
    const updated = [...infos];
    updated[index].value = Number(value);
    setInfos(updated);
  };

  // 💾 submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { year, month } = getPeriod();
    const monthName = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ][month - 1];

    const product: Product = {
      section: form.section,
      name: form.name,
      sku: form.sku,
      code: form.code,
      price: Number(form.price),
      opening: 0,
      sales_target: 0,
      production_target: 0,
      data: Array.from({ length: 31 }, (_, i) => ({
        date: i + 1,
        batch: 0,
        carton: 0,
        manpower: 0,
      })),
      infos,
    };

    try {
      // master
      await Firebase.createDocWithName("products", product.name, product);

      // production
      await Firebase.createDocWithName(
        `production/${year}/months/${monthName}/products`,
        product.name,
        product
      );

      alert("Product added successfully");

      setForm({
        section: "",
        name: "",
        sku: "",
        code: "",
        price: "",
      });
      setInfos([]);
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl p-6 space-y-6">
      <h2 className="text-xl font-semibold">Add Product</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section */}
        <select
          name="section"
          value={form.section}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        >
          <option value="">Select section</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <input
          name="name"
          placeholder="Product name"
          value={form.name}
          onChange={handleChange}
          className="border p-2 w-full"
        />

        <input
          name="sku"
          placeholder="SKU"
          value={form.sku}
          onChange={handleChange}
          className="border p-2 w-full"
        />

        <input
          name="code"
          placeholder="Code"
          value={form.code}
          onChange={handleChange}
          className="border p-2 w-full"
        />

        <input
          type="number"
          name="price"
          placeholder="Price"
          value={form.price}
          onChange={handleChange}
          className="border p-2 w-full"
        />

        {/* INFOS (ONLY VALUE EDITABLE) */}
        {infos.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">Product Infos</h3>

            {infos.map((info, i) => (
              <div key={i} className="grid grid-cols-3 gap-2">
                <input
                  value={info.name}
                  disabled
                  className="border p-2 bg-gray-100"
                />
                <input
                  value={info.unit}
                  disabled
                  className="border p-2 bg-gray-100"
                />
                <input
                  type="number"
                  value={info.value}
                  onChange={(e) => handleInfoValueChange(i, e.target.value)}
                  className="border p-2"
                />
              </div>
            ))}
          </div>
        )}

        <button
          disabled={loading}
          className="w-full bg-black text-white p-2 rounded"
        >
          {loading ? "Saving..." : "Add Product"}
        </button>
      </form>
    </div>
  );
}
