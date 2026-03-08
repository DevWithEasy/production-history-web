"use client";

import { Product } from "@/types/Product.Types";
import Firebase from "@/utils/firebase";
import { getPeriod, setPeriod } from "@/utils/storage";
import { AlertTriangle, Calendar, CalendarDays, CheckCircle, Clock, FilePlus, FolderPlus, Loader2, PlusCircle, Users } from "lucide-react";
import { useEffect, useState } from "react";

type Section = {
  id: string;
  name: string;
};

export default function CreatePeriod() {
  const years = Array.from({ length: 5 }, (_, i) => 2026 + i);

  const months = [
    { name: "জানুয়ারি", value: 1, en: "January" },
    { name: "ফেব্রুয়ারি", value: 2, en: "February" },
    { name: "মার্চ", value: 3, en: "March" },
    { name: "এপ্রিল", value: 4, en: "April" },
    { name: "মে", value: 5, en: "May" },
    { name: "জুন", value: 6, en: "June" },
    { name: "জুলাই", value: 7, en: "July" },
    { name: "আগস্ট", value: 8, en: "August" },
    { name: "সেপ্টেম্বর", value: 9, en: "September" },
    { name: "অক্টোবর", value: 10, en: "October" },
    { name: "নভেম্বর", value: 11, en: "November" },
    { name: "ডিসেম্বর", value: 12, en: "December" },
  ];

  const [period, setPeriodState] = useState(() => {
    if (typeof window === "undefined") {
      return { year: years[0], month: 1 };
    }
    return getPeriod();
  });

  const [isPeriodExist, setIsPeriodExist] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  const { year, month } = period;
  const selectedMonth = months[month - 1];

  useEffect(() => {
    setPeriod(period);

    const checkPeriod = async () => {
      setLoading(true);
      const exists = await Firebase.isProductsCollectionExists(year, selectedMonth.en);
      setIsPeriodExist(exists);
      setLoading(false);
    };
    
    checkPeriod();
    
    Firebase.getDocuments<Section>("sections")
      .then(setSections)
      .catch(console.error);
  }, [year, month]);

  async function createPeriod() {
    setCreating(true);
    try {
      /* ---------- 1. Copy products ---------- */
      const products = await Firebase.getDocuments<Product>("products");

      for (const product of products) {
        await Firebase.createDocWithName(
          `production/${year}/months/${selectedMonth.en}/products`,
          product.code,
          product
        );
      }

      /* ---------- 2. Build dynamic section fields ---------- */
      const sectionFields = sections.reduce((acc, section) => {
        acc[section.id] = 0;
        return acc;
      }, {} as Record<string, number>);

      /* ---------- 3. Create manpower month ---------- */
      await Firebase.createDocWithName(`manpowers/${year}/months`, selectedMonth.en, {
        data: Array.from({ length: 31 }, (_, i) => ({
          date: i + 1,
          ...sectionFields,
          total_manpower: 0,
        })),
      });

      setIsPeriodExist(true);
      alert(`${selectedMonth.name} ${year} পিরিয়ড সফলভাবে তৈরি হয়েছে!`);
    } catch (error) {
      console.error(error);
      alert("পিরিয়ড তৈরি করতে সমস্যা হয়েছে!");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 rounded-xl">
              <CalendarDays className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">নতুন পিরিয়ড তৈরি</h1>
              <p className="text-gray-600 font-[family-name:var(--font-tiro-bangla)]">
                নতুন মাসের জন্য প্রোডাক্ট ও ম্যানপাওয়ার ডাটা কপি করুন
              </p>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <div className="space-y-8">
            {/* Period Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Year Selection */}
              <div className="space-y-3">
                <label className="block text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                  বছর নির্বাচন
                </label>
                <select
                  value={year}
                  onChange={(e) =>
                    setPeriodState({ ...period, year: Number(e.target.value) })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-lg"
                >
                  {years.map((y) => (
                    <option key={y} value={y} className="text-lg">
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Selection */}
              <div className="space-y-3">
                <label className="block text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  মাস নির্বাচন
                </label>
                <select
                  value={month}
                  onChange={(e) =>
                    setPeriodState({ ...period, month: Number(e.target.value) })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-lg font-[family-name:var(--font-tiro-bangla)]"
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Period Display */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">নির্বাচিত পিরিয়ড</h3>
                  <div className="flex items-center gap-3">
                    <div className="bg-white px-4 py-2 rounded-lg border border-indigo-200">
                      <span className="text-2xl font-bold text-indigo-700">
                        {selectedMonth.name} {year}
                      </span>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      isPeriodExist 
                        ? "bg-green-100 text-green-800" 
                        : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {isPeriodExist ? "তৈরি হয়েছে" : "তৈরি হয়নি"}
                    </div>
                  </div>
                </div>
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                ) : isPeriodExist ? (
                  <CheckCircle className="h-10 w-10 text-green-500" />
                ) : (
                  <FilePlus className="h-10 w-10 text-yellow-500" />
                )}
              </div>

              {/* Directory Info */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600 font-medium">ডাটাবেজ পাথ:</p>
                <div className="bg-gray-800 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <span className="text-green-400">production/</span>
                  <span className="text-yellow-300">{year}</span>
                  <span className="text-green-400">/months/</span>
                  <span className="text-cyan-300">{selectedMonth.en}</span>
                  <span className="text-green-400">/products</span>
                </div>
              </div>
            </div>

            {/* Action Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${isPeriodExist ? "bg-green-100" : "bg-yellow-100"}`}>
                  {isPeriodExist ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <PlusCircle className="h-6 w-6 text-yellow-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {isPeriodExist ? "পিরিয়ড তৈরি হয়েছে" : "পিরিয়ড তৈরি করুন"}
                  </h3>
                  <p className="text-gray-600 font-[family-name:var(--font-tiro-bangla)]">
                    {isPeriodExist 
                      ? "এই পিরিয়ডের জন্য প্রোডাক্ট ও ম্যানপাওয়ার ডাটা ইতিমধ্যেই তৈরি আছে।"
                      : "নতুন পিরিয়ড তৈরি করতে নিচের বাটনে ক্লিক করুন।"
                    }
                  </p>
                </div>
              </div>

              {!isPeriodExist && (
                <button
                  onClick={createPeriod}
                  disabled={creating}
                  className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-3 ${
                    creating
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg"
                  }`}
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin" />
                      তৈরি হচ্ছে...
                    </>
                  ) : (
                    <>
                      <FolderPlus className="h-6 w-6" />
                      পিরিয়ড তৈরি করুন
                    </>
                  )}
                </button>
              )}
            </div>

            {/* What Will Be Created */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">কি তৈরি হবে?</h4>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg mt-1">
                    <FilePlus className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-800">প্রোডাক্ট কপি</h5>
                    <p className="text-gray-600 text-sm font-[family-name:var(--font-tiro-bangla)]">
                      মাস্টার তালিকা থেকে সব প্রোডাক্ট নতুন পিরিয়ডে কপি করা হবে
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 p-2 rounded-lg mt-1">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-800">ম্যানপাওয়ার টেমপ্লেট</h5>
                    <p className="text-gray-600 text-sm font-[family-name:var(--font-tiro-bangla)]">
                      ৩১ দিনের জন্য ম্যানপাওয়ার টেমপ্লেট তৈরি হবে
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-purple-100 p-2 rounded-lg mt-1">
                    <FolderPlus className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-800">স্ট্রাকচার</h5>
                    <p className="text-gray-600 text-sm font-[family-name:var(--font-tiro-bangla)]">
                      ডাটাবেজে নতুন ফোল্ডার স্ট্রাকচার তৈরি হবে
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning/Info Section */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl border border-yellow-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">গুরুত্বপূর্ণ তথ্য</h4>
                  <ul className="space-y-2 text-sm text-gray-700 font-[family-name:var(--font-tiro-bangla)]">
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 mt-1">•</span>
                      পিরিয়ড একবার তৈরি হলে তা ডিলিট করা যাবে না
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 mt-1">•</span>
                      প্রতিটি মাসের জন্য আলাদা পিরিয়ড তৈরি করতে হবে
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 mt-1">•</span>
                      মাস্টার প্রোডাক্টে পরিবর্তন হলে নতুন পিরিয়ডে স্বয়ংক্রিয়ভাবে আপডেট হবে না
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 mt-1">•</span>
                      পিরিয়ড তৈরি করার আগে মাস্টার প্রোডাক্ট লিস্ট চেক করুন
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-indigo-50 to-white p-6 rounded-xl border border-indigo-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-indigo-100 p-3 rounded-lg">
                <FilePlus className="h-6 w-6 text-indigo-600" />
              </div>
              <h4 className="font-bold text-gray-800">ডাটা কপি</h4>
            </div>
            <p className="text-gray-600 text-sm font-[family-name:var(--font-tiro-bangla)]">
              মাস্টার প্রোডাক্ট লিস্ট থেকে নতুন মাসে সব প্রোডাক্ট কপি করা হবে
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-white p-6 rounded-xl border border-purple-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-bold text-gray-800">মাসিক স্ট্রাকচার</h4>
            </div>
            <p className="text-gray-600 text-sm font-[family-name:var(--font-tiro-bangla)]">
              প্রতিটি মাসের জন্য আলাদা ডাটাবেজ স্ট্রাকচার তৈরি হবে
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl border border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-bold text-gray-800">ম্যানপাওয়ার</h4>
            </div>
            <p className="text-gray-600 text-sm font-[family-name:var(--font-tiro-bangla)]">
              ৩১ দিনের ম্যানপাওয়ার এন্ট্রি টেমপ্লেট তৈরি হবে
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}