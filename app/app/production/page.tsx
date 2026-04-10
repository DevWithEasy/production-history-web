"use client";

import { Product } from "@/types/Product.Types";
import Firebase from "@/utils/firebase";
import { getPeriod } from "@/utils/storage";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle,
  Database,
  DollarSign,
  Factory,
  FolderOpen,
  Info,
  Loader2,
  Minus,
  Package,
  PieChart,
  RefreshCw,
  ShoppingBag,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type ProductWithId = Product & { id: string };
type SectionData = {
  name: string;
  totalValue: number;
  totalBatch: number;
  totalCarton: number;
  totalManpower: number;
  products: ProductWithId[];
};

type DailyTrendData = {
  date: number;
  value: number;
  carton: number;
  batch: number;
};

type ManPowerData = {
  date: number;
  [key: string]: number;
  total_manpower: number;
};

type ManPower = {
  data: ManPowerData[];
};

export default function Dashboard() {
  const { year, month } = getPeriod();
  const [products, setProducts] = useState<ProductWithId[]>([]);
  const [prevMonthProducts, setPrevMonthProducts] = useState<ProductWithId[]>(
    [],
  );
  const [manpower, setManpower] = useState<ManPower | null>(null);
  const [prevMonthManpower, setPrevMonthManpower] = useState<ManPower | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const monthNames = [
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
  ];

  const getPreviousMonth = useCallback((month: number, year: number) => {
    if (month === 0) {
      return { month: 11, year: year - 1 };
    }
    return { month: month - 1, year };
  }, []);

  // ব্যবহারকারীর সিলেক্ট করা মাস এবং বছর
  const selectedMonthName = monthNames[month - 1];
  const prevMonthInfo = getPreviousMonth(month - 1, year);
  const prevMonthName = monthNames[prevMonthInfo.month];

  const calculatePercentageChange = useCallback(
    (current: number, previous: number) => {
      if (previous === 0) {
        return current > 0 ? 100 : 0;
      }
      return ((current - previous) / previous) * 100;
    },
    [],
  );

  const getChangeIndicator = (percentage: number) => {
    if (percentage > 5)
      return {
        icon: ArrowUpRight,
        color: "text-green-600",
        bgColor: "bg-green-100",
      };
    if (percentage < -5)
      return {
        icon: ArrowDownRight,
        color: "text-red-600",
        bgColor: "bg-red-100",
      };
    return { icon: Minus, color: "text-yellow-600", bgColor: "bg-yellow-100" };
  };

  const formatSectionName = useCallback((sectionName: string) => {
    if (!sectionName) return "অজানা";

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
      bun_ruti: "বন রুটি",
      uncategorized: "অন্যান্য",
    };

    return (
      sectionMap[sectionName.toLowerCase()] ||
      sectionName
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    );
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // সিলেক্ট করা পিরিয়ডের ডাটা লোড করুন
        const currentProductsData = await Firebase.getProductsByPeriod<Product>(
          year,
          selectedMonthName,
        );

        const currentProductsWithId: ProductWithId[] = currentProductsData.map(
          (product: any) => ({
            ...product,
            id: product.id || product.code || `product-${Math.random()}`,
            section: product.section?.toLowerCase() || "uncategorized",
          }),
        );

        setProducts(currentProductsWithId);

        // পূর্ববর্তী মাসের ডাটা লোড করুন
        const prevProductsData = await Firebase.getProductsByPeriod<Product>(
          prevMonthInfo.year,
          prevMonthName,
        );

        const prevProductsWithId: ProductWithId[] = prevProductsData.map(
          (product: any) => ({
            ...product,
            id: product.id || product.code || `product-${Math.random()}-prev`,
            section: product.section?.toLowerCase() || "uncategorized",
          }),
        );

        setPrevMonthProducts(prevProductsWithId);

        try {
          const currentManpowerData =
            await Firebase.getManpowerByPeriod<ManPower>(
              year,
              selectedMonthName,
            );
          setManpower(currentManpowerData);
        } catch (manpowerError) {
          console.warn("Current manpower data not available:", manpowerError);
          setManpower(null);
        }

        try {
          const prevManpowerData = await Firebase.getManpowerByPeriod<ManPower>(
            prevMonthInfo.year,
            prevMonthName,
          );
          setPrevMonthManpower(prevManpowerData);
        } catch (prevManpowerError) {
          console.warn(
            "Previous manpower data not available:",
            prevManpowerError,
          );
          setPrevMonthManpower(null);
        }
      } catch (err) {
        console.error("Error loading data from Firebase:", err);
        setError(
          `ডাটা লোড করতে সমস্যা: ${
            err instanceof Error ? err.message : "অজানা সমস্যা"
          }`,
        );
        setProducts([]);
        setPrevMonthProducts([]);
        setManpower(null);
        setPrevMonthManpower(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedMonthName, year, prevMonthName, prevMonthInfo.year, refreshKey]);

  const extractAllSections = useCallback((productsData: ProductWithId[]) => {
    const sections = new Set<string>();
    productsData.forEach((product) => {
      if (product.section) {
        sections.add(product.section.toLowerCase());
      }
    });
    return Array.from(sections);
  }, []);

  const allSections = useMemo(() => {
    const sections = new Set<string>();

    products.forEach((product) => {
      if (product.section) {
        sections.add(product.section.toLowerCase());
      }
    });

    prevMonthProducts.forEach((product) => {
      if (product.section) {
        sections.add(product.section.toLowerCase());
      }
    });

    if (manpower?.data && manpower.data.length > 0) {
      const firstDay = manpower.data[0];
      Object.keys(firstDay).forEach((key) => {
        if (key !== "date" && key !== "total_manpower") {
          sections.add(key.toLowerCase());
        }
      });
    }

    if (prevMonthManpower?.data && prevMonthManpower.data.length > 0) {
      const firstDay = prevMonthManpower.data[0];
      Object.keys(firstDay).forEach((key) => {
        if (key !== "date" && key !== "total_manpower") {
          sections.add(key.toLowerCase());
        }
      });
    }

    return Array.from(sections).sort();
  }, [products, prevMonthProducts, manpower, prevMonthManpower]);

  const calculateSectionManpower = useCallback(
    (manpowerData: ManPower | null, allSectionsList: string[]) => {
      const sectionManpower: Record<string, number> = {};

      allSectionsList.forEach((section) => {
        sectionManpower[section] = 0;
      });

      if (!manpowerData || !manpowerData.data) {
        return { sectionManpower, total_manpower: 0 };
      }

      let totalManpower = 0;

      manpowerData.data.forEach((day) => {
        Object.keys(day).forEach((key) => {
          if (key === "total_manpower") {
            totalManpower += day[key] || 0;
          } else if (key !== "date") {
            const sectionKey = key.toLowerCase();
            if (sectionManpower[sectionKey] !== undefined) {
              sectionManpower[sectionKey] += day[key] || 0;
            } else {
              sectionManpower[sectionKey] = day[key] || 0;
            }
          }
        });
      });

      return { sectionManpower, total_manpower: totalManpower };
    },
    [],
  );

  const currentMonthStats = useMemo(() => {
    const stats = {
      totalValue: 0,
      totalBatch: 0,
      totalCarton: 0,
      totalManpowerFromProducts: 0,
      uniqueWorkingDays: new Set<number>(),
      totalProductsCount: 0,
    };

    const sections: Record<string, SectionData> = {};
    const dailyData: Record<number, DailyTrendData> = {};

    products.forEach((product) => {
      stats.totalProductsCount++;

      const sectionName = product.section?.toLowerCase() || "uncategorized";

      if (!sections[sectionName]) {
        sections[sectionName] = {
          name: sectionName,
          totalValue: 0,
          totalBatch: 0,
          totalCarton: 0,
          totalManpower: 0,
          products: [],
        };
      }

      sections[sectionName].products.push(product);

      product.data.forEach((day) => {
        const productionValue = day.carton * product.price;

        stats.totalValue += productionValue;
        stats.totalBatch += day.batch;
        stats.totalCarton += day.carton;
        stats.totalManpowerFromProducts += day.manpower;

        if (day.manpower > 0) {
          stats.uniqueWorkingDays.add(day.date);
        }

        sections[sectionName].totalValue += productionValue;
        sections[sectionName].totalBatch += day.batch;
        sections[sectionName].totalCarton += day.carton;
        sections[sectionName].totalManpower += day.manpower;

        if (!dailyData[day.date]) {
          dailyData[day.date] = {
            date: day.date,
            value: 0,
            carton: 0,
            batch: 0,
          };
        }
        dailyData[day.date].value += productionValue;
        dailyData[day.date].carton += day.carton;
        dailyData[day.date].batch += day.batch;
      });
    });

    const sectionArray = Object.values(sections);
    sectionArray.sort((a, b) => b.totalValue - a.totalValue);

    const dailyTrendData: DailyTrendData[] = Object.values(dailyData).sort(
      (a, b) => a.date - b.date,
    );

    const { sectionManpower, total_manpower } = calculateSectionManpower(
      manpower,
      allSections,
    );

    const valuePerManpower =
      total_manpower > 0 ? stats.totalValue / total_manpower : 0;
    const cartonPerManpower =
      total_manpower > 0 ? stats.totalCarton / total_manpower : 0;

    return {
      stats: {
        ...stats,
        sectionManpower,
        totalManpowerFromData: total_manpower,
      },
      sectionData: sectionArray,
      topSections: sectionArray.slice(0, 3),
      dailyTrend: dailyTrendData,
      productivity: { valuePerManpower, cartonPerManpower },
    };
  }, [products, manpower, allSections, calculateSectionManpower]);

  const previousMonthStats = useMemo(() => {
    const stats = {
      totalValue: 0,
      totalBatch: 0,
      totalCarton: 0,
      totalManpowerFromProducts: 0,
      uniqueWorkingDays: new Set<number>(),
      totalProductsCount: 0,
    };

    const sections: Record<string, SectionData> = {};

    prevMonthProducts.forEach((product) => {
      stats.totalProductsCount++;

      const sectionName = product.section?.toLowerCase() || "uncategorized";

      if (!sections[sectionName]) {
        sections[sectionName] = {
          name: sectionName,
          totalValue: 0,
          totalBatch: 0,
          totalCarton: 0,
          totalManpower: 0,
          products: [],
        };
      }

      sections[sectionName].products.push(product);

      product.data.forEach((day) => {
        const productionValue = day.carton * product.price;

        stats.totalValue += productionValue;
        stats.totalBatch += day.batch;
        stats.totalCarton += day.carton;
        stats.totalManpowerFromProducts += day.manpower;

        if (day.manpower > 0) {
          stats.uniqueWorkingDays.add(day.date);
        }

        sections[sectionName].totalValue += productionValue;
        sections[sectionName].totalBatch += day.batch;
        sections[sectionName].totalCarton += day.carton;
        sections[sectionName].totalManpower += day.manpower;
      });
    });

    const sectionArray = Object.values(sections);
    sectionArray.sort((a, b) => b.totalValue - a.totalValue);

    const { sectionManpower, total_manpower } = calculateSectionManpower(
      prevMonthManpower,
      allSections,
    );

    const valuePerManpower =
      total_manpower > 0 ? stats.totalValue / total_manpower : 0;
    const cartonPerManpower =
      total_manpower > 0 ? stats.totalCarton / total_manpower : 0;

    return {
      stats: {
        ...stats,
        sectionManpower,
        totalManpowerFromData: total_manpower,
      },
      sectionData: sectionArray,
      productivity: { valuePerManpower, cartonPerManpower },
    };
  }, [
    prevMonthProducts,
    prevMonthManpower,
    allSections,
    calculateSectionManpower,
  ]);

  const monthlyComparison = useMemo(() => {
    const current = {
      month: selectedMonthName,
      year: year,
      totalValue: currentMonthStats.stats.totalValue,
      totalBatch: currentMonthStats.stats.totalBatch,
      totalCarton: currentMonthStats.stats.totalCarton,
      sectionManpower: currentMonthStats.stats.sectionManpower,
      totalManpower: currentMonthStats.stats.totalManpowerFromData,
      sectionData: currentMonthStats.sectionData,
      productivity: currentMonthStats.productivity,
      allSections: allSections,
    };

    const previous = {
      month: prevMonthName,
      year: prevMonthInfo.year,
      totalValue: previousMonthStats.stats.totalValue,
      totalBatch: previousMonthStats.stats.totalBatch,
      totalCarton: previousMonthStats.stats.totalCarton,
      sectionManpower: previousMonthStats.stats.sectionManpower,
      totalManpower: previousMonthStats.stats.totalManpowerFromData,
      sectionData: previousMonthStats.sectionData,
      productivity: previousMonthStats.productivity,
      allSections: allSections,
    };

    return { current, previous };
  }, [
    currentMonthStats,
    previousMonthStats,
    selectedMonthName,
    year,
    prevMonthName,
    prevMonthInfo.year,
    allSections,
  ]);

  const getSectionManpower = useCallback(
    (sectionName: string, manpowerData: Record<string, number>) => {
      const normalizedSection = sectionName.toLowerCase();
      return manpowerData[normalizedSection] || 0;
    },
    [],
  );

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString("bn-BD", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("bn-BD");
  };

  const getPercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return (value / total) * 100;
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-gray-50 flex items-center justify-center p-4 font-[family-name:var(--font-tiro-bangla)]">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 mx-auto rounded-full bg-linear-to-br from-blue-500 to-blue-600 animate-pulse flex items-center justify-center">
              <BarChart3 className="h-10 w-10 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              ড্যাশবোর্ড লোড হচ্ছে
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

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Database className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            ডাটা লোডিং ত্রুটি
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-linear-to-br from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            আবার চেষ্টা করুন
          </button>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-yellow-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            কোনো প্রোডাকশন ডাটা নেই
          </h3>
          <p className="text-gray-600 mb-4">
            {selectedMonthName} {year} এর জন্য কোনো প্রোডাকশন ডাটা পাওয়া
            যায়নি।
          </p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-linear-to-br from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            ডাটা রিফ্রেশ করুন
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-linear-to-br from-blue-600 to-blue-700 p-3 rounded-xl">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                প্রোডাকশন ড্যাশবোর্ড
              </h1>
              <p className="text-gray-600">
                {selectedMonthName} {year} - প্রোডাকশন বিশ্লেষণ ও তুলনা
              </p>
            </div>
          </div>
        </div>

        {/* Top Bar */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-linear-to-br from-blue-50 to-white p-4 rounded-xl border border-blue-200">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">সিলেক্ট করা মাস</p>
                    <p className="font-semibold text-blue-700">
                      {selectedMonthName} {year}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-linear-to-br from-gray-50 to-white p-4 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">পূর্ববর্তী মাস</p>
                    <p className="font-semibold text-gray-700">
                      {prevMonthName} {prevMonthInfo.year}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium border border-blue-200">
                প্রোডাক্ট: {currentMonthStats.stats.totalProductsCount}
              </div>
              <div className="px-4 py-2 bg-green-50 text-green-700 rounded-lg font-medium border border-green-200">
                সেকশন: {currentMonthStats.sectionData.length}
              </div>
              <div className="px-4 py-2 bg-orange-50 text-orange-700 rounded-lg font-medium border border-orange-200">
                ম্যানপাওয়ার:{" "}
                {formatNumber(monthlyComparison.current.totalManpower)}
              </div>
            </div>
          </div>

          {/* Refresh Button */}
          <div className="flex justify-end">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
            >
              <RefreshCw className="h-4 w-4" />
              রিফ্রেশ করুন
            </button>
          </div>
        </div>

        {/* Monthly Comparison Banner */}
        <div className="mb-8 bg-linear-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">মাসিক তুলনা</h3>
                <p className="text-gray-600 text-sm">
                  {selectedMonthName} {year} বনাম {prevMonthName}{" "}
                  {prevMonthInfo.year}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">সামগ্রিক পরিবর্তন</div>
              <div
                className={`text-lg font-bold ${
                  monthlyComparison.current.totalValue >=
                  monthlyComparison.previous.totalValue
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {monthlyComparison.current.totalValue >=
                monthlyComparison.previous.totalValue
                  ? "+"
                  : ""}
                {calculatePercentageChange(
                  monthlyComparison.current.totalValue,
                  monthlyComparison.previous.totalValue,
                ).toFixed(1)}
                %
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Production Value Comparison */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">
                    উৎপাদন মূল্য
                  </p>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(monthlyComparison.current.totalValue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    পূর্ববর্তী:{" "}
                    {formatCurrency(monthlyComparison.previous.totalValue)}
                  </p>
                </div>
                {(() => {
                  const percentageChange = calculatePercentageChange(
                    monthlyComparison.current.totalValue,
                    monthlyComparison.previous.totalValue,
                  );
                  const indicator = getChangeIndicator(percentageChange);
                  const IndicatorIcon = indicator.icon;
                  return (
                    <div
                      className={`flex items-center gap-1 px-2 py-1 rounded-full ${indicator.bgColor}`}
                    >
                      <IndicatorIcon className={`h-3 w-3 ${indicator.color}`} />
                      <span
                        className={`text-xs font-medium ${indicator.color}`}
                      >
                        {percentageChange > 0 ? "+" : ""}
                        {percentageChange.toFixed(1)}%
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Total Manpower Comparison */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Users className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">
                    মোট ম্যানপাওয়ার
                  </p>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xl font-bold text-gray-900">
                    {formatNumber(monthlyComparison.current.totalManpower)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    পূর্ববর্তী:{" "}
                    {formatNumber(monthlyComparison.previous.totalManpower)}
                  </p>
                </div>
                {(() => {
                  const percentageChange = calculatePercentageChange(
                    monthlyComparison.current.totalManpower,
                    monthlyComparison.previous.totalManpower,
                  );
                  const indicator = getChangeIndicator(percentageChange);
                  const IndicatorIcon = indicator.icon;
                  return (
                    <div
                      className={`flex items-center gap-1 px-2 py-1 rounded-full ${indicator.bgColor}`}
                    >
                      <IndicatorIcon className={`h-3 w-3 ${indicator.color}`} />
                      <span
                        className={`text-xs font-medium ${indicator.color}`}
                      >
                        {percentageChange > 0 ? "+" : ""}
                        {percentageChange.toFixed(1)}%
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Carton Comparison */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <ShoppingBag className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">
                    মোট কার্টন
                  </p>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xl font-bold text-gray-900">
                    {formatNumber(monthlyComparison.current.totalCarton)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    পূর্ববর্তী:{" "}
                    {formatNumber(monthlyComparison.previous.totalCarton)}
                  </p>
                </div>
                {(() => {
                  const percentageChange = calculatePercentageChange(
                    monthlyComparison.current.totalCarton,
                    monthlyComparison.previous.totalCarton,
                  );
                  const indicator = getChangeIndicator(percentageChange);
                  const IndicatorIcon = indicator.icon;
                  return (
                    <div
                      className={`flex items-center gap-1 px-2 py-1 rounded-full ${indicator.bgColor}`}
                    >
                      <IndicatorIcon className={`h-3 w-3 ${indicator.color}`} />
                      <span
                        className={`text-xs font-medium ${indicator.color}`}
                      >
                        {percentageChange > 0 ? "+" : ""}
                        {percentageChange.toFixed(1)}%
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Productivity Comparison */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">
                    উৎপাদনশীলতা
                  </p>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(
                      monthlyComparison.current.productivity.valuePerManpower,
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    পূর্ববর্তী:{" "}
                    {formatCurrency(
                      monthlyComparison.previous.productivity.valuePerManpower,
                    )}
                  </p>
                </div>
                {(() => {
                  const percentageChange = calculatePercentageChange(
                    monthlyComparison.current.productivity.valuePerManpower,
                    monthlyComparison.previous.productivity.valuePerManpower,
                  );
                  const indicator = getChangeIndicator(percentageChange);
                  const IndicatorIcon = indicator.icon;
                  return (
                    <div
                      className={`flex items-center gap-1 px-2 py-1 rounded-full ${indicator.bgColor}`}
                    >
                      <IndicatorIcon className={`h-3 w-3 ${indicator.color}`} />
                      <span
                        className={`text-xs font-medium ${indicator.color}`}
                      >
                        {percentageChange > 0 ? "+" : ""}
                        {percentageChange.toFixed(1)}%
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Current Month Production Value */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-bold text-gray-800">
                  সিলেক্ট করা মাসের উৎপাদন
                </h4>
                <p className="text-gray-600 text-sm">
                  {formatNumber(monthlyComparison.current.totalCarton)} কার্টন
                </p>
              </div>
              <div className="p-3 bg-linear-to-br from-blue-100 to-blue-200 rounded-xl">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(monthlyComparison.current.totalValue)}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">পূর্ববর্তী মাস</span>
                  <span className="font-medium text-gray-800">
                    {formatCurrency(monthlyComparison.previous.totalValue)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Current Month Manpower */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-bold text-gray-800">
                  সিলেক্ট করা মাসের ম্যানপাওয়ার
                </h4>
                <p className="text-gray-600 text-sm">
                  {
                    Object.keys(monthlyComparison.current.sectionManpower)
                      .length
                  }{" "}
                  টি সেকশন
                </p>
              </div>
              <div className="p-3 bg-linear-to-br from-orange-100 to-orange-200 rounded-xl">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-gray-900">
                {formatNumber(monthlyComparison.current.totalManpower)}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">পূর্ববর্তী মাস</span>
                  <span className="font-medium text-gray-800">
                    {formatNumber(monthlyComparison.previous.totalManpower)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Productivity */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-bold text-gray-800">উৎপাদনশীলতা</h4>
                <p className="text-gray-600 text-sm">
                  মূল্য/ম্যানপাওয়ার অনুপাত
                </p>
              </div>
              <div className="p-3 bg-linear-to-br from-purple-100 to-purple-200 rounded-xl">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  monthlyComparison.current.productivity.valuePerManpower,
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">পূর্ববর্তী মাস</span>
                  <span className="font-medium text-gray-800">
                    {formatCurrency(
                      monthlyComparison.previous.productivity.valuePerManpower,
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section Activity */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-bold text-gray-800">
                  সক্রিয় সেকশন
                </h4>
                <p className="text-gray-600 text-sm">
                  পূর্ববর্তী মাসে{" "}
                  {monthlyComparison.previous.sectionData.length} টি
                </p>
              </div>
              <div className="p-3 bg-linear-to-br from-green-100 to-green-200 rounded-xl">
                <Factory className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-gray-900">
                {currentMonthStats.sectionData.length} টি
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">নতুন সেকশন</span>
                  <span className="font-medium text-green-600">
                    {
                      currentMonthStats.sectionData.filter(
                        (s) =>
                          !previousMonthStats.sectionData.find(
                            (ps) => ps.name === s.name,
                          ),
                      ).length
                    }{" "}
                    টি
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Overview */}
        <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FolderOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  সেকশন ওভারভিউ
                </h3>
                <p className="text-gray-600 text-sm">
                  {allSections.length} টি সেকশন |{" "}
                  {currentMonthStats.sectionData.length} টি সক্রিয়
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {allSections.map((section) => {
              const currentSectionData = currentMonthStats.sectionData.find(
                (s) => s.name === section,
              );
              const prevSectionData = previousMonthStats.sectionData.find(
                (s) => s.name === section,
              );

              const isNewSection = currentSectionData && !prevSectionData;
              const isInactiveThisMonth =
                !currentSectionData && prevSectionData;
              const isActiveBoth = currentSectionData && prevSectionData;

              return (
                <div
                  key={section}
                  className={`p-4 rounded-xl border transition-all ${
                    isNewSection
                      ? "border-green-200 bg-green-50"
                      : isInactiveThisMonth
                        ? "border-gray-200 bg-gray-50"
                        : "border-blue-100 bg-blue-50 hover:bg-blue-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">
                      {formatSectionName(section)}
                    </h4>
                    {isNewSection && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                        নতুন
                      </span>
                    )}
                    {isInactiveThisMonth && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full">
                        নিষ্ক্রিয়
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {currentSectionData ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">মূল্য</span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(currentSectionData.totalValue)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            প্রোডাক্ট
                          </span>
                          <span className="font-medium text-gray-900">
                            {formatNumber(currentSectionData.products.length)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            ম্যানপাওয়ার
                          </span>
                          <span className="font-medium text-gray-900">
                            {formatNumber(
                              getSectionManpower(
                                section,
                                monthlyComparison.current.sectionManpower,
                              ),
                            )}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-2">
                        <span className="text-sm text-gray-500">
                          এই মাসে উৎপাদন নেই
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column - Top Sections */}
          <div className="lg:col-span-2 space-y-6">
            {/* Top Performing Sections */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <PieChart className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      সেরা পারফর্মিং সেকশন
                    </h3>
                    <p className="text-gray-600 text-sm">
                      বর্তমান মাসের শীর্ষ ৩ সেকশন
                    </p>
                  </div>
                </div>
              </div>

              {currentMonthStats.topSections.length > 0 ? (
                <div className="space-y-4">
                  {currentMonthStats.topSections.map((section, idx) => {
                    const percentage = getPercentage(
                      section.totalValue,
                      monthlyComparison.current.totalValue,
                    );
                    const prevMonthSection =
                      monthlyComparison.previous.sectionData.find(
                        (s) => s.name === section.name,
                      );
                    const prevValue = prevMonthSection?.totalValue || 0;
                    const changePercentage = calculatePercentageChange(
                      section.totalValue,
                      prevValue,
                    );
                    const indicator = getChangeIndicator(changePercentage);
                    const IndicatorIcon = indicator.icon;

                    const sectionManpower = getSectionManpower(
                      section.name,
                      monthlyComparison.current.sectionManpower,
                    );
                    const prevSectionManpower = getSectionManpower(
                      section.name,
                      monthlyComparison.previous.sectionManpower,
                    );
                    const manpowerChange = calculatePercentageChange(
                      sectionManpower,
                      prevSectionManpower,
                    );

                    return (
                      <div key={section.name} className="group">
                        <div className="flex items-center justify-between p-5 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                idx === 0
                                  ? "bg-linear-to-br from-yellow-100 to-yellow-200 text-yellow-600"
                                  : idx === 1
                                    ? "bg-linear-to-br from-gray-100 to-gray-200 text-gray-600"
                                    : "bg-linear-to-br from-orange-100 to-orange-200 text-orange-600"
                              }`}
                            >
                              <span className="font-bold text-xl">
                                {idx + 1}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {formatSectionName(section.name)}
                              </h4>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-gray-500">
                                  {formatNumber(section.products.length)} টি
                                  প্রোডাক্ট
                                </span>
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3 text-blue-500" />
                                  <span className="text-xs text-blue-600">
                                    {formatNumber(sectionManpower)} ম্যানপাওয়ার
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900 text-lg">
                              {formatCurrency(section.totalValue)}
                            </p>
                            <div className="flex items-center justify-end gap-2 mt-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-linear-to-br from-blue-500 to-blue-600 h-2 rounded-full"
                                  style={{
                                    width: `${Math.min(percentage, 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium text-blue-600">
                                {percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">কোনো সেকশন ডাটা পাওয়া যায়নি</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Insights */}
          <div className="space-y-6">
            {/* Section Changes */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Info className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    সেকশন পরিবর্তন
                  </h3>
                </div>
              </div>

              <div className="space-y-4">
                {/* New Sections */}
                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-green-800">নতুন সেকশন</h4>
                    <span className="text-lg font-bold text-green-600">
                      {
                        currentMonthStats.sectionData.filter(
                          (s) =>
                            !previousMonthStats.sectionData.find(
                              (ps) => ps.name === s.name,
                            ),
                        ).length
                      }
                    </span>
                  </div>
                  <div className="space-y-1">
                    {currentMonthStats.sectionData
                      .filter(
                        (s) =>
                          !previousMonthStats.sectionData.find(
                            (ps) => ps.name === s.name,
                          ),
                      )
                      .map((section) => (
                        <div
                          key={section.name}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="text-green-700">
                            {formatSectionName(section.name)}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(section.totalValue)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Inactive Sections */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-800">
                      নিষ্ক্রিয় সেকশন
                    </h4>
                    <span className="text-lg font-bold text-gray-600">
                      {
                        previousMonthStats.sectionData.filter(
                          (s) =>
                            !currentMonthStats.sectionData.find(
                              (cs) => cs.name === s.name,
                            ),
                        ).length
                      }
                    </span>
                  </div>
                  <div className="space-y-1">
                    {previousMonthStats.sectionData
                      .filter(
                        (s) =>
                          !currentMonthStats.sectionData.find(
                            (cs) => cs.name === s.name,
                          ),
                      )
                      .map((section) => (
                        <div
                          key={section.name}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="text-gray-600">
                            {formatSectionName(section.name)}
                          </span>
                          <span className="text-gray-500">
                            ছিল {formatCurrency(section.totalValue)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Key Insights */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    মূল্যবান তথ্য
                  </h3>
                </div>
              </div>

              <div className="space-y-4">
                {currentMonthStats.topSections.length > 0 &&
                  monthlyComparison.current.totalValue > 0 && (
                    <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-yellow-800">
                          শীর্ষ পারফর্মার
                        </p>
                        <p className="text-sm text-yellow-700 mt-1">
                          <span className="font-bold">
                            {formatSectionName(
                              currentMonthStats.topSections[0]?.name,
                            )}
                          </span>{" "}
                          মোট উৎপাদনের{" "}
                          {getPercentage(
                            currentMonthStats.topSections[0].totalValue,
                            monthlyComparison.current.totalValue,
                          ).toFixed(1)}
                          % অংশ তৈরি করেছে
                        </p>
                      </div>
                    </div>
                  )}

                {monthlyComparison.current.totalValue > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-blue-800">
                        সামগ্রিক বৃদ্ধি
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        উৎপাদন মূল্য{" "}
                        {monthlyComparison.current.totalValue >=
                        monthlyComparison.previous.totalValue
                          ? "বেড়েছে"
                          : "কমেছে"}{" "}
                        {Math.abs(
                          calculatePercentageChange(
                            monthlyComparison.current.totalValue,
                            monthlyComparison.previous.totalValue,
                          ),
                        ).toFixed(1)}
                        %
                      </p>
                    </div>
                  </div>
                )}

                {Object.keys(monthlyComparison.current.sectionManpower).length >
                  0 &&
                  (() => {
                    const sections = Object.entries(
                      monthlyComparison.current.sectionManpower,
                    ).filter(([key]) => key !== "total_manpower");
                    if (sections.length === 0) return null;

                    const highestManpower = sections.reduce((max, curr) =>
                      curr[1] > max[1] ? curr : max,
                    );

                    return (
                      <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
                        <Users className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-purple-800">
                            সর্বোচ্চ ম্যানপাওয়ার
                          </p>
                          <p className="text-sm text-purple-700 mt-1">
                            {formatSectionName(highestManpower[0])} এর সর্বোচ্চ
                            ম্যানপাওয়ার: {formatNumber(highestManpower[1])} দিন
                          </p>
                        </div>
                      </div>
                    );
                  })()}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="bg-linear-to-br from-blue-600 to-blue-700 text-white rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle className="h-6 w-6 text-white" />
            <h3 className="text-lg font-bold">মাসিক তুলনা সারসংক্ষেপ</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div>
              <p className="text-sm text-blue-200">মূল্য পরিবর্তন</p>
              <p
                className={`text-xl font-bold mt-1 ${
                  monthlyComparison.current.totalValue >=
                  monthlyComparison.previous.totalValue
                    ? "text-green-300"
                    : "text-red-300"
                }`}
              >
                {monthlyComparison.current.totalValue >=
                monthlyComparison.previous.totalValue
                  ? "+"
                  : "-"}
                {formatCurrency(
                  Math.abs(
                    monthlyComparison.current.totalValue -
                      monthlyComparison.previous.totalValue,
                  ),
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-200">ম্যানপাওয়ার পরিবর্তন</p>
              <p
                className={`text-xl font-bold mt-1 ${
                  monthlyComparison.current.totalManpower >=
                  monthlyComparison.previous.totalManpower
                    ? "text-green-300"
                    : "text-red-300"
                }`}
              >
                {monthlyComparison.current.totalManpower >=
                monthlyComparison.previous.totalManpower
                  ? "+"
                  : "-"}
                {Math.abs(
                  monthlyComparison.current.totalManpower -
                    monthlyComparison.previous.totalManpower,
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-200">সক্রিয় সেকশন</p>
              <p className="text-xl font-bold mt-1">
                বর্তমান: {currentMonthStats.sectionData.length} | পূর্ববর্তী:{" "}
                {previousMonthStats.sectionData.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-200">কাজের দিন</p>
              <p className="text-xl font-bold mt-1">
                বর্তমান: {currentMonthStats.stats.uniqueWorkingDays.size} |
                পূর্ববর্তী: {previousMonthStats.stats.uniqueWorkingDays.size}
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-blue-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-blue-200">সামগ্রিক অবস্থা</p>
                <p className="text-lg font-medium mt-1">
                  {monthlyComparison.current.totalValue >
                  monthlyComparison.previous.totalValue
                    ? "📈 উৎপাদন বাড়ছে"
                    : monthlyComparison.current.totalValue <
                        monthlyComparison.previous.totalValue
                      ? "📉 উৎপাদন কমছে"
                      : "📊 উৎপাদন স্থিতিশীল"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-sm text-blue-200">মোট সেকশন</p>
                  <p className="text-lg font-bold">
                    {allSections.length} টি সেকশন
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-blue-200">প্রোডাক্ট</p>
                  <p className="text-lg font-bold">
                    {currentMonthStats.stats.totalProductsCount} টি প্রোডাক্ট
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
