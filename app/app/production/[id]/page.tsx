"use client";

import Firebase from "@/utils/firebase";
import { db } from "@/utils/firebaseConfig";
import { getPeriod } from "@/utils/storage";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle,
  DollarSign,
  Eye,
  EyeOff,
  Factory,
  Hash,
  Info,
  Loader2,
  Package,
  Save,
  Target,
  TrendingUp,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type ProductionData = {
  date: number;
  batch: number;
  carton: number;
  manpower: number;
};

type Product = {
  id: string;
  name: string;
  section: string;
  code: string;
  sku: string;
  price: number;
  opening: number;
  sales_target: number;
  production_target: number;
  data: ProductionData[];
  infos: Array<{ name: string; unit: string; value: number }>;
};

type ProductWithStats = Product & {
  stats: {
    total_production: number;
    current_total: number;
    floor_production_target: number;
    remaining_production: number;
    completion_percentage: number;
  };
};

type Entry = {
  data: {
    date: number;
    checked: boolean;
  }[];
};

export default function SectionProductionPage() {
  const params = useParams();
  const sectionId = params.id as string;

  const [products, setProducts] = useState<ProductWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});
  const [message, setMessage] = useState({ type: "", text: "" });
  const [savedFields, setSavedFields] = useState<Set<string>>(new Set());
  const [failedFields, setFailedFields] = useState<Set<string>>(new Set());
  const [entries, setEntries] = useState<Entry | null>(null);

  // নতুন স্টেট: কমপ্যাক্ট ভিউ টগল
  const [compactView, setCompactView] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const fixedColumnRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

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

  const lastDay = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: lastDay }, (_, i) => i + 1);

  // বাংলা মাসের নাম
  const banglaMonthNames = [
    "জানুয়ারি",
    "ফেব্রুয়ারি",
    "মার্চ",
    "এপ্রিল",
    "মে",
    "জুন",
    "জুলাই",
    "আগস্ট",
    "সেপ্টেম্বর",
    "অক্টোবর",
    "নভেম্বর",
    "ডিসেম্বর",
  ];

  const banglaMonthName = banglaMonthNames[month - 1];

  // সেকশন নাম বাংলায়
  const getBanglaSectionName = (sectionId: string) => {
    const sectionMap: Record<string, string> = {
      bakery: "বেকারি",
      biscuit: "বিস্কুট",
      cake: "কেক",
      dairy_milk: "ডেইরি মিল্ক",
      lachcha: "লাচ্ছা",
      noodles: "নুডলস",
      snacks: "স্ন্যাকস",
      vermicelli: "ভার্মিসেলি",
      wafer: "ওয়েফার",
      water_and_beverage: "পানি ও পানীয়",
    };

    const formattedName = sectionId
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    return sectionMap[sectionId] || formattedName;
  };

  // Calculate product statistics
  const calculateProductStats = (product: Product) => {
    const totalProduction = product.data.reduce(
      (sum, prod) => sum + (prod.carton || 0),
      0
    );
    const currentTotal = product.opening + totalProduction;
    const floorProductionTarget = Math.max(
      product.production_target - product.opening,
      0
    );
    const remainingProduction = Math.max(
      product.production_target - currentTotal,
      0
    );
    const completionPercentage =
      product.production_target > 0
        ? Math.min(
            Math.round((currentTotal / product.production_target) * 100),
            100
          )
        : 0;

    return {
      total_production: totalProduction,
      current_total: currentTotal,
      floor_production_target: floorProductionTarget,
      remaining_production: remainingProduction,
      completion_percentage: completionPercentage,
    };
  };

  const hideMessage = () => {
    setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3000);
  };

  // Show success feedback
  const showSuccessFeedback = (fieldKey: string) => {
    setSavedFields((prev) => {
      const newSet = new Set(prev);
      newSet.add(fieldKey);
      return newSet;
    });

    const inputElement = inputRefs.current[fieldKey];
    if (inputElement) {
      inputElement.classList.add("border-green-500", "bg-green-50");
    }

    setTimeout(() => {
      setSavedFields((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fieldKey);
        return newSet;
      });

      if (inputElement) {
        inputElement.classList.remove("border-green-500", "bg-green-50");
      }
    }, 1000);
  };

  // Show error feedback
  const showErrorFeedback = (fieldKey: string) => {
    setFailedFields((prev) => {
      const newSet = new Set(prev);
      newSet.add(fieldKey);
      return newSet;
    });

    const inputElement = inputRefs.current[fieldKey];
    if (inputElement) {
      inputElement.classList.add("border-red-500", "bg-red-50");
    }

    setTimeout(() => {
      setFailedFields((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fieldKey);
        return newSet;
      });

      if (inputElement) {
        inputElement.classList.remove("border-red-500", "bg-red-50");
      }
    }, 1000);
  };

  // Load products for the section
  const loadProducts = async () => {
    if (!sectionId) return;

    setLoading(true);
    try {
      const productsRef = collection(
        db,
        `production/${year}/months/${monthName}/products`
      );

      const q = query(productsRef, where("section", "==", sectionId));
      const querySnapshot = await getDocs(q);

      const productsData: ProductWithStats[] = [];

      querySnapshot.forEach((doc) => {
        const productData = doc.data() as Product;
        const stats = calculateProductStats(productData);

        productsData.push({
          ...productData,
          id: doc.id,
          stats,
        });
      });

      setProducts(productsData);

      const entry = await Firebase.getDocument("activities", "entries");
      setEntries(entry.data() as Entry);
    } catch (error) {
      console.error("Error loading products:", error);
      setMessage({
        type: "error",
        text: `প্রোডাক্ট লোড করতে ব্যর্থ: ${
          error instanceof Error ? error.message : "অজানা সমস্যা"
        }`,
      });
      hideMessage();
    } finally {
      setLoading(false);
    }
  };

  const getChecked = (date: number): boolean | undefined => {
    return entries?.data.find((d) => d.date === date)?.checked;
  };

  const handleCheck = (date: number, checked: boolean) => {
    if (!entries) return;

    const data = entries.data.map((d) =>
      d.date === date ? { ...d, checked } : d
    );

    setEntries({ data });
  };

  // Update production data on blur
  const updateProductionData = async (
    productId: string,
    date: number,
    field: "batch" | "carton",
    value: string
  ) => {
    const fieldKey = `${productId}-${date}-${field}`;
    const numValue = parseInt(value) || 0;

    try {
      setSaving((prev) => ({ ...prev, [fieldKey]: true }));

      // Update state immediately
      setProducts((prev) =>
        prev.map((item) => {
          if (item.id === productId) {
            const updatedData = item.data.map((prod, index) => {
              if (index === date - 1) {
                return { ...prod, [field]: numValue };
              }
              return prod;
            });

            const updatedProduct = {
              ...item,
              data: updatedData,
            };

            return {
              ...updatedProduct,
              stats: calculateProductStats(updatedProduct),
            };
          }
          return item;
        })
      );

      // Prepare data for Firebase
      const productRef = doc(
        db,
        `production/${year}/months/${monthName}/products/${productId}`
      );

      const productDoc = await getDoc(productRef);
      if (productDoc.exists()) {
        const productData = productDoc.data();
        const updatedData = productData.data.map(
          (d: ProductionData, index: number) => {
            if (index === date - 1) {
              return { ...d, [field]: numValue };
            }
            return d;
          }
        );

        await updateDoc(productRef, { data: updatedData });

        // Show success feedback
        showSuccessFeedback(fieldKey);
      }
    } catch (error) {
      console.error("Error updating production:", error);
      showErrorFeedback(fieldKey);
    } finally {
      setSaving((prev) => ({ ...prev, [fieldKey]: false }));
    }
  };

  // Update summary data on blur
  const updateSummaryData = async (
    productId: string,
    field: "opening" | "sales_target" | "price",
    value: string
  ) => {
    const fieldKey = `${productId}-${field}`;
    const numValue = parseInt(value) || 0;

    try {
      setSaving((prev) => ({ ...prev, [fieldKey]: true }));

      // Update state immediately
      setProducts((prev) =>
        prev.map((item) => {
          if (item.id === productId) {
            let updatedProduct: Product;

            if (field === "price") {
              updatedProduct = { ...item, price: numValue };
            } else if (field === "opening") {
              updatedProduct = { ...item, opening: numValue };
            } else {
              const production_target = Math.round(numValue * 1.2);
              updatedProduct = {
                ...item,
                sales_target: numValue,
                production_target,
              };
            }

            return {
              ...updatedProduct,
              stats: calculateProductStats(updatedProduct),
            };
          }
          return item;
        })
      );

      // Update in Firebase
      const productRef = doc(
        db,
        `production/${year}/months/${monthName}/products/${productId}`
      );

      const updateData: any = {};
      if (field === "price") {
        updateData.price = numValue;
      } else if (field === "opening") {
        updateData.opening = numValue;
      } else {
        updateData.sales_target = numValue;
        updateData.production_target = Math.round(numValue * 1.2);
      }

      await updateDoc(productRef, updateData);

      // Show success feedback
      showSuccessFeedback(fieldKey);
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      showErrorFeedback(fieldKey);
    } finally {
      setSaving((prev) => ({ ...prev, [fieldKey]: false }));
    }
  };

  // Handle production input change (for immediate UI update)
  const handleProductionChange = (
    productId: string,
    date: number,
    field: "batch" | "carton",
    value: string
  ) => {
    const numValue = parseInt(value) || 0;

    setProducts((prev) =>
      prev.map((item) => {
        if (item.id === productId) {
          const updatedData = item.data.map((prod, index) => {
            if (index === date - 1) {
              return { ...prod, [field]: numValue };
            }
            return prod;
          });

          const updatedProduct = {
            ...item,
            data: updatedData,
          };

          return {
            ...updatedProduct,
            stats: calculateProductStats(updatedProduct),
          };
        }
        return item;
      })
    );
  };

  // Handle summary input change (for immediate UI update)
  const handleSummaryChange = (
    productId: string,
    field: "opening" | "sales_target" | "price",
    value: string
  ) => {
    const numValue = parseInt(value) || 0;

    setProducts((prev) =>
      prev.map((item) => {
        if (item.id === productId) {
          let updatedProduct: Product;

          if (field === "price") {
            updatedProduct = { ...item, price: numValue };
          } else if (field === "opening") {
            updatedProduct = { ...item, opening: numValue };
          } else {
            const production_target = Math.round(numValue * 1.2);
            updatedProduct = {
              ...item,
              sales_target: numValue,
              production_target,
            };
          }

          return {
            ...updatedProduct,
            stats: calculateProductStats(updatedProduct),
          };
        }
        return item;
      })
    );
  };

  // Save all changes (for manual save button)
  const saveAll = async () => {
    setMessage({
      type: "success",
      text: "সব পরিবর্তন রিয়েল-টাইমে সেভ করা হয়েছে!",
    });
    hideMessage();
  };

  // Handle Enter key press
  const handleKeyPress = (
    e: React.KeyboardEvent,
    callback: () => void,
    nextFieldId?: string
  ) => {
    if (e.key === "Enter") {
      callback();

      // Move focus to next input if specified
      if (nextFieldId) {
        const nextInput = inputRefs.current[nextFieldId];
        if (nextInput) {
          nextInput.focus();
        }
      }
    }
  };

  const getDayName = (day: number) => {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const banglaDays = [
      "রবি",
      "সোম",
      "মঙ্গল",
      "বুধ",
      "বৃহস্পতি",
      "শুক্র",
      "শনি",
    ];
    return banglaDays[dayOfWeek];
  };

  const isWeekend = (day: number) => {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 5;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() + 1 === month &&
      today.getFullYear() === year
    );
  };

  const getColumnTotal = (dayIndex: number, field: keyof ProductionData) => {
    return products.reduce((total, product) => {
      const prod = product.data[dayIndex];
      return total + (prod?.[field] || 0);
    }, 0);
  };

  const calculateSectionTotals = () => {
    const totals = {
      production_target: 0,
      floor_target: 0,
      current_total: 0,
      remaining_production: 0,
      total_value: 0,
      total_carton: 0,
      total_batch: 0,
    };

    products.forEach((product) => {
      const productStats = calculateProductStats(product);
      const productTotalCarton = product.data.reduce(
        (sum, prod) => sum + (prod.carton || 0),
        0
      );
      const productTotalBatch = product.data.reduce(
        (sum, prod) => sum + (prod.batch || 0),
        0
      );

      totals.production_target += product.production_target || 0;
      totals.floor_target += productStats.floor_production_target || 0;
      totals.current_total += productStats.current_total || 0;
      totals.remaining_production += productStats.remaining_production || 0;
      totals.total_value += productTotalCarton * (product.price || 0);
      totals.total_carton += productTotalCarton;
      totals.total_batch += productTotalBatch;
    });

    return totals;
  };

  const sectionTotals = calculateSectionTotals();
  const sectionName = getBanglaSectionName(sectionId);

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, [sectionId]);

  // Sync scroll between header and content
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const headerContainer = headerRef.current;

    if (scrollContainer && headerContainer) {
      const handleScroll = () => {
        headerContainer.scrollLeft = scrollContainer.scrollLeft;
      };

      scrollContainer.addEventListener("scroll", handleScroll);
      return () => scrollContainer.removeEventListener("scroll", handleScroll);
    }
  }, []);

  // Sync vertical scroll
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const fixedColumn = fixedColumnRef.current;

    if (scrollContainer && fixedColumn) {
      const handleVerticalScroll = () => {
        fixedColumn.scrollTop = scrollContainer.scrollTop;
      };

      scrollContainer.addEventListener("scroll", handleVerticalScroll);
      return () =>
        scrollContainer.removeEventListener("scroll", handleVerticalScroll);
    }
  }, []);

  // Constants for consistent heights
  const ROW_HEIGHT = compactView ? 50 : 190;
  const HEADER_HEIGHT = compactView ? 80 : 120;

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-gray-50 flex items-center justify-center p-4 font-(family-name:--font-tiro-bangla)">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 mx-auto rounded-full bg-linear-to-r from-blue-500 to-blue-600 animate-pulse flex items-center justify-center">
              <Factory className="h-10 w-10 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              ডাটা লোড হচ্ছে
            </h2>
            <p className="text-gray-600">প্রোডাকশন ডাটা লোড করা হচ্ছে...</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">লোড হচ্ছে</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-linear-to-br from-blue-50 to-gray-50 p-4 md:p-6 font-(family-name:--font-tiro-bangla)">
      <div className="max-w-full mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-linear-to-r from-blue-600 to-blue-700 p-3 rounded-xl">
                <Factory className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  {sectionName} - প্রোডাকশন
                </h1>
                <p className="text-gray-600">
                  {banglaMonthName} {year} - দৈনিক উৎপাদন এন্ট্রি ও ব্যবস্থাপনা
                </p>
              </div>
            </div>

            {/* কমপ্যাক্ট ভিউ টগল বাটন */}
            <button
              onClick={() => setCompactView(!compactView)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                compactView
                  ? "bg-linear-to-r from-blue-600 to-blue-700 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              {compactView ? (
                <>
                  <Eye className="h-5 w-5" />
                  সম্পূর্ণ ভিউ
                </>
              ) : (
                <>
                  <EyeOff className="h-5 w-5" />
                  কমপ্যাক্ট ভিউ
                </>
              )}
            </button>
          </div>
        </div>

        {/* Top Bar */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
              <div className="bg-linear-to-r from-blue-50 to-white p-4 rounded-xl border border-blue-200">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">বর্তমান মাস</p>
                    <p className="font-semibold text-blue-700">
                      {banglaMonthName} {year}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-linear-to-r from-green-50 to-white p-4 rounded-xl border border-green-200">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">প্রোডাক্ট</p>
                    <p className="font-semibold text-green-700">
                      {products.length.toLocaleString("bn-BD")} টি
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-linear-to-r from-orange-50 to-white p-4 rounded-xl border border-orange-200">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">মোট কার্টন</p>
                    <p className="font-semibold text-orange-700">
                      {sectionTotals.total_carton.toLocaleString("bn-BD")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-linear-to-r from-purple-50 to-white p-4 rounded-xl border border-purple-200">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">মোট মূল্য</p>
                    <p className="font-semibold text-purple-700">
                      ৳{sectionTotals.total_value.toLocaleString("bn-BD")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={saveAll}
                className="px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-3 bg-linear-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:shadow-lg"
              >
                <Save className="h-5 w-5" />
                সব পরিবর্তন সংরক্ষণ করুন
              </button>

              <div className="text-sm text-gray-500 text-center">
                ⓘ প্রতিটি পরিবর্তন onBlur/Enter এ স্বয়ংক্রিয়ভাবে সেভ হয়
              </div>
            </div>
          </div>

          {/* Message Display */}
          {message.text && (
            <div
              className={`mt-4 p-4 rounded-xl ${
                message.type === "success"
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : message.type === "error"
                  ? "bg-red-50 border border-red-200 text-red-700"
                  : "bg-blue-50 border border-blue-200 text-blue-700"
              }`}
            >
              <div className="flex items-center gap-3">
                {message.type === "success" ? (
                  <CheckCircle className="h-5 w-5" />
                ) : message.type === "error" ? (
                  <AlertCircle className="h-5 w-5" />
                ) : (
                  <Info className="h-5 w-5" />
                )}
                <span className="">{message.text}</span>
              </div>
            </div>
          )}
        </div>

        {/* Main Production Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Package className="h-16 w-16 text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg mb-2">
                এই সেকশনে কোনো প্রোডাক্ট নেই
              </p>
              <p className="text-gray-400 text-sm">
                প্রথমে এই সেকশনে প্রোডাক্ট যোগ করুন
              </p>
            </div>
          ) : (
            <div className="flex">
              {/* Fixed Product Column */}
              <div className="w-96 flex flex-col border-r border-gray-200">
                {/* Fixed Column Header */}
                <div
                  className="shrink-0 border-b border-gray-200 bg-linear-to-r from-gray-50 to-white"
                  style={{ height: `${HEADER_HEIGHT}px` }}
                >
                  <div className="h-full flex flex-col justify-center p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Target className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">
                          প্রোডাক্ট ও লক্ষ্যমাত্রা
                        </h3>
                        {!compactView && (
                          <p className="text-sm text-gray-600">
                            মূল্য | উদ্বোধনী | বিক্রয় লক্ষ্য | উৎপাদন লক্ষ্য
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product List */}
                <div className="flex-1" ref={fixedColumnRef}>
                  {products.map((product) => {
                    const stats = calculateProductStats(product);

                    return (
                      <div
                        key={product.id}
                        className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                        style={{ height: `${ROW_HEIGHT}px` }}
                      >
                        <div className="h-full p-4">
                          {/* Product Name */}
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4
                                className={`${
                                  compactView
                                    ? "text-sm font-bold"
                                    : "text-sm font-semibold"
                                } text-gray-900`}
                              >
                                {product.name}
                              </h4>
                              {!compactView && (
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                    <Hash className="inline h-3 w-3 mr-1" />{" "}
                                    {product.code}
                                  </div>
                                  <div className="text-xs text-gray-500 bg-blue-100 px-2 py-0.5 rounded">
                                    {product.sku}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Summary Inputs */}
                          {!compactView && (
                            <>
                              <div className="grid grid-cols-4 gap-2 mb-3">
                                {/* Price Input */}
                                <div className="relative">
                                  <label className="block text-xs text-gray-500 mb-1">
                                    মূল্য
                                  </label>
                                  <input
                                    ref={(el) => {
                                      inputRefs.current[`${product.id}-price`] =
                                        el;
                                    }}
                                    type="number"
                                    value={product.price || 0}
                                    onChange={(e) =>
                                      handleSummaryChange(
                                        product.id,
                                        "price",
                                        e.target.value
                                      )
                                    }
                                    onBlur={(e) =>
                                      updateSummaryData(
                                        product.id,
                                        "price",
                                        e.target.value
                                      )
                                    }
                                    onKeyPress={(e) =>
                                      handleKeyPress(
                                        e,
                                        () =>
                                          updateSummaryData(
                                            product.id,
                                            "price",
                                            e.currentTarget.value
                                          ),
                                        `${product.id}-opening`
                                      )
                                    }
                                    className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                                      savedFields.has(`${product.id}-price`)
                                        ? "border-green-500 bg-green-50"
                                        : failedFields.has(
                                            `${product.id}-price`
                                          )
                                        ? "border-red-500 bg-red-50"
                                        : "border-gray-300"
                                    }`}
                                    min="0"
                                    placeholder="৳"
                                    disabled={saving[`${product.id}-price`]}
                                  />
                                  {saving[`${product.id}-price`] && (
                                    <div className="absolute top-1/2 right-2 -translate-y-1/2">
                                      <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                                    </div>
                                  )}
                                </div>

                                {/* Opening Input */}
                                <div className="relative">
                                  <label className="block text-xs text-gray-500 mb-1">
                                    উদ্বোধনী
                                  </label>
                                  <input
                                    ref={(el) => {
                                      inputRefs.current[
                                        `${product.id}-opening`
                                      ] = el;
                                    }}
                                    type="number"
                                    value={product.opening || 0}
                                    onChange={(e) =>
                                      handleSummaryChange(
                                        product.id,
                                        "opening",
                                        e.target.value
                                      )
                                    }
                                    onBlur={(e) =>
                                      updateSummaryData(
                                        product.id,
                                        "opening",
                                        e.target.value
                                      )
                                    }
                                    onKeyPress={(e) =>
                                      handleKeyPress(
                                        e,
                                        () =>
                                          updateSummaryData(
                                            product.id,
                                            "opening",
                                            e.currentTarget.value
                                          ),
                                        `${product.id}-sales_target`
                                      )
                                    }
                                    className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                                      savedFields.has(`${product.id}-opening`)
                                        ? "border-green-500 bg-green-50"
                                        : failedFields.has(
                                            `${product.id}-opening`
                                          )
                                        ? "border-red-500 bg-red-50"
                                        : "border-gray-300"
                                    }`}
                                    min="0"
                                    placeholder="0"
                                    disabled={saving[`${product.id}-opening`]}
                                  />
                                  {saving[`${product.id}-opening`] && (
                                    <div className="absolute top-1/2 right-2 -translate-y-1/2">
                                      <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                                    </div>
                                  )}
                                </div>

                                {/* Sales Target Input */}
                                <div className="relative">
                                  <label className="block text-xs text-gray-500 mb-1">
                                    বিক্রয় লক্ষ্য
                                  </label>
                                  <input
                                    ref={(el) => {
                                      inputRefs.current[
                                        `${product.id}-sales_target`
                                      ] = el;
                                    }}
                                    type="number"
                                    value={product.sales_target || 0}
                                    onChange={(e) =>
                                      handleSummaryChange(
                                        product.id,
                                        "sales_target",
                                        e.target.value
                                      )
                                    }
                                    onBlur={(e) =>
                                      updateSummaryData(
                                        product.id,
                                        "sales_target",
                                        e.target.value
                                      )
                                    }
                                    onKeyPress={(e) =>
                                      handleKeyPress(e, () =>
                                        updateSummaryData(
                                          product.id,
                                          "sales_target",
                                          e.currentTarget.value
                                        )
                                      )
                                    }
                                    className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                                      savedFields.has(
                                        `${product.id}-sales_target`
                                      )
                                        ? "border-green-500 bg-green-50"
                                        : failedFields.has(
                                            `${product.id}-sales_target`
                                          )
                                        ? "border-red-500 bg-red-50"
                                        : "border-gray-300"
                                    }`}
                                    min="0"
                                    placeholder="0"
                                    disabled={
                                      saving[`${product.id}-sales_target`]
                                    }
                                  />
                                  {saving[`${product.id}-sales_target`] && (
                                    <div className="absolute top-1/2 right-2 -translate-y-1/2">
                                      <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                                    </div>
                                  )}
                                </div>

                                {/* Production Target Display */}
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">
                                    উৎপাদন লক্ষ্য
                                  </label>
                                  <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-gray-50 text-center font-medium">
                                    {product.production_target || 0}
                                  </div>
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div className="mt-2">
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-gray-600">
                                    অগ্রগতি: {stats.total_production}/
                                    {stats.floor_production_target}
                                  </span>
                                  <span
                                    className={`font-semibold ${
                                      stats.completion_percentage >= 100
                                        ? "text-green-600"
                                        : stats.completion_percentage >= 70
                                        ? "text-blue-600"
                                        : stats.completion_percentage >= 40
                                        ? "text-yellow-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {stats.completion_percentage}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="h-2 rounded-full transition-all duration-500"
                                    style={{
                                      width: `${Math.min(
                                        stats.completion_percentage,
                                        100
                                      )}%`,
                                      backgroundColor:
                                        stats.completion_percentage >= 100
                                          ? "#10b981"
                                          : stats.completion_percentage >= 70
                                          ? "#3b82f6"
                                          : stats.completion_percentage >= 40
                                          ? "#f59e0b"
                                          : "#ef4444",
                                    }}
                                  ></div>
                                </div>
                                <div className="grid grid-cols-3 gap-1 text-[10px] text-gray-500 mt-1">
                                  <div className="text-center">
                                    উৎপাদন: {stats.total_production}
                                  </div>
                                  <div className="text-center">
                                    বাকি: {stats.remaining_production}
                                  </div>
                                  <div className="text-center">
                                    মোট: {stats.current_total}
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Section Summary Row */}
                  <div
                    className="border-t-2 border-gray-800 bg-linear-to-r from-gray-50 to-white sticky bottom-0"
                    style={{ height: `${ROW_HEIGHT + 40}px` }}
                  >
                    <div className="h-full p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <BarChart3 className="h-5 w-5 text-gray-700" />
                        <h4 className="font-bold text-gray-900">
                          সেকশন সারসংক্ষেপ
                        </h4>
                      </div>

                      <div className="space-y-2">
                        {!compactView && (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">
                                উৎপাদন লক্ষ্য (২০%+)
                              </span>
                              <span className="font-semibold text-gray-900">
                                {sectionTotals.production_target.toLocaleString(
                                  "bn-BD"
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">
                                মৌলিক উৎপাদন লক্ষ্য
                              </span>
                              <span className="font-semibold text-gray-900">
                                {sectionTotals.floor_target.toLocaleString(
                                  "bn-BD"
                                )}
                              </span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            মোট উৎপাদন
                          </span>
                          <span className="font-semibold text-gray-900">
                            {sectionTotals.total_carton.toLocaleString("bn-BD")}
                          </span>
                        </div>
                        {!compactView && (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">
                                বাকি পরিমাণ
                              </span>
                              <span className="font-semibold text-gray-900">
                                {sectionTotals.remaining_production.toLocaleString(
                                  "bn-BD"
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">
                                মোট মূল্য
                              </span>
                              <span className="font-semibold text-blue-600">
                                ৳
                                {sectionTotals.total_value.toLocaleString(
                                  "bn-BD"
                                )}
                              </span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            মোট ব্যাচ
                          </span>
                          <span className="font-semibold text-gray-900">
                            {sectionTotals.total_batch.toLocaleString("bn-BD")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scrollable Daily Production Area */}
              <div className="flex-1 overflow-hidden">
                <div
                  className="overflow-x-auto overflow-y-hidden h-full"
                  ref={scrollContainerRef}
                >
                  {/* Fixed Header Row */}
                  <div
                    className="sticky top-0 z-20 border-b border-gray-200"
                    style={{ height: `${HEADER_HEIGHT}px` }}
                    ref={headerRef}
                  >
                    <div className="flex h-full bg-linear-to-r from-blue-50 to-white">
                      {daysArray.map((day) => {
                        const isWeekendDay = isWeekend(day);
                        const isTodayDay = isToday(day);
                        const checkValue = entries?.data.find(d => d.date === day)?.checked ?? false;
                        return (
                          <div
                            key={day}
                            className={`w-52 shrink-0 border-r border-gray-200 flex flex-col ${
                              isWeekendDay
                                ? "bg-red-50"
                                : isTodayDay
                                ? "bg-green-50"
                                : "bg-linear-to-b from-blue-50 to-white"
                            }`}
                            style={{ height: `${HEADER_HEIGHT}px` }}
                          >
                            <div className="h-full flex flex-col">
                              <div className="flex-1 flex flex-col items-center justify-center p-2">
                                <div
                                  className={`${
                                    compactView ? "text-base" : "text-lg"
                                  } font-bold ${
                                    isTodayDay
                                      ? "text-green-700"
                                      : isWeekendDay
                                      ? "text-red-700"
                                      : "text-blue-700"
                                  }`}
                                >
                                  <span>{day}</span>
                                </div>
                                {!compactView && (
                                  <div
                                    className={`text-sm mt-1 ${
                                      isWeekendDay
                                        ? "text-red-600 font-semibold"
                                        : "text-gray-600"
                                    }`}
                                  >
                                    <span>
                                      {getDayName(day)} {isTodayDay && " (আজ)"}{" "}
                                      {isWeekendDay && " (ছুটি)"}
                                    </span>
                                    <input
                                      type="checkbox"
                                      checked={checkValue}
                                      onChange={(e) =>
                                        handleCheck(day, e.target.checked)
                                      }
                                    />
                                  </div>
                                )}
                              </div>

                              <div className="flex border-t border-gray-200">
                                <div
                                  className={`flex-1 text-center py-2 font-medium ${
                                    isWeekendDay
                                      ? "bg-red-100 text-red-700"
                                      : isTodayDay
                                      ? "bg-green-100 text-green-700"
                                      : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  ব্যাচ
                                </div>
                                <div
                                  className={`flex-1 text-center py-2 font-medium border-l border-gray-200 ${
                                    isWeekendDay
                                      ? "bg-red-100 text-red-700"
                                      : isTodayDay
                                      ? "bg-green-100 text-green-700"
                                      : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  কার্টন
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Production Data Rows */}
                  <div className="min-w-max">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="flex border-b border-gray-200 hover:bg-gray-50 transition-colors"
                        style={{ height: `${ROW_HEIGHT}px` }}
                      >
                        {product.data.map((prod, index) => {
                          const day = index + 1;
                          const isWeekendDay = isWeekend(day);
                          const isTodayDay = isToday(day);

                          return (
                            <div
                              key={`${product.id}-${day}`}
                              className={`w-52 shrink-0 border-r border-gray-200 p-1 ${
                                isWeekendDay
                                  ? "bg-red-50 hover:bg-red-100"
                                  : isTodayDay
                                  ? "bg-green-50 hover:bg-green-100"
                                  : "hover:bg-blue-50"
                              }`}
                              style={{ height: `${ROW_HEIGHT}px` }}
                            >
                              <div className="h-full flex items-center">
                                <div className="flex w-full">
                                  {/* Batch Input */}
                                  <div
                                    className={`flex-1 border-r border-gray-200 relative ${
                                      isWeekendDay
                                        ? "bg-red-50"
                                        : isTodayDay
                                        ? "bg-green-50"
                                        : ""
                                    }`}
                                  >
                                    <input
                                      ref={(el) => {
                                        inputRefs.current[
                                          `${product.id}-${day}-batch`
                                        ] = el;
                                      }}
                                      type="number"
                                      value={prod.batch || 0}
                                      onChange={(e) =>
                                        handleProductionChange(
                                          product.id,
                                          day,
                                          "batch",
                                          e.target.value
                                        )
                                      }
                                      onBlur={(e) =>
                                        updateProductionData(
                                          product.id,
                                          day,
                                          "batch",
                                          e.target.value
                                        )
                                      }
                                      onKeyPress={(e) =>
                                        handleKeyPress(
                                          e,
                                          () =>
                                            updateProductionData(
                                              product.id,
                                              day,
                                              "batch",
                                              e.currentTarget.value
                                            ),
                                          `${product.id}-${day}-carton`
                                        )
                                      }
                                      className={`text-sm w-full h-full text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent transition-all ${
                                        isWeekendDay
                                          ? "placeholder-red-300"
                                          : isTodayDay
                                          ? "placeholder-green-300"
                                          : "placeholder-gray-300"
                                      } ${
                                        savedFields.has(
                                          `${product.id}-${day}-batch`
                                        )
                                          ? "border-green-500 bg-green-50"
                                          : failedFields.has(
                                              `${product.id}-${day}-batch`
                                            )
                                          ? "border-red-500 bg-red-50"
                                          : "border-none"
                                      }`}
                                      min="0"
                                      placeholder="0"
                                      disabled={
                                        saving[`${product.id}-${day}-batch`]
                                      }
                                    />
                                    {saving[`${product.id}-${day}-batch`] && (
                                      <div className="absolute top-1/2 right-2 -translate-y-1/2">
                                        <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                                      </div>
                                    )}
                                  </div>

                                  {/* Carton Input */}
                                  <div
                                    className={`flex-1 relative ${
                                      isWeekendDay
                                        ? "bg-red-50"
                                        : isTodayDay
                                        ? "bg-green-50"
                                        : ""
                                    }`}
                                  >
                                    <input
                                      ref={(el) => {
                                        inputRefs.current[
                                          `${product.id}-${day}-carton`
                                        ] = el;
                                      }}
                                      type="number"
                                      value={prod.carton || 0}
                                      onChange={(e) =>
                                        handleProductionChange(
                                          product.id,
                                          day,
                                          "carton",
                                          e.target.value
                                        )
                                      }
                                      onBlur={(e) =>
                                        updateProductionData(
                                          product.id,
                                          day,
                                          "carton",
                                          e.target.value
                                        )
                                      }
                                      onKeyPress={(e) => {
                                        if (e.key === "Enter") {
                                          updateProductionData(
                                            product.id,
                                            day,
                                            "carton",
                                            e.currentTarget.value
                                          );
                                          // Focus to next day's batch input
                                          const nextDay = day + 1;
                                          if (nextDay <= lastDay) {
                                            const nextInput =
                                              inputRefs.current[
                                                `${product.id}-${nextDay}-batch`
                                              ];
                                            if (nextInput) {
                                              nextInput.focus();
                                            }
                                          }
                                        }
                                      }}
                                      className={`text-sm w-full h-full text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent transition-all ${
                                        isWeekendDay
                                          ? "placeholder-red-300"
                                          : isTodayDay
                                          ? "placeholder-green-300"
                                          : "placeholder-gray-300"
                                      } ${
                                        savedFields.has(
                                          `${product.id}-${day}-carton`
                                        )
                                          ? "border-green-500 bg-green-50"
                                          : failedFields.has(
                                              `${product.id}-${day}-carton`
                                            )
                                          ? "border-red-500 bg-red-50"
                                          : "border-none"
                                      }`}
                                      min="0"
                                      placeholder="0"
                                      disabled={
                                        saving[`${product.id}-${day}-carton`]
                                      }
                                    />
                                    {saving[`${product.id}-${day}-carton`] && (
                                      <div className="absolute top-1/2 right-2 -translate-y-1/2">
                                        <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}

                    {/* Totals Row */}
                    <div
                      className="flex border-t-2 border-gray-800 bg-linear-to-r from-gray-100 to-white"
                      style={{ height: `${ROW_HEIGHT}px` }}
                    >
                      {daysArray.map((day, dayIndex) => {
                        const batchTotal = getColumnTotal(dayIndex, "batch");
                        const cartonTotal = getColumnTotal(dayIndex, "carton");
                        const isWeekendDay = isWeekend(day);
                        const isTodayDay = isToday(day);

                        return (
                          <div
                            key={`total-${day}`}
                            className={`w-52 shrink-0 border-r border-gray-200 ${
                              isWeekendDay
                                ? "bg-red-100"
                                : isTodayDay
                                ? "bg-green-100"
                                : "bg-gray-100"
                            }`}
                            style={{ height: `${ROW_HEIGHT}px` }}
                          >
                            <div className="h-full flex items-center">
                              <div className="flex w-full">
                                <div
                                  className={`flex-1 border-r border-gray-300 ${
                                    isWeekendDay
                                      ? "bg-red-100"
                                      : isTodayDay
                                      ? "bg-green-100"
                                      : "bg-gray-100"
                                  }`}
                                >
                                  <div
                                    className={`h-full flex items-center justify-center font-bold ${
                                      compactView ? "text-base" : "text-lg"
                                    } ${
                                      isTodayDay
                                        ? "text-green-700"
                                        : isWeekendDay
                                        ? "text-red-700"
                                        : "text-gray-900"
                                    }`}
                                  >
                                    {batchTotal.toLocaleString("bn-BD")}
                                  </div>
                                </div>
                                <div
                                  className={`flex-1 ${
                                    isWeekendDay
                                      ? "bg-red-100"
                                      : isTodayDay
                                      ? "bg-green-100"
                                      : "bg-gray-100"
                                  }`}
                                >
                                  <div
                                    className={`h-full flex items-center justify-center font-bold ${
                                      compactView ? "text-base" : "text-lg"
                                    } ${
                                      isTodayDay
                                        ? "text-green-700"
                                        : isWeekendDay
                                        ? "text-red-700"
                                        : "text-gray-900"
                                    }`}
                                  >
                                    {cartonTotal.toLocaleString("bn-BD")}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend Section */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="font-medium text-blue-800">লোডিং এনিমেশন</span>
              </div>
              <p className="text-sm text-blue-600">
                সংরক্ষণ চলাকালীন স্পিনার দেখায়
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="font-medium text-green-800">সফল সংরক্ষণ</span>
              </div>
              <p className="text-sm text-green-600">
                সবুজ বর্ডার ও ব্যাকগ্রাউন্ড দেখায়
              </p>
            </div>

            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="font-medium text-red-800">সংরক্ষণ ব্যর্থ</span>
              </div>
              <p className="text-sm text-red-600">
                লাল বর্ডার ও ব্যাকগ্রাউন্ড দেখায়
              </p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-purple-800">
                  রিয়েল-টাইম আপডেট
                </span>
              </div>
              <p className="text-sm text-purple-600">
                onBlur/Enter এ স্বয়ংক্রিয়ভাবে সেভ হয়
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
