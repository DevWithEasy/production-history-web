"use client";

import { Product } from "@/types/Product.Types";
import Firebase from "@/utils/firebase";
import { db } from "@/utils/firebaseConfig";
import { getPeriod } from "@/utils/storage";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";

interface Section {
  id: string;
  name: string;
}

type ProductWithId = Product & { id: string };

export default function ProductManager() {
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

  const [sections, setSections] = useState<Section[]>([]);
  const [section, setSection] = useState("");
  const [products, setProducts] = useState<ProductWithId[]>([]);
  const [edit, setEdit] = useState<ProductWithId | null>(null);

  const [newInfo, setNewInfo] = useState({ name: "", unit: "", value: 0 });

  // load sections
  useEffect(() => {
    Firebase.getDocuments<{ name: string }>("sections").then((data) => {
      setSections(data);
      setSection(data[0].id);
    });
  }, []);

  // load products
  useEffect(() => {
    if (!section) {
      setProducts([]);
      return;
    }

    Firebase.getFindDocuments<Product>(
      `production/${year}/months/${monthName}/products`,
      "section",
      section
    ).then(setProducts);
  }, [section, year, monthName]);

  // 🔄 UPDATE PRODUCT (both places)
  const saveUpdate = async () => {
    if (!edit) return;

    const payload = {
      name: edit.name,
      code: edit.code,
      sku: edit.sku,
      price: edit.price,
      infos: edit.infos,
    };

    await updateDoc(doc(db, "products", edit.id), payload);
    await updateDoc(
      doc(
        db,
        "production",
        year.toString(),
        "months",
        monthName,
        "products",
        edit.id
      ),
      payload
    );

    setProducts((p) => p.map((x) => (x.id === edit.id ? edit : x)));
    setEdit(null);
  };

  // ❌ DELETE PRODUCT (both places)
  const deleteProduct = async (id: string) => {
    if (!confirm("Delete product?")) return;

    await deleteDoc(doc(db, "products", id));
    await deleteDoc(
      doc(
        db,
        "production",
        year.toString(),
        "months",
        monthName,
        "products",
        id
      )
    );

    setProducts((p) => p.filter((x) => x.id !== id));
  };

  // ➕ ADD INFO FIELD TO ALL PRODUCTS OF SECTION (production only)
  const addInfoToSection = async () => {
    const snap = await getDocs(
      query(
        collection(
          db,
          "production",
          year.toString(),
          "months",
          monthName,
          "products"
        ),
        where("section", "==", section)
      )
    );

    for (const d of snap.docs) {
      const infos = [...(d.data().infos || []), newInfo];
      await updateDoc(d.ref, { infos });
    }

    setProducts((p) =>
      p.map((x) =>
        x.section === section ? { ...x, infos: [...x.infos, newInfo] } : x
      )
    );

    setNewInfo({ name: "", unit: "", value: 0 });
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <h2 className="text-xl font-semibold">
        Product Manager ({monthName} {year})
      </h2>

      {/* Section select */}
      <select
        value={section}
        onChange={(e) => setSection(e.target.value)}
        className="border p-2"
      >
        <option value="">Select Section</option>
        {sections.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      {/* Add Info */}
      {section && (
        <div className="border p-3 space-y-2">
          <h3 className="font-medium">Add Field to Section Products</h3>
          <div className="flex gap-2">
            <input
              placeholder="Name"
              value={newInfo.name}
              onChange={(e) => setNewInfo({ ...newInfo, name: e.target.value })}
              className="border p-2"
            />
            <input
              placeholder="Unit"
              value={newInfo.unit}
              onChange={(e) => setNewInfo({ ...newInfo, unit: e.target.value })}
              className="border p-2"
            />
            <input
              type="number"
              placeholder="Value"
              value={newInfo.value}
              onChange={(e) =>
                setNewInfo({ ...newInfo, value: Number(e.target.value) })
              }
              className="border p-2"
            />
            <button
              onClick={addInfoToSection}
              className="bg-black text-white px-4"
            >
              Add Field
            </button>
          </div>
        </div>
      )}

      {/* Product List */}
      {products.map((p) => (
        <div key={p.id} className="border p-3 rounded flex justify-between">
          <div>
            <div className="font-medium">
              [{p.code}] {p.name}
            </div>
            <div className="text-sm text-gray-500">
              SKU: {p.sku} | ৳{p.price}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setEdit({ ...p })} className="text-blue-600">
              Update
            </button>
            <button
              onClick={() => deleteProduct(p.id)}
              className="text-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      {/* UPDATE MODAL */}
      {edit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-5 rounded w-6/12 space-y-3">
            <h3 className="font-semibold">Update Product</h3>

            <input
              value={edit.name}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              className="border p-2 w-full"
            />
            <input
              value={edit.code}
              onChange={(e) => setEdit({ ...edit, code: e.target.value })}
              className="border p-2 w-full"
            />
            <input
              value={edit.sku}
              onChange={(e) => setEdit({ ...edit, sku: e.target.value })}
              className="border p-2 w-full"
            />
            <input
              type="number"
              value={edit.price}
              onChange={(e) =>
                setEdit({ ...edit, price: Number(e.target.value) })
              }
              className="border p-2 w-full"
            />

            {/* Infos */}
            {edit.infos.map((info, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={info.name}
                  disabled
                  className="border p-1 w-1/3"
                />
                <input
                  value={info.unit}
                  disabled
                  className="border p-1 w-1/3"
                />
                <input
                  type="number"
                  value={info.value}
                  onChange={(e) => {
                    const infos = [...edit.infos];
                    infos[i].value = Number(e.target.value);
                    setEdit({ ...edit, infos });
                  }}
                  className="border p-1 w-1/3"
                />
              </div>
            ))}

            <div className="flex justify-end gap-2">
              <button onClick={() => setEdit(null)} className="border px-3">
                Cancel
              </button>
              <button onClick={saveUpdate} className="bg-black text-white px-3">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
