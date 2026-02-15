"use client";

import { Product } from "@/types/Product.Types";
import Firebase from "@/utils/firebase";
import { getPeriod } from "@/utils/storage";
import {
  DollarSign,
  Factory,
  Hash,
  Info,
  Loader2,
  Package,
  Plus,
  Save,
  Tag,
} from "lucide-react";
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
  const [sectionLoading, setSectionLoading] = useState(true);

  const [form, setForm] = useState({
    section: "",
    name: "",
    sku: "",
    code: "",
    price: "",
  });

  // 🔽 Load sections
  useEffect(() => {
    setSectionLoading(true);
    Firebase.getDocuments<Section>("sections").then((data) => {
      setSections(data);
      if (data.length > 0) {
        setForm((prev) => ({ ...prev, section: data[0].id }));
      }
      setSectionLoading(false);
    });
  }, []);

  // 🔁 Load infos template from existing product (READ ONLY)
  useEffect(() => {
    if (!form.section) {
      setInfos([]);
      return;
    }

    const loadInfos = async () => {
      try {
        const products = await Firebase.getFindDocuments<Product>(
          "products",
          "section",
          form.section,
        );

        if (products.length > 0) {
          setInfos(
            products[0].infos.map((i) => ({
              name: i.name,
              unit: i.unit,
              value: i.value,
            })),
          );
        } else {
          setInfos([]);
        }
      } catch (error) {
        console.error("Error loading product infos:", error);
        setInfos([]);
      }
    };

    loadInfos();
  }, [form.section]);

  // ✍️ form input
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ✍️ ONLY VALUE CHANGE
  const handleInfoValueChange = (index: number, value: string) => {
    const updated = [...infos];
    updated[index].value = Number(value) || 0;
    setInfos(updated);
  };

  // 💾 submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!form.section) {
      alert("দয়া করে একটি সেকশন নির্বাচন করুন");
      return;
    }

    if (!form.code.trim()) {
      alert("দয়া করে কোড নাম লিখুন");
      return;
    }

    if (!form.name.trim()) {
      alert("দয়া করে প্রোডাক্টের নাম লিখুন");
      return;
    }

    if (!form.price || Number(form.price) <= 0) {
      alert("দয়া করে একটি বৈধ মূল্য লিখুন");
      return;
    }

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
      name: form.name.trim(),
      sku: form.sku.trim(),
      code: form.code.trim(),
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
      // master collection-এ সেভ করুন
      await Firebase.createDocWithName("products", product.code, product);

      // production collection-এ সেভ করুন
      await Firebase.createDocWithName(
        `production/${year}/months/${monthName}/products`,
        product.name,
        product,
      );

      alert("প্রোডাক্ট সফলভাবে যোগ করা হয়েছে!");

      // ফর্ম রিসেট করুন
      setForm({
        section: sections.length > 0 ? sections[0].id : "",
        name: "",
        sku: "",
        code: "",
        price: "",
      });
      setInfos([]);
    } catch (err) {
      console.error(err);
      alert("প্রোডাক্ট যোগ করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-gray-50 p-4 md:p-6 font-(family-name:--font-tiro-bangla)">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-600 p-3 rounded-xl">
              <Package className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                নতুন প্রোডাক্ট যোগ করুন
              </h1>
              <p className="text-gray-600">
                প্রোডাকশন সিস্টেমে নতুন প্রোডাক্ট যুক্ত করুন
              </p>
            </div>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section Selection */}
            <div className="space-y-3">
              <label className="block text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Factory className="h-5 w-5 text-blue-600" />
                সেকশন নির্বাচন করুন
              </label>
              {sectionLoading ? (
                <div className="flex items-center gap-3 text-gray-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  সেকশন লোড হচ্ছে...
                </div>
              ) : (
                <select
                  name="section"
                  value={form.section}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg"
                  required
                >
                  <option value="">সেকশন নির্বাচন করুন</option>
                  {sections.map((s) => (
                    <option
                      key={s.id}
                      value={s.id}
                      className="font-[family-name:var(--font-tiro-bangla)]"
                    >
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Basic Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Name */}
              <div className="space-y-3">
                <label className="block text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  প্রোডাক্টের নাম
                </label>
                <input
                  name="name"
                  placeholder="প্রোডাক্টের সম্পূর্ণ নাম লিখুন"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>

              {/* SKU */}
              <div className="space-y-3">
                <label className="block text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Tag className="h-5 w-5 text-green-600" />
                  SKU (স্টক ইউনিট কোড)
                </label>
                <input
                  name="sku"
                  placeholder="যেমন: BISC-001"
                  value={form.sku}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                />
              </div>

              {/* Code */}
              <div className="space-y-3">
                <label className="block text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Hash className="h-5 w-5 text-purple-600" />
                  প্রোডাক্ট কোড
                </label>
                <input
                  name="code"
                  placeholder="প্রোডাক্ট কোড লিখুন"
                  value={form.code}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                />
              </div>

              {/* Price */}
              <div className="space-y-3">
                <label className="block text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-amber-600" />
                  মূল্য (৳)
                </label>
                <input
                  type="number"
                  name="price"
                  placeholder="প্রোডাক্টের মূল্য লিখুন"
                  value={form.price}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            {/* Additional Information */}
            {infos.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl border border-blue-200">
                <div className="flex items-center gap-3 mb-6">
                  <Info className="h-6 w-6 text-blue-600" />
                  <h3 className="text-xl font-bold text-gray-800">
                    অতিরিক্ত তথ্য
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 bg-blue-100 p-3 rounded-lg">
                    <div className="font-semibold text-blue-800 text-center">
                      নাম
                    </div>
                    <div className="font-semibold text-blue-800 text-center">
                      একক
                    </div>
                    <div className="font-semibold text-blue-800 text-center">
                      মান
                    </div>
                  </div>

                  {infos.map((info, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-3 gap-4 items-center bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                    >
                      <input
                        value={info.name}
                        disabled
                        className="px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-center"
                      />
                      <input
                        value={info.unit}
                        disabled
                        className="px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-center"
                      />
                      <input
                        type="number"
                        value={info.value}
                        onChange={(e) =>
                          handleInfoValueChange(i, e.target.value)
                        }
                        className="px-3 py-2.5 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center"
                        placeholder="মান লিখুন"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading || !form.section}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-3 ${
                  loading || !form.section
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:shadow-lg"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    সংরক্ষণ হচ্ছে...
                  </>
                ) : (
                  <>
                    <Save className="h-6 w-6" />
                    প্রোডাক্ট যোগ করুন
                  </>
                )}
              </button>

              {/* Help Text */}
              <p className="mt-4 text-sm text-gray-600 text-center">
                ⓘ এই প্রোডাক্ট মাস্টার তালিকা এবং বর্তমান পিরিয়ডের প্রোডাকশন
                ডাটাবেজে সংরক্ষণ হবে
              </p>
            </div>
          </form>
        </div>

        {/* Information Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-green-50 to-white p-6 rounded-xl border border-green-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-bold text-gray-800">মাস্টার তালিকা</h4>
            </div>
            <p className="text-gray-600 text-sm">
              প্রোডাক্ট মাস্টার তালিকায় সংরক্ষণ হবে এবং সব পিরিয়ডে ব্যবহার করা
              যাবে
            </p>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-white p-6 rounded-xl border border-purple-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Factory className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-bold text-gray-800">বর্তমান পিরিয়ড</h4>
            </div>
            <p className="text-gray-600 text-sm">
              বর্তমান পিরিয়ডের প্রোডাকশন ডাটাবেজে স্বয়ংক্রিয়ভাবে যোগ হবে
            </p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl border border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Plus className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-bold text-gray-800">দ্রুত প্রোডাকশন</h4>
            </div>
            <p className="text-gray-600 text-sm">
              নতুন প্রোডাক্ট যোগ করার পরই দৈনিক প্রোডাকশন এন্ট্রি শুরু করা যাবে
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
