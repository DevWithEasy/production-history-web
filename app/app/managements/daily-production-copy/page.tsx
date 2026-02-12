"use client";

import { Product } from "@/types/Product.Types";
import Firebase from "@/utils/firebase";
import { getPeriod } from "@/utils/storage";
import {
  Calendar,
  CheckCircle,
  CheckSquare,
  Database,
  FileDown,
  FileSpreadsheet,
  FileUp,
  Loader2,
  Package,
  RefreshCw,
  Upload,
  XCircle,
} from "lucide-react";
import { ChangeEvent, useEffect, useState } from "react";
import * as XLSX from "xlsx";

type ProductWithID = Product & {
  id: string;
};

type ExcelRow = {
  code: string;
  name: string;
  carton: number;
};

export default function DailyProductionCopy() {
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [products, setProducts] = useState<ProductWithID[]>([]);
  const [updateProducts, setUpdateProducts] = useState<ProductWithID[]>([]);
  const [date, setDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [showMatchedOnly, setShowMatchedOnly] = useState(false);
  const [updateStats, setUpdateStats] = useState({
    matched: 0,
    updated: 0,
    failed: 0,
    notFound: 0,
  });

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
  const collectionName = `production/${year}/months/${monthName}/products`;

  /* ---------------- Load Products ---------------- */
  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const data = await Firebase.getDocuments<ProductWithID>(collectionName);
      console.log("Products loaded:", data.length);
      setProducts(data);
    } catch (err) {
      console.error("Error loading products:", err);
      alert("প্রোডাক্ট লোড করতে সমস্যা হয়েছে");
    } finally {
      setProductsLoading(false);
    }
  };

  /* ---------------- Excel Reader ---------------- */
  const readExcelFile = (file: File) => {
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        if (!e.target?.result) return;

        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
        });

        // Skip header row, get columns: Code, Name, Carton
        const cartonData = rows.slice(1).filter((r) => r[0] && r[2] != null);

        const parsed: ExcelRow[] = [];

        cartonData.forEach((item) => {
          parsed.push({
            code: String(item[0]).trim(),
            name: item[1] ? String(item[1]).trim() : "",
            carton: Math.round(Number(item[2])),
          });
        });

        setExcelData(parsed);

        // Reset update products when new file is uploaded
        setUpdateProducts([]);
        setDate("");

        // Calculate matches
        calculateMatches(parsed);
      } catch (error) {
        console.error(error);
        alert(
          "এক্সেল ফাইল পড়তে সমস্যা হয়েছে। ফাইলটি সঠিক ফরমেটে আছে কিনা চেক করুন।",
        );
      }
    };

    reader.readAsArrayBuffer(file);
  };

  /* ---------------- Calculate Matches ---------------- */
  const calculateMatches = (excelRows: ExcelRow[] = excelData) => {
    let matched = 0;
    let notFound = 0;

    excelRows.forEach((item) => {
      const found = products.find((p) => p.code === item.code);
      if (found) matched++;
      else notFound++;
    });

    setUpdateStats((prev) => ({ ...prev, matched, notFound }));
  };

  /* ---------------- File Change ---------------- */
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert("শুধুমাত্র Excel বা CSV ফাইল আপলোড করুন (.xlsx, .xls, .csv)");
      return;
    }

    setExcelFile(file);
    readExcelFile(file);
  };

  /* ---------------- Update Logic ---------------- */
  const handleUpdate = async () => {
    if (excelData.length === 0) {
      alert("প্রথমে একটি এক্সেল ফাইল আপলোড করুন");
      return;
    }

    if (!date) {
      alert("দয়া করে একটি তারিখ নির্বাচন করুন");
      return;
    }

    if (updateProducts.length === 0) {
      alert("কোন প্রোডাক্ট আপডেটের জন্য প্রস্তুত নেই");
      return;
    }

    const confirmed = window.confirm(
      `আপনি কি ${updateProducts.length} টি প্রোডাক্টের জন্য ${new Date(date).toLocaleDateString("bn-BD")} তারিখের প্রোডাকশন আপডেট করতে চান?`,
    );

    if (!confirmed) return;

    setLoading(true);
    setUpdateStats((prev) => ({ ...prev, updated: 0, failed: 0 }));

    const updates = [];
    let updated = 0;
    let failed = 0;

    for (const item of updateProducts) {
      try {
        updates.push(
          Firebase.updateDocument(collectionName, item.id, {
            data: item.data,
          })
            .then(() => {
              updated++;
              setUpdateStats((prev) => ({ ...prev, updated }));
            })
            .catch((error) => {
              console.error(`Failed to update ${item.code}:`, error);
              failed++;
              setUpdateStats((prev) => ({ ...prev, failed }));
            }),
        );
      } catch (error) {
        console.error(`Error processing ${item.code}:`, error);
        failed++;
        setUpdateStats((prev) => ({ ...prev, failed }));
      }
    }

    await Promise.allSettled(updates);
    setLoading(false);
    await loadProducts();

    alert(
      `আপডেট সম্পন্ন!\n\n` +
        `মোট প্রোডাক্ট: ${updateProducts.length}\n` +
        `সফল আপডেট: ${updated}\n` +
        `ব্যর্থ: ${failed}`,
    );
  };

  /* ---------------- Download Template ---------------- */
  const downloadTemplate = () => {
    // Create template data with headers
    const templateData = [
      ["code", "name", "carton"],
      ["", "", ""],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daily Production");

    // Add column widths
    const wscols = [
      { wch:10 }, // code
      { wch: 35 }, // name
      { wch: 15 }, // carton
    ];
    worksheet["!cols"] = wscols;

    XLSX.writeFile(
      workbook,
      `Daily_Recieved_template_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  /* ---------------- Handle Date Change ---------------- */
  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (excelData.length === 0) {
      alert("প্রথমে একটি এক্সেল ফাইল নির্বাচন করুন");
      return;
    }

    setDate(e.target.value);
    const selectedDate = new Date(e.target.value).getDate();

    const findUpdateItems: ProductWithID[] = [];

    excelData.forEach((excelItem) => {
      const findItem = products.find(
        (product) => product.code === excelItem.code,
      );

      if (!findItem) return;

      // Update the carton value for the selected date
      const updatedData = findItem.data.map((day) =>
        day.date === selectedDate ? { ...day, carton: excelItem.carton } : day,
      );

      findUpdateItems.push({
        ...findItem,
        data: updatedData,
      });
    });

    setUpdateProducts(findUpdateItems);
  };

  /* ---------------- Toggle Matched Only ---------------- */
  const toggleMatchedOnly = () => {
    setShowMatchedOnly(!showMatchedOnly);
  };

  /* ---------------- Filtered Data ---------------- */
  const filteredExcelData = showMatchedOnly
    ? excelData.filter((item) => products.some((p) => p.code === item.code))
    : excelData;

  /* ---------------- Initialize ---------------- */
  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (excelData.length > 0 && products.length > 0) {
      calculateMatches();

      // Clear update products when products change
      if (date) {
        const selectedDate = new Date(date).getDate();
        const findUpdateItems: ProductWithID[] = [];

        excelData.forEach((excelItem) => {
          const findItem = products.find(
            (product) => product.code === excelItem.code,
          );
          if (!findItem) return;

          const updatedData = findItem.data.map((day) =>
            day.date === selectedDate
              ? { ...day, carton: excelItem.carton }
              : day,
          );

          findUpdateItems.push({
            ...findItem,
            data: updatedData,
          });
        });

        setUpdateProducts(findUpdateItems);
      }
    }
  }, [products, excelData]);

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-linear-to-r from-indigo-600 to-blue-600 p-3 rounded-xl shadow-lg">
                <Package className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  দৈনিক প্রোডাকশন কপি
                </h1>
                <p className="text-gray-600 mt-1">
                  এক্সেল ফাইল থেকে কার্টন সংখ্যা পড়ে নির্দিষ্ট তারিখের
                  প্রোডাকশন আপডেট করুন
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={loadProducts}
                disabled={productsLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
              >
                <RefreshCw
                  className={`h-5 w-5 ${productsLoading ? "animate-spin" : ""}`}
                />
                {productsLoading ? "লোড হচ্ছে..." : "রিফ্রেশ"}
              </button>
            </div>
          </div>

          {/* Period Info */}
          <div className="bg-linear-to-r from-blue-100 to-indigo-100 p-4 rounded-xl border border-blue-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="font-bold text-blue-800">বর্তমান পিরিয়ড</h3>
                  <p className="text-blue-700">
                    {monthName} {year}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-800">
                  {products.length}
                </div>
                <div className="text-blue-700 text-sm">মোট প্রোডাক্ট</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Two Columns Equal Height */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - File Upload & Controls */}
          <div className="lg:w-1/2 flex flex-col">
            {/* File Upload Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Upload className="h-6 w-6 text-blue-600" />
                  এক্সেল ফাইল আপলোড
                </h2>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <FileDown className="h-4 w-4" />
                  টেমপ্লেট
                </button>
              </div>

              {/* File Upload Area */}
              <div className="mb-6">
                <div className="border-3 border-dashed border-gray-300 rounded-2xl p-8 text-center transition-all hover:border-blue-400 hover:bg-blue-50">
                  <FileSpreadsheet className="h-14 w-14 text-blue-400 mx-auto mb-4" />
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="excelFile"
                  />
                  <label
                    htmlFor="excelFile"
                    className="inline-block cursor-pointer bg-linear-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                  >
                    এক্সেল ফাইল নির্বাচন করুন
                  </label>
                  <p className="text-gray-600 mt-4">
                    {excelFile ? (
                      <span className="text-green-600 font-medium">
                        <FileUp className="h-4 w-4 inline mr-2" />
                        {excelFile.name} ({excelData.length} টি রেকর্ড)
                      </span>
                    ) : (
                      "কোন ফাইল নির্বাচন করা হয়নি"
                    )}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    .xlsx, .xls, বা .csv ফরমেট সাপোর্টেড
                  </p>
                </div>
              </div>

              {/* Date Selection */}
              <div className="mb-6">
                <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                  তারিখ নির্বাচন করুন
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={handleDateChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  disabled={excelData.length === 0}
                />
                {!date && excelData.length > 0 && (
                  <p className="text-amber-600 text-sm mt-2">
                    * আপডেট করার জন্য একটি তারিখ নির্বাচন করুন
                  </p>
                )}
              </div>

              {/* Stats Card - Integrated */}
              {excelData.length > 0 && (
                <div className="bg-linear-to-r from-gray-50 to-white p-4 rounded-xl border border-gray-200 mb-6">
                  <h3 className="text-md font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    ডাটা বিশ্লেষণ
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 p-3 rounded-xl text-center border border-blue-100">
                      <div className="text-xl font-bold text-blue-700">
                        {excelData.length}
                      </div>
                      <div className="text-xs text-blue-600">এক্সেল রো</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-xl text-center border border-green-100">
                      <div className="text-xl font-bold text-green-700">
                        {updateStats.matched}
                      </div>
                      <div className="text-xs text-green-600">মিলেছে</div>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-xl text-center border border-amber-100">
                      <div className="text-xl font-bold text-amber-700">
                        {updateStats.notFound}
                      </div>
                      <div className="text-xs text-amber-600">
                        খুঁজে পাওয়া যায়নি
                      </div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-xl text-center border border-purple-100">
                      <div className="text-xl font-bold text-purple-700">
                        {updateProducts.length}
                      </div>
                      <div className="text-xs text-purple-600">
                        আপডেটের জন্য প্রস্তুত
                      </div>
                    </div>
                  </div>

                  {/* Matched Only Toggle */}
                  <div className="mt-3 flex justify-end">
                    <label className="flex items-center gap-2 text-sm text-gray-700 bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={showMatchedOnly}
                        onChange={toggleMatchedOnly}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-(family-name:--font-tiro-bangla)">
                        শুধু ম্যাচ করা আইটেম দেখুন
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Update Button */}
              <div className="mt-auto pt-4">
                <button
                  onClick={handleUpdate}
                  disabled={
                    loading ||
                    excelData.length === 0 ||
                    !date ||
                    updateProducts.length === 0
                  }
                  className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg ${
                    loading ||
                    excelData.length === 0 ||
                    !date ||
                    updateProducts.length === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-linear-to-r from-green-600 to-emerald-700 text-white hover:from-green-700 hover:to-emerald-800 hover:shadow-xl transform hover:-translate-y-0.5"
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin" />
                      আপডেট হচ্ছে...
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-6 w-6" />
                      {excelData.length === 0
                        ? "ফাইল আপলোড করুন"
                        : !date
                          ? "তারিখ নির্বাচন করুন"
                          : updateProducts.length === 0
                            ? "কোন ম্যাচ নেই"
                            : `${updateProducts.length} টি প্রোডাক্ট আপডেট করুন`}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Data Preview (Equal Height) */}
          <div className="lg:w-1/2 flex flex-col">
            <div className="bg-white rounded-2xl shadow-lg p-6 flex-1 flex flex-col h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FileSpreadsheet className="h-6 w-6 text-purple-600" />
                  এক্সেল ডাটা প্রিভিউ ({filteredExcelData.length})
                </h2>
              </div>

              {filteredExcelData.length > 0 ? (
                <div className="overflow-y-auto flex-1 max-h-190">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-linear-to-r from-purple-50 to-pink-50">
                      <tr>
                        <th className="p-3 text-left font-semibold text-purple-800 border-b">
                          কোড
                        </th>
                        <th className="p-3 text-left font-semibold text-purple-800 border-b">
                          নাম
                        </th>
                        <th className="p-3 text-left font-semibold text-purple-800 border-b">
                          কার্টন
                        </th>
                        <th className="p-3 text-left font-semibold text-purple-800 border-b">
                          স্ট্যাটাস
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExcelData.map((item, i) => {
                        const isMatched = products.some(
                          (p) => p.code === item.code,
                        );
                        return (
                          <tr
                            key={i}
                            className={`border-b hover:bg-gray-50 ${i % 2 === 0 ? "bg-gray-50" : "bg-white"}`}
                          >
                            <td className="p-3 font-mono">
                              <code
                                className={`px-2 py-1 rounded text-xs ${isMatched ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                              >
                                {item.code}
                              </code>
                            </td>
                            <td className="p-3 text-sm">{item.name || "-"}</td>
                            <td className="p-3 text-right font-semibold text-sm">
                              {item.carton}
                            </td>
                            <td className="p-3">
                              {isMatched ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">
                                  <CheckCircle className="h-3 w-3" />
                                  মিলেছে
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs">
                                  <XCircle className="h-3 w-3" />
                                  নেই
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 flex-1 flex flex-col items-center justify-center">
                  <FileSpreadsheet className="h-16 w-16 mx-auto mb-3 text-gray-300" />
                  <p className="font-(family-name:--font-tiro-bangla)">
                    {excelData.length === 0
                      ? "এক্সেল ফাইল আপলোড করুন"
                      : "কোন ম্যাচিং ডাটা পাওয়া যায়নি"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Update Preview Section */}
        {updateProducts.length > 0 && date && (
          <div className="mt-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Database className="h-6 w-6 text-amber-600" />
                  আপডেট প্রিভিউ -{" "}
                  {new Date(date).toLocaleDateString("bn-BD", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </h2>
                <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-lg text-sm font-semibold">
                  মোট {updateProducts.length} টি প্রোডাক্ট
                </div>
              </div>

              <div className="overflow-y-auto max-h-100">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-linear-to-r from-amber-50 to-orange-50">
                    <tr>
                      <th className="p-3 text-left font-semibold text-amber-800 border-b">
                        কোড
                      </th>
                      <th className="p-3 text-left font-semibold text-amber-800 border-b">
                        নাম
                      </th>
                      <th className="p-3 text-left font-semibold text-amber-800 border-b">
                        তারিখ
                      </th>
                      <th className="p-3 text-left font-semibold text-amber-800 border-b">
                        নতুন কার্টন
                      </th>
                      <th className="p-3 text-left font-semibold text-amber-800 border-b">
                        স্ট্যাটাস
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {updateProducts.map((product, i) => {
                      const day = new Date(date).getDate();
                      const data = product.data.find((d) => d.date === day);
                      const excelItem = excelData.find(
                        (item) => item.code === product.code,
                      );

                      return (
                        <tr
                          key={product.id}
                          className={`border-b hover:bg-gray-50 ${i % 2 === 0 ? "bg-gray-50" : "bg-white"}`}
                        >
                          <td className="p-3">
                            <code className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-mono">
                              {product.code}
                            </code>
                          </td>
                          <td className="p-3 text-sm">{product.name}</td>
                          <td className="p-3 text-sm">
                            {day} {monthName}, {year}
                          </td>
                          <td className="p-3 text-right font-semibold text-green-700">
                            <span className="bg-green-100 px-3 py-1.5 rounded-lg text-sm">
                              {excelItem?.carton || 0}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs">
                              <CheckCircle className="h-3 w-3" />
                              আপডেট হবে
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-linear-to-r from-blue-50 to-white p-5 rounded-xl border border-blue-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              </div>
              <h4 className="font-bold text-gray-800">এক্সেল ফরম্যাট</h4>
            </div>
            <p className="text-gray-600 text-sm">
              ফাইলের প্রথম সারি হেডার, পরবর্তী সারিতে কোড, নাম, কার্টন - এই তিন
              কলাম থাকতে হবে।
            </p>
          </div>

          <div className="bg-linear-to-r from-green-50 to-white p-5 rounded-xl border border-green-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Database className="h-5 w-5 text-green-600" />
              </div>
              <h4 className="font-bold text-gray-800">আপডেট প্রক্রিয়া</h4>
            </div>
            <p className="text-gray-600 text-sm">
              নির্দিষ্ট তারিখের জন্য প্রোডাক্টের কার্টন সংখ্যা আপডেট হবে।
              পূর্বের ডাটা পরিবর্তন হবে।
            </p>
          </div>

          <div className="bg-linear-to-r from-amber-50 to-white p-5 rounded-xl border border-amber-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-amber-100 p-2 rounded-lg">
                <Package className="h-5 w-5 text-amber-600" />
              </div>
              <h4 className="font-bold text-gray-800">কোড ম্যাচিং</h4>
            </div>
            <p className="text-gray-600 text-sm">
              এক্সেল ফাইলের কোডের সাথে ডাটাবেজের প্রোডাক্ট কোড হুবহু মিলতে হবে।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
