"use client";

import { Product } from "@/types/Product.Types";
import Firebase from "@/utils/firebase";
import { getPeriod } from "@/utils/storage";
import { useState, ChangeEvent, useEffect } from "react";
import * as XLSX from "xlsx";
import { 
  Upload, RefreshCw, Database, FileSpreadsheet, DollarSign, 
  Package, CheckCircle, AlertCircle, Loader2, Search, 
  FileDown, FileUp, Calendar, CheckSquare, XCircle 
} from "lucide-react";

type ProductWithID = Product & {
  id: string;
};

type ExcelRow = {
  code: string;
  name: string;
  opening: number;
  price: number;
};

export default function OpeningValueUpdate() {
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [products, setProducts] = useState<ProductWithID[]>([]);
  const [field, setField] = useState<string>("opening");
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showMatchedOnly, setShowMatchedOnly] = useState(false);
  const [updateStats, setUpdateStats] = useState({
    matched: 0,
    updated: 0,
    failed: 0,
    notFound: 0
  });

  const { year, month } = getPeriod();
  const monthName = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
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
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

        const parsed: ExcelRow[] = [];

        rows.forEach((item, index) => {
          // Handle different column names
          const code = item.code || item.Code || item.CODE || item["Product Code"] || item["product code"];
          const name = item.name || item.Name || item.NAME || item["Product Name"] || item["product name"];
          const opening = item.opening || item.Opening || item.OPENING || item["Opening Stock"] || item["opening stock"] || 0;
          const price = item.price || item.Price || item.PRICE || item["Unit Price"] || item["unit price"] || 0;

          if (!code) {
            console.warn(`Row ${index + 2} has no code, skipping`);
            return;
          }

          parsed.push({
            code: String(code).trim(),
            name: name ? String(name).trim() : "",
            opening: Math.round(Number(opening)),
            price: Number(price)
          });
        });

        setExcelData(parsed);
        
        // Calculate matches
        calculateMatches(parsed);
        
      } catch (error) {
        console.error(error);
        alert("এক্সেল ফাইল পড়তে সমস্যা হয়েছে। ফাইলটি সঠিক ফরমেটে আছে কিনা চেক করুন।");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  /* ---------------- Calculate Matches ---------------- */
  const calculateMatches = (excelRows: ExcelRow[] = excelData) => {
    let matched = 0;
    let notFound = 0;

    excelRows.forEach(item => {
      const found = products.find(p => p.code === item.code);
      if (found) matched++;
      else notFound++;
    });

    setUpdateStats(prev => ({ ...prev, matched, notFound }));
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

    if (products.length === 0) {
      alert("ডাটাবেজে কোন প্রোডাক্ট পাওয়া যায়নি");
      return;
    }

    const confirmed = window.confirm(
      `আপনি কি ${updateStats.matched} টি প্রোডাক্ট আপডেট করতে চান?\n\n` +
      `ফিল্ড: ${field === "opening" ? "শুধুমাত্র অপেনিং" : field === "price" ? "শুধুমাত্র মূল্য" : "অপেনিং + মূল্য"}`
    );
    
    if (!confirmed) return;

    setLoading(true);
    setUpdateStats(prev => ({ ...prev, updated: 0, failed: 0 }));

    const updates = [];
    let updated = 0;
    let failed = 0;

    for (const item of excelData) {
      const product = products.find(p => p.code === item.code);
      
      if (!product) continue;

      try {
        const updateData: any = {};
        
        if (field === "opening" || field === "opening_price") {
          updateData.opening = item.opening;
        }
        if (field === "price" || field === "opening_price") {
          updateData.price = item.price;
        }

        // Prepare update promise
        updates.push(
          Firebase.updateDocument(collectionName, product.id, updateData)
            .then(() => {
              updated++;
              setUpdateStats(prev => ({ ...prev, updated }));
            })
            .catch((error) => {
              console.error(`Failed to update ${item.code}:`, error);
              failed++;
              setUpdateStats(prev => ({ ...prev, failed }));
            })
        );

      } catch (error) {
        console.error(`Error processing ${item.code}:`, error);
        failed++;
        setUpdateStats(prev => ({ ...prev, failed }));
      }
    }

    // Wait for all updates to complete
    await Promise.allSettled(updates);
    
    setLoading(false);
    
    // Refresh product list
    await loadProducts();
    
    // Show summary
    alert(
      `আপডেট সম্পন্ন!\n\n` +
      `মোট মিলেছে: ${updateStats.matched}\n` +
      `সফল আপডেট: ${updated}\n` +
      `ব্যর্থ: ${failed}\n` +
      `খুঁজে পাওয়া যায়নি: ${updateStats.notFound}`
    );
  };

  /* ---------------- Download Template ---------------- */
  const downloadTemplate = () => {
    // Create template data
    const templateData = products.length > 0 
      ? products.slice(0, 20).map(p => ({
          code: p.code,
          name: p.name,
          opening: p.opening,
          price: p.price
        }))
      : [
          { code: "PROD001", name: "Sample Product 1", opening: 100, price: 50 },
          { code: "PROD002", name: "Sample Product 2", opening: 200, price: 75 },
          { code: "PROD003", name: "Sample Product 3", opening: 150, price: 120 }
        ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    
    // Add column widths
    const wscols = [
      { wch: 15 }, // code
      { wch: 30 }, // name
      { wch: 12 }, // opening
      { wch: 12 }  // price
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `opening_template_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  /* ---------------- Download Current Data ---------------- */
  const downloadCurrentData = () => {
    if (products.length === 0) {
      alert("ডাউনলোড করার জন্য কোন ডাটা নেই");
      return;
    }

    const currentData = products.map(p => ({
      code: p.code,
      name: p.name,
      opening: p.opening,
      price: p.price
    }));

    const worksheet = XLSX.utils.json_to_sheet(currentData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Current Data");
    
    const wscols = [
      { wch: 15 },
      { wch: 30 },
      { wch: 12 },
      { wch: 12 }
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `current_products_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  /* ---------------- Filtered Products ---------------- */
  const filteredProducts = products.filter(product => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        product.code.toLowerCase().includes(searchLower) ||
        product.name.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const filteredExcelData = showMatchedOnly 
    ? excelData.filter(item => products.some(p => p.code === item.code))
    : excelData;

  /* ---------------- Initialize ---------------- */
  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (excelData.length > 0) {
      calculateMatches();
    }
  }, [products, excelData]);

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-linear-to-r from-blue-600 to-cyan-600 p-3 rounded-xl">
                <RefreshCw className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">প্রোডাক্ট অপেনিং ভ্যালু আপডেট</h1>
                <p className="text-gray-600 mt-1 font-(family-name:--font-tiro-bangla)">
                  এক্সেল ফাইল থেকে মাসের শুরুতে স্টক ও মূল্য আপডেট করুন
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={loadProducts}
                disabled={productsLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className={`h-5 w-5 ${productsLoading ? 'animate-spin' : ''}`} />
                {productsLoading ? "লোড হচ্ছে..." : "রিফ্রেশ"}
              </button>
              <button
                onClick={downloadCurrentData}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
              >
                <FileDown className="h-5 w-5" />
                বর্তমান ডাটা ডাউনলোড
              </button>
            </div>
          </div>

          {/* Period Info */}
          <div className="bg-linear-to-r from-blue-100 to-cyan-100 p-4 rounded-xl border border-blue-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="font-bold text-blue-800">বর্তমান পিরিয়ড</h3>
                  <p className="text-blue-700 font-(family-name:--font-tiro-bangla)">
                    {monthName} {year} • কালেকশন: production/{year}/months/{monthName}/products
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-800">{products.length}</div>
                <div className="text-blue-700 text-sm">মোট প্রোডাক্ট</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-2">
            {/* File Upload Card */}
            <div className="w-8/12 bg-white rounded-2xl shadow-lg p-6">
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
                    className="inline-block cursor-pointer bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg"
                  >
                    এক্সেল ফাইল নির্বাচন করুন
                  </label>
                  <p className="text-gray-600 mt-4 font-[family-name:var(--font-tiro-bangla)]">
                    {excelFile ? (
                      <span className="text-green-600 font-medium">
                        <FileUp className="h-4 w-4 inline mr-2" />
                        {excelFile.name} ({excelData.length} rows)
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

              {/* Settings */}
              <div className="space-y-6">
                <div>
                  <label className="block text-lg font-semibold text-gray-800 mb-3">
                    <DollarSign className="h-5 w-5 text-green-600 inline mr-2" />
                    কোন ফিল্ড আপডেট করবেন?
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "opening", label: "অপেনিং", color: "bg-blue-100 text-blue-800 border-blue-300" },
                      { value: "price", label: "মূল্য", color: "bg-green-100 text-green-800 border-green-300" },
                      { value: "opening_price", label: "উভয়", color: "bg-purple-100 text-purple-800 border-purple-300" }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setField(option.value)}
                        className={`py-3 rounded-xl border-2 transition-all ${field === option.value ? `${option.color} border-opacity-100 font-bold` : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Update Button */}
                <div className="pt-4">
                  <button
                    onClick={handleUpdate}
                    disabled={loading || excelData.length === 0 || updateStats.matched === 0}
                    className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg ${
                      loading || excelData.length === 0 || updateStats.matched === 0
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:from-green-700 hover:to-emerald-800 hover:shadow-xl transform hover:-translate-y-0.5"
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
                        {excelData.length === 0 ? "ফাইল আপলোড করুন" : 
                         updateStats.matched === 0 ? "কোন ম্যাচ নেই" : 
                         `${updateStats.matched} টি আপডেট করুন`}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Card */}
            {excelData.length > 0 && (
              <div className="w-4/12 bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  ডাটা বিশ্লেষণ
                </h3>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-100">
                    <div className="text-2xl font-bold text-blue-700">{excelData.length}</div>
                    <div className="text-sm text-blue-600">এক্সেল রো</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-xl text-center border border-green-100">
                    <div className="text-2xl font-bold text-green-700">{updateStats.matched}</div>
                    <div className="text-sm text-green-600">মিলেছে</div>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-xl text-center border border-amber-100">
                    <div className="text-2xl font-bold text-amber-700">{updateStats.notFound}</div>
                    <div className="text-sm text-amber-600">খুঁজে পাওয়া যায়নি</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-xl text-center border border-purple-100">
                    <div className="text-2xl font-bold text-purple-700">{updateStats.updated}</div>
                    <div className="text-sm text-purple-600">আপডেট হয়েছে</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mt-4 text-xs">
            {/* Excel Data Preview */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FileSpreadsheet className="h-6 w-6 text-purple-600" />
                  এক্সেল ডাটা ({excelData.length})
                </h2>
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="সার্চ করুন..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {excelData.length > 0 && (
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={showMatchedOnly}
                        onChange={(e) => setShowMatchedOnly(e.target.checked)}
                        className="rounded"
                      />
                      শুধু ম্যাচড
                    </label>
                  )}
                </div>
              </div>

              {filteredExcelData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-purple-50 to-pink-50">
                        <th className="p-3 text-left font-semibold text-purple-800 border-b">#</th>
                        <th className="p-3 text-left font-semibold text-purple-800 border-b">কোড</th>
                        <th className="p-3 text-left font-semibold text-purple-800 border-b">নাম</th>
                        <th className="p-3 text-left font-semibold text-purple-800 border-b">অপেনিং</th>
                        <th className="p-3 text-left font-semibold text-purple-800 border-b">মূল্য</th>
                        <th className="p-3 text-left font-semibold text-purple-800 border-b">স্ট্যাটাস</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExcelData.slice(0, 15).map((item, i) => {
                        const isMatched = products.some(p => p.code === item.code);
                        return (
                          <tr 
                            key={i} 
                            className={`border-b hover:bg-gray-50 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                          >
                            <td className="p-3 text-gray-600">{i + 1}</td>
                            <td className="p-3 font-mono">
                              <code className={`px-2 py-1 rounded ${isMatched ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {item.code}
                              </code>
                            </td>
                            <td className="p-3 font-[family-name:var(--font-tiro-bangla)]">{item.name || '-'}</td>
                            <td className="p-3 text-right font-semibold">{item.opening.toLocaleString()}</td>
                            <td className="p-3 text-right font-semibold text-green-700">
                              ৳{item.price.toLocaleString()}
                            </td>
                            <td className="p-3">
                              {isMatched ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-sm">
                                  <CheckCircle className="h-4 w-4" />
                                  মিলেছে
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-800 text-sm">
                                  <XCircle className="h-4 w-4" />
                                  নেই
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredExcelData.length > 15 && (
                    <p className="text-center text-gray-500 mt-3 font-[family-name:var(--font-tiro-bangla)]">
                      আরও {filteredExcelData.length - 15} টি রো আছে...
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-[family-name:var(--font-tiro-bangla)]">
                    {excelData.length === 0 ? "এক্সেল ফাইল আপলোড করুন" : "কোন ম্যাচিং ডাটা পাওয়া যায়নি"}
                  </p>
                </div>
              )}
            </div>

            {/* Database Products */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Database className="h-6 w-6 text-amber-600" />
                  ডাটাবেজ প্রোডাক্টস ({filteredProducts.length}/{products.length})
                </h2>
                {productsLoading && (
                  <div className="flex items-center gap-2 text-amber-600">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    লোড হচ্ছে...
                  </div>
                )}
              </div>

              {productsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber-600" />
                  <p className="mt-3 text-gray-600 font-[family-name:var(--font-tiro-bangla)]">
                    প্রোডাক্ট লোড হচ্ছে...
                  </p>
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-amber-50 to-orange-50">
                        <th className="p-3 text-left font-semibold text-amber-800 border-b">কোড</th>
                        <th className="p-3 text-left font-semibold text-amber-800 border-b">নাম</th>
                        <th className="p-3 text-left font-semibold text-amber-800 border-b">অপেনিং</th>
                        <th className="p-3 text-left font-semibold text-amber-800 border-b">মূল্য</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.slice(0, 10).map((product, i) => {
                        const hasExcelMatch = excelData.some(item => item.code === product.code);
                        return (
                          <tr 
                            key={product.id} 
                            className={`border-b hover:bg-gray-50 ${hasExcelMatch ? 'bg-green-50' : i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                          >
                            <td className="p-3">
                              <code className={`px-2 py-1 rounded font-mono ${hasExcelMatch ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {product.code}
                              </code>
                            </td>
                            <td className="p-3 font-[family-name:var(--font-tiro-bangla)]">{product.name}</td>
                            <td className="p-3 text-right font-semibold">
                              <span className={`px-2 py-1 rounded ${hasExcelMatch ? 'bg-blue-100 text-blue-800' : ''}`}>
                                {product.opening.toLocaleString()}
                              </span>
                            </td>
                            <td className="p-3 text-right font-semibold text-green-700">
                              ৳{product.price.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredProducts.length > 10 && (
                    <p className="text-center text-gray-500 mt-3 font-[family-name:var(--font-tiro-bangla)]">
                      আরও {filteredProducts.length - 10} টি প্রোডাক্ট আছে...
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-[family-name:var(--font-tiro-bangla)]">
                    {searchTerm ? "সার্চ রেজাল্টে কোন প্রোডাক্ট নেই" : "ডাটাবেজে কোন প্রোডাক্ট নেই"}
                  </p>
                </div>
              )}
            </div>
          </div>

        {/* Footer Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-blue-50 to-white p-5 rounded-xl border border-blue-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              </div>
              <h4 className="font-bold text-gray-800">এক্সেল ফরম্যাট</h4>
            </div>
            <p className="text-gray-600 text-sm font-(family-name:--font-tiro-bangla)">
              ফাইলে code, name, opening, price কলাম থাকতে হবে। কোড দ্বারা ম্যাচিং হয়।
            </p>
          </div>
          
          <div className="bg-linear-to-r from-green-50 to-white p-5 rounded-xl border border-green-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Database className="h-5 w-5 text-green-600" />
              </div>
              <h4 className="font-bold text-gray-800">আপডেট নিশ্চিতকরণ</h4>
            </div>
            <p className="text-gray-600 text-sm font-(family-name:--font-tiro-bangla)">
              আপডেট করার আগে প্রিভিউ দেখুন। একবার আপডেট করলে পূর্বের ডাটা পরিবর্তন হবে।
            </p>
          </div>
          
          <div className="bg-linear-to-r from-amber-50 to-white p-5 rounded-xl border border-amber-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-amber-100 p-2 rounded-lg">
                <Package className="h-5 w-5 text-amber-600" />
              </div>
              <h4 className="font-bold text-gray-800">কোড ম্যাচিং</h4>
            </div>
            <p className="text-gray-600 text-sm font-(family-name:--font-tiro-bangla)">
              এক্সেল এবং ডাটাবেজের কোড একই হতে হবে। ভিন্ন হলে আপডেট হবে না।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}