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
import { Package, Factory, Tag, Hash, DollarSign, Edit, Trash2, Plus, Save, X, AlertCircle, Loader2, Info } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [newInfo, setNewInfo] = useState({ name: "", unit: "", value: 0 });

  // load sections
  useEffect(() => {
    setLoading(true);
    Firebase.getDocuments<Section>("sections").then((data) => {
      setSections(data);
      if (data.length > 0) {
        setSection(data[0].id);
      }
      setLoading(false);
    });
  }, []);

  // load products
  useEffect(() => {
    if (!section) {
      setProducts([]);
      return;
    }

    setProductsLoading(true);
    Firebase.getFindDocuments<Product>(
      `production/${year}/months/${monthName}/products`,
      "section",
      section
    ).then((data) => {
      setProducts(data);
      setProductsLoading(false);
    }).catch(() => {
      setProductsLoading(false);
    });
  }, [section, year, monthName]);

  // 🔄 UPDATE PRODUCT (both places)
  const saveUpdate = async () => {
    if (!edit) return;

    setLoading(true);
    const payload = {
      name: edit.name,
      code: edit.code,
      sku: edit.sku,
      price: edit.price,
      infos: edit.infos,
    };

    try {
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
      alert("প্রোডাক্ট সফলভাবে আপডেট করা হয়েছে!");
    } catch (error) {
      console.error(error);
      alert("আপডেট করতে সমস্যা হয়েছে!");
    } finally {
      setLoading(false);
    }
  };

  // ❌ DELETE PRODUCT (both places)
  const deleteProduct = async (id: string) => {
    setLoading(true);
    try {
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
      setDeleteConfirm(null);
      alert("প্রোডাক্ট সফলভাবে ডিলিট করা হয়েছে!");
    } catch (error) {
      console.error(error);
      alert("ডিলিট করতে সমস্যা হয়েছে!");
    } finally {
      setLoading(false);
    }
  };

  // ➕ ADD INFO FIELD TO ALL PRODUCTS OF SECTION (production only)
  const addInfoToSection = async () => {
    if (!newInfo.name.trim() || !newInfo.unit.trim()) {
      alert("দয়া করে ফিল্ডের নাম এবং একক পূরণ করুন");
      return;
    }

    setLoading(true);
    try {
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
      alert("নতুন ফিল্ড সব প্রোডাক্টে যোগ করা হয়েছে!");
    } catch (error) {
      console.error(error);
      alert("ফিল্ড যোগ করতে সমস্যা হয়েছে!");
    } finally {
      setLoading(false);
    }
  };

  // ✍️ Handle info value change in edit mode
  const handleEditInfoChange = (index: number, value: number) => {
    if (!edit) return;
    const updatedInfos = [...edit.infos];
    updatedInfos[index].value = value;
    setEdit({ ...edit, infos: updatedInfos });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          {/* Section Selection */}
          <div className="mb-8 space-y-3">
            <label className="block text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Factory className="h-5 w-5 text-purple-600" />
              সেকশন নির্বাচন করুন
            </label>
            {loading ? (
              <div className="flex items-center gap-3 text-gray-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                সেকশন লোড হচ্ছে...
              </div>
            ) : (
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-lg"
              >
                <option value="">সেকশন নির্বাচন করুন</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id} className="font-[family-name:var(--font-tiro-bangla)]">
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Add Info Field Section */}
          {section && (
            <div className="mb-8 bg-gradient-to-r from-green-50 to-white p-6 rounded-xl border border-green-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5 text-green-600" />
                সেকশনের সকল প্রোডাক্টে নতুন ফিল্ড যোগ করুন
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">ফিল্ডের নাম</label>
                  <input
                    placeholder="যেমন: ওজন"
                    value={newInfo.name}
                    onChange={(e) => setNewInfo({ ...newInfo, name: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all font-[family-name:var(--font-tiro-bangla)]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">একক</label>
                  <input
                    placeholder="যেমন: কেজি"
                    value={newInfo.unit}
                    onChange={(e) => setNewInfo({ ...newInfo, unit: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">ডিফল্ট মান</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newInfo.value}
                    onChange={(e) => setNewInfo({ ...newInfo, value: Number(e.target.value) })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={addInfoToSection}
                    disabled={loading}
                    className="w-full py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                    ফিল্ড যোগ করুন
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-600 font-[family-name:var(--font-tiro-bangla)]">
                ⓘ এই ফিল্ড {section} সেকশনের <span className="font-semibold">সকল প্রোডাক্টে</span> যোগ হবে
              </p>
            </div>
          )}

          {/* Product List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">প্রোডাক্ট তালিকা</h3>
              <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                {products.length} টি প্রোডাক্ট
              </span>
            </div>

            {productsLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-[family-name:var(--font-tiro-bangla)]">প্রোডাক্ট লোড হচ্ছে...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-[family-name:var(--font-tiro-bangla)]">এই সেকশনে কোনো প্রোডাক্ট নেই</p>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((p) => (
                  <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-md transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Product Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="bg-blue-100 p-2 rounded-lg">
                            <Package className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800 text-lg font-[family-name:var(--font-tiro-bangla)]">
                              {p.name}
                            </h4>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Hash className="h-4 w-4" /> কোড: {p.code || "N/A"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Tag className="h-4 w-4" /> SKU: {p.sku || "N/A"}
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" /> মূল্য: ৳{p.price}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Additional Info */}
                        {p.infos.length > 0 && (
                          <div className="mt-3 pl-9">
                            <div className="flex flex-wrap gap-3">
                              {p.infos.map((info, i) => (
                                <span key={i} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                                  {info.name}: {info.value} {info.unit}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEdit({ ...p })}
                          className="bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 px-4 py-2 rounded-lg font-medium hover:from-blue-100 hover:to-blue-200 transition-all flex items-center gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          এডিট
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(p.id)}
                          className="bg-gradient-to-r from-red-50 to-red-100 text-red-700 px-4 py-2 rounded-lg font-medium hover:from-red-100 hover:to-red-200 transition-all flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          ডিলিট
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* UPDATE MODAL */}
        {edit && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <Edit className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">প্রোডাক্ট এডিট করুন</h3>
                      <p className="text-gray-600 text-sm font-[family-name:var(--font-tiro-bangla)]">
                        প্রোডাক্টের তথ্য আপডেট করুন
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEdit(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Basic Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">প্রোডাক্ট নাম</label>
                    <input
                      value={edit.name}
                      onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-[family-name:var(--font-tiro-bangla)]"
                      placeholder="প্রোডাক্টের নাম"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">প্রোডাক্ট কোড</label>
                    <input
                      value={edit.code}
                      onChange={(e) => setEdit({ ...edit, code: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                      placeholder="প্রোডাক্ট কোড"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">SKU</label>
                    <input
                      value={edit.sku}
                      onChange={(e) => setEdit({ ...edit, sku: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                      placeholder="স্টক ইউনিট কোড"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">মূল্য (৳)</label>
                    <input
                      type="number"
                      value={edit.price}
                      onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                      placeholder="মূল্য"
                    />
                  </div>
                </div>

                {/* Additional Info Section */}
                {edit.infos.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Info className="h-5 w-5 text-purple-600" />
                      অতিরিক্ত তথ্য
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                      {edit.infos.map((info, i) => (
                        <div key={i} className="grid grid-cols-3 gap-4 items-center">
                          <input
                            value={info.name}
                            disabled
                            className="px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 font-[family-name:var(--font-tiro-bangla)] text-center"
                          />
                          <input
                            value={info.unit}
                            disabled
                            className="px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 text-center"
                          />
                          <input
                            type="number"
                            value={info.value}
                            onChange={(e) => handleEditInfoChange(i, Number(e.target.value))}
                            className="px-3 py-2.5 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-center"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modal Footer */}
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setEdit(null)}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
                  >
                    বাতিল করুন
                  </button>
                  <button
                    onClick={saveUpdate}
                    disabled={loading}
                    className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 ${
                      loading
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        সেভ হচ্ছে...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        পরিবর্তন সেভ করুন
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-red-100 p-3 rounded-full">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">প্রোডাক্ট ডিলিট</h3>
                    <p className="text-gray-600 font-[family-name:var(--font-tiro-bangla)]">
                      আপনি কি নিশ্চিত?
                    </p>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-6 font-[family-name:var(--font-tiro-bangla)]">
                  এই প্রোডাক্ট মাস্টার তালিকা এবং বর্তমান পিরিয়ড থেকে সম্পূর্ণরূপে মুছে যাবে। এই কাজটি পূর্বাবস্থায় ফিরিয়ে আনা যাবে না।
                </p>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
                  >
                    বাতিল করুন
                  </button>
                  <button
                    onClick={() => deleteProduct(deleteConfirm)}
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-medium hover:from-red-700 hover:to-red-800 transition-all flex items-center gap-2"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                    হ্যাঁ, ডিলিট করুন
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}