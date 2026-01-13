"use client";

import { Product } from "@/types/Product.Types";
import Firebase from "@/utils/firebase";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Package,
  DollarSign,
  PieChart,
  AlertCircle,
  CalendarDays,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Database,
  BarChart,
  ChevronUp,
  ChevronDown,
  Minus,
  Activity,
  Layers,
  FolderOpen
} from "lucide-react";

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
  [key: string]: number; // Dynamic section keys
  total_manpower: number;
};

type ManPower = {
  data: ManPowerData[];
};

type MonthlyComparison = {
  month: string;
  year: number;
  totalValue: number;
  totalBatch: number;
  totalCarton: number;
  sectionManpower: Record<string, number>;
  totalManpower: number;
  sectionData: SectionData[];
  productivity: {
    valuePerManpower: number;
    cartonPerManpower: number;
  };
};

export default function Dashboard() {
  const [products, setProducts] = useState<ProductWithId[]>([]);
  const [prevMonthProducts, setPrevMonthProducts] = useState<ProductWithId[]>([]);
  const [manpower, setManpower] = useState<ManPower | null>(null);
  const [prevMonthManpower, setPrevMonthManpower] = useState<ManPower | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth(); // 0-indexed
  const currentYear = currentDate.getFullYear();
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Get previous month and year
  const getPreviousMonth = useCallback((month: number, year: number) => {
    if (month === 0) { // January
      return { month: 11, year: year - 1 }; // December of previous year
    }
    return { month: month - 1, year };
  }, []);

  const prevMonthInfo = getPreviousMonth(currentMonth, currentYear);
  const currentMonthName = monthNames[currentMonth];
  const prevMonthName = monthNames[prevMonthInfo.month];

  // Calculate percentage change
  const calculatePercentageChange = useCallback((current: number, previous: number) => {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
  }, []);

  // Get change indicator
  const getChangeIndicator = (percentage: number) => {
    if (percentage > 5) return { icon: ChevronUp, color: "text-green-600", bgColor: "bg-green-50" };
    if (percentage < -5) return { icon: ChevronDown, color: "text-red-600", bgColor: "bg-red-50" };
    return { icon: Minus, color: "text-yellow-600", bgColor: "bg-yellow-50" };
  };

  // Format section name for display
  const formatSectionName = useCallback((sectionName: string) => {
    if (!sectionName) return "Unknown";
    
    // Remove underscores and capitalize first letter of each word
    return sectionName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, []);

  // Load data from Firebase
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("Loading current month data:", currentYear, currentMonthName);
        console.log("Loading previous month data:", prevMonthInfo.year, prevMonthName);

        // Load current month products
        const currentProductsData = await Firebase.getProductsByPeriod<Product>(
          currentYear,
          currentMonthName
        );
        
        const currentProductsWithId: ProductWithId[] = currentProductsData.map((product: any) => ({
          ...product,
          id: product.id || product.code || `product-${Math.random()}`,
          section: product.section?.toLowerCase() || 'uncategorized'
        }));
        
        setProducts(currentProductsWithId);

        // Load previous month products
        const prevProductsData = await Firebase.getProductsByPeriod<Product>(
          prevMonthInfo.year,
          prevMonthName
        );
        
        const prevProductsWithId: ProductWithId[] = prevProductsData.map((product: any) => ({
          ...product,
          id: product.id || product.code || `product-${Math.random()}-prev`,
          section: product.section?.toLowerCase() || 'uncategorized'
        }));
        
        setPrevMonthProducts(prevProductsWithId);

        // Load manpower data (dynamic structure)
        try {
          const currentManpowerData = await Firebase.getManpowerByPeriod<ManPower>(
            currentYear,
            currentMonthName
          );
          setManpower(currentManpowerData);
          console.log("Current manpower data loaded:", currentManpowerData);
        } catch (manpowerError) {
          console.warn("Current manpower data not available:", manpowerError);
          setManpower(null);
        }

        try {
          const prevManpowerData = await Firebase.getManpowerByPeriod<ManPower>(
            prevMonthInfo.year,
            prevMonthName
          );
          setPrevMonthManpower(prevManpowerData);
          console.log("Previous manpower data loaded:", prevManpowerData);
        } catch (prevManpowerError) {
          console.warn("Previous manpower data not available:", prevManpowerError);
          setPrevMonthManpower(null);
        }

      } catch (err) {
        console.error("Error loading data from Firebase:", err);
        setError(`Failed to load production data: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setProducts([]);
        setPrevMonthProducts([]);
        setManpower(null);
        setPrevMonthManpower(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentMonthName, currentYear, prevMonthName, prevMonthInfo.year, refreshKey]);

  // Extract all unique sections from products
  const extractAllSections = useCallback((productsData: ProductWithId[]) => {
    const sections = new Set<string>();
    productsData.forEach(product => {
      if (product.section) {
        sections.add(product.section.toLowerCase());
      }
    });
    return Array.from(sections);
  }, []);

  // Get all available sections from current and previous month
  const allSections = useMemo(() => {
    const sections = new Set<string>();
    
    // Add sections from current month products
    products.forEach(product => {
      if (product.section) {
        sections.add(product.section.toLowerCase());
      }
    });
    
    // Add sections from previous month products
    prevMonthProducts.forEach(product => {
      if (product.section) {
        sections.add(product.section.toLowerCase());
      }
    });
    
    // Add sections from manpower data (if available)
    if (manpower?.data && manpower.data.length > 0) {
      const firstDay = manpower.data[0];
      Object.keys(firstDay).forEach(key => {
        if (key !== 'date' && key !== 'total_manpower') {
          sections.add(key.toLowerCase());
        }
      });
    }
    
    if (prevMonthManpower?.data && prevMonthManpower.data.length > 0) {
      const firstDay = prevMonthManpower.data[0];
      Object.keys(firstDay).forEach(key => {
        if (key !== 'date' && key !== 'total_manpower') {
          sections.add(key.toLowerCase());
        }
      });
    }
    
    return Array.from(sections).sort();
  }, [products, prevMonthProducts, manpower, prevMonthManpower]);

  // Calculate section-wise manpower from dynamic structure
  const calculateSectionManpower = useCallback((manpowerData: ManPower | null, allSectionsList: string[]) => {
    const sectionManpower: Record<string, number> = {};
    
    // Initialize all sections with 0
    allSectionsList.forEach(section => {
      sectionManpower[section] = 0;
    });
    
    if (!manpowerData || !manpowerData.data) {
      return { sectionManpower, total_manpower: 0 };
    }

    let totalManpower = 0;

    manpowerData.data.forEach(day => {
      // Sum all section manpower
      Object.keys(day).forEach(key => {
        if (key === 'total_manpower') {
          totalManpower += day[key] || 0;
        } else if (key !== 'date') {
          const sectionKey = key.toLowerCase();
          if (sectionManpower[sectionKey] !== undefined) {
            sectionManpower[sectionKey] += day[key] || 0;
          } else {
            // If new section found in manpower data, add it
            sectionManpower[sectionKey] = day[key] || 0;
          }
        }
      });
    });

    return { sectionManpower, total_manpower: totalManpower };
  }, []);

  // Calculate statistics for current month
  const currentMonthStats = useMemo(() => {
    const stats = {
      totalValue: 0,
      totalBatch: 0,
      totalCarton: 0,
      totalManpowerFromProducts: 0,
      uniqueWorkingDays: new Set<number>(),
      totalProductsCount: 0
    };

    const sections: Record<string, SectionData> = {};
    const dailyData: Record<number, DailyTrendData> = {};

    products.forEach(product => {
      stats.totalProductsCount++;

      const sectionName = product.section?.toLowerCase() || 'uncategorized';
      
      if (!sections[sectionName]) {
        sections[sectionName] = {
          name: sectionName,
          totalValue: 0,
          totalBatch: 0,
          totalCarton: 0,
          totalManpower: 0,
          products: []
        };
      }

      sections[sectionName].products.push(product);

      product.data.forEach(day => {
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
            batch: 0
          };
        }
        dailyData[day.date].value += productionValue;
        dailyData[day.date].carton += day.carton;
        dailyData[day.date].batch += day.batch;
      });
    });

    const sectionArray = Object.values(sections);
    sectionArray.sort((a, b) => b.totalValue - a.totalValue);

    const dailyTrendData: DailyTrendData[] = Object.values(dailyData)
      .sort((a, b) => a.date - b.date);

    // Calculate manpower from new structure
    const { sectionManpower, total_manpower } = calculateSectionManpower(manpower, allSections);
    
    const valuePerManpower = total_manpower > 0 ? stats.totalValue / total_manpower : 0;
    const cartonPerManpower = total_manpower > 0 ? stats.totalCarton / total_manpower : 0;

    return {
      stats: {
        ...stats,
        sectionManpower,
        totalManpowerFromData: total_manpower
      },
      sectionData: sectionArray,
      topSections: sectionArray.slice(0, 3),
      dailyTrend: dailyTrendData,
      productivity: { valuePerManpower, cartonPerManpower }
    };
  }, [products, manpower, allSections, calculateSectionManpower]);

  // Calculate statistics for previous month
  const previousMonthStats = useMemo(() => {
    const stats = {
      totalValue: 0,
      totalBatch: 0,
      totalCarton: 0,
      totalManpowerFromProducts: 0,
      uniqueWorkingDays: new Set<number>(),
      totalProductsCount: 0
    };

    const sections: Record<string, SectionData> = {};

    prevMonthProducts.forEach(product => {
      stats.totalProductsCount++;

      const sectionName = product.section?.toLowerCase() || 'uncategorized';
      
      if (!sections[sectionName]) {
        sections[sectionName] = {
          name: sectionName,
          totalValue: 0,
          totalBatch: 0,
          totalCarton: 0,
          totalManpower: 0,
          products: []
        };
      }

      sections[sectionName].products.push(product);

      product.data.forEach(day => {
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

    // Calculate manpower from new structure
    const { sectionManpower, total_manpower } = calculateSectionManpower(prevMonthManpower, allSections);
    
    const valuePerManpower = total_manpower > 0 ? stats.totalValue / total_manpower : 0;
    const cartonPerManpower = total_manpower > 0 ? stats.totalCarton / total_manpower : 0;

    return {
      stats: {
        ...stats,
        sectionManpower,
        totalManpowerFromData: total_manpower
      },
      sectionData: sectionArray,
      productivity: { valuePerManpower, cartonPerManpower }
    };
  }, [prevMonthProducts, prevMonthManpower, allSections, calculateSectionManpower]);

  // Prepare monthly comparison data
  const monthlyComparison = useMemo(() => {
    const current = {
      month: currentMonthName,
      year: currentYear,
      totalValue: currentMonthStats.stats.totalValue,
      totalBatch: currentMonthStats.stats.totalBatch,
      totalCarton: currentMonthStats.stats.totalCarton,
      sectionManpower: currentMonthStats.stats.sectionManpower,
      totalManpower: currentMonthStats.stats.totalManpowerFromData,
      sectionData: currentMonthStats.sectionData,
      productivity: currentMonthStats.productivity,
      allSections: allSections
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
      allSections: allSections
    };

    return { current, previous };
  }, [currentMonthStats, previousMonthStats, currentMonthName, currentYear, prevMonthName, prevMonthInfo.year, allSections]);

  // Get section manpower for a specific section
  const getSectionManpower = useCallback((sectionName: string, manpowerData: Record<string, number>) => {
    const normalizedSection = sectionName.toLowerCase();
    return manpowerData[normalizedSection] || 0;
  }, []);

  // Format currency
  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format number
  const formatNumber = (num: number) => {
    return num.toLocaleString('en-BD');
  };

  // Get percentage of total
  const getPercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return (value / total) * 100;
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading production data from Firebase...</p>
          <p className="text-sm text-gray-500 mt-1">
            Current: {currentMonthName} {currentYear} | Previous: {prevMonthName} {prevMonthInfo.year}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Database className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Loading Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Loading Data
          </button>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-yellow-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Production Data Found</h3>
          <p className="text-gray-600 mb-4">
            No production data is available for {currentMonthName} {currentYear}.
          </p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Production Dashboard</h1>
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh data"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-gray-500" />
                <p className="text-gray-600">
                  Current: <span className="font-medium">{currentMonthName} {currentYear}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-gray-400" />
                <p className="text-gray-500">
                  Previous: <span className="font-medium">{prevMonthName} {prevMonthInfo.year}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-gray-400" />
                <p className="text-gray-500">
                  Sections: <span className="font-medium">{allSections.length}</span>
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium">
              Products: {currentMonthStats.stats.totalProductsCount}
            </div>
            <div className="px-4 py-2 bg-green-50 text-green-700 rounded-lg font-medium">
              Sections: {currentMonthStats.sectionData.length}
            </div>
            <div className="px-4 py-2 bg-orange-50 text-orange-700 rounded-lg font-medium">
              Manpower: {formatNumber(monthlyComparison.current.totalManpower)}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Comparison Banner */}
      <div className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Monthly Comparison
          </h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-600 rounded"></div>
              <span>Current Month</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-400 rounded"></div>
              <span>Previous Month</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Production Value Comparison */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600 font-medium mb-2">Production Value</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(monthlyComparison.current.totalValue)}
                </p>
                <p className="text-sm text-gray-500">
                  {formatCurrency(monthlyComparison.previous.totalValue)}
                </p>
              </div>
              {(() => {
                const percentageChange = calculatePercentageChange(
                  monthlyComparison.current.totalValue,
                  monthlyComparison.previous.totalValue
                );
                const indicator = getChangeIndicator(percentageChange);
                const IndicatorIcon = indicator.icon;
                return (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded ${indicator.bgColor}`}>
                    <IndicatorIcon className={`w-4 h-4 ${indicator.color}`} />
                    <span className={`text-sm font-medium ${indicator.color}`}>
                      {percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}%
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Total Manpower Comparison */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600 font-medium mb-2">Total Manpower</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(monthlyComparison.current.totalManpower)}
                </p>
                <p className="text-sm text-gray-500">
                  {formatNumber(monthlyComparison.previous.totalManpower)}
                </p>
              </div>
              {(() => {
                const percentageChange = calculatePercentageChange(
                  monthlyComparison.current.totalManpower,
                  monthlyComparison.previous.totalManpower
                );
                const indicator = getChangeIndicator(percentageChange);
                const IndicatorIcon = indicator.icon;
                return (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded ${indicator.bgColor}`}>
                    <IndicatorIcon className={`w-4 h-4 ${indicator.color}`} />
                    <span className={`text-sm font-medium ${indicator.color}`}>
                      {percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}%
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Carton Comparison */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600 font-medium mb-2">Total Cartons</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(monthlyComparison.current.totalCarton)}
                </p>
                <p className="text-sm text-gray-500">
                  {formatNumber(monthlyComparison.previous.totalCarton)}
                </p>
              </div>
              {(() => {
                const percentageChange = calculatePercentageChange(
                  monthlyComparison.current.totalCarton,
                  monthlyComparison.previous.totalCarton
                );
                const indicator = getChangeIndicator(percentageChange);
                const IndicatorIcon = indicator.icon;
                return (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded ${indicator.bgColor}`}>
                    <IndicatorIcon className={`w-4 h-4 ${indicator.color}`} />
                    <span className={`text-sm font-medium ${indicator.color}`}>
                      {percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}%
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Productivity Comparison */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600 font-medium mb-2">Productivity (Value/Manpower)</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(monthlyComparison.current.productivity.valuePerManpower)}
                </p>
                <p className="text-sm text-gray-500">
                  {formatCurrency(monthlyComparison.previous.productivity.valuePerManpower)}
                </p>
              </div>
              {(() => {
                const percentageChange = calculatePercentageChange(
                  monthlyComparison.current.productivity.valuePerManpower,
                  monthlyComparison.previous.productivity.valuePerManpower
                );
                const indicator = getChangeIndicator(percentageChange);
                const IndicatorIcon = indicator.icon;
                return (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded ${indicator.bgColor}`}>
                    <IndicatorIcon className={`w-4 h-4 ${indicator.color}`} />
                    <span className={`text-sm font-medium ${indicator.color}`}>
                      {percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}%
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Section Overview */}
      <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-600" />
            Sections Overview ({allSections.length} sections)
          </h2>
          <div className="text-sm text-gray-500">
            {currentMonthStats.sectionData.length} active in current month
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {allSections.map(section => {
            const currentSectionData = currentMonthStats.sectionData.find(s => s.name === section);
            const prevSectionData = previousMonthStats.sectionData.find(s => s.name === section);
            
            const isNewSection = currentSectionData && !prevSectionData;
            const isInactiveThisMonth = !currentSectionData && prevSectionData;
            const isActiveBoth = currentSectionData && prevSectionData;
            
            return (
              <div 
                key={section} 
                className={`p-4 rounded-lg border transition-all ${
                  isNewSection ? 'border-green-200 bg-green-50' :
                  isInactiveThisMonth ? 'border-gray-200 bg-gray-50 opacity-70' :
                  'border-blue-100 bg-blue-50 hover:bg-blue-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">
                    {formatSectionName(section)}
                  </h3>
                  <div className="flex items-center gap-1">
                    {isNewSection && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                        New
                      </span>
                    )}
                    {isInactiveThisMonth && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  {currentSectionData ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Value</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(currentSectionData.totalValue)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Products</span>
                        <span className="font-medium text-gray-900">
                          {currentSectionData.products.length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Manpower</span>
                        <span className="font-medium text-gray-900">
                          {formatNumber(getSectionManpower(section, monthlyComparison.current.sectionManpower))}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-2">
                      <span className="text-sm text-gray-500">No production this month</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Current Month Production Value */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Current Month Production</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(monthlyComparison.current.totalValue)}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {formatNumber(monthlyComparison.current.totalCarton)} cartons
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Previous Month</span>
              <span className="font-medium">
                {formatCurrency(monthlyComparison.previous.totalValue)}
              </span>
            </div>
          </div>
        </div>

        {/* Current Month Manpower */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Current Month Manpower</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">
                {formatNumber(monthlyComparison.current.totalManpower)}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Across {Object.keys(monthlyComparison.current.sectionManpower).length} sections
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Previous Month</span>
              <span className="font-medium">
                {formatNumber(monthlyComparison.previous.totalManpower)}
              </span>
            </div>
          </div>
        </div>

        {/* Productivity */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Productivity (Value/Manpower)</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(monthlyComparison.current.productivity.valuePerManpower)}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Current month efficiency
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Previous Month</span>
              <span className="font-medium">
                {formatCurrency(monthlyComparison.previous.productivity.valuePerManpower)}
              </span>
            </div>
          </div>
        </div>

        {/* Section Activity */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Active Sections</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">
                {currentMonthStats.sectionData.length}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {monthlyComparison.previous.sectionData.length} in previous month
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <BarChart className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">New Sections</span>
              <span className="font-medium text-green-600">
                {currentMonthStats.sectionData.filter(s => 
                  !previousMonthStats.sectionData.find(ps => ps.name === s.name)
                ).length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section-wise Manpower Analysis */}
      {Object.keys(monthlyComparison.current.sectionManpower).length > 0 && (
        <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Section-wise Manpower Analysis</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(monthlyComparison.current.sectionManpower)
              .filter(([section]) => monthlyComparison.current.sectionManpower[section] > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([section, manpower]) => {
                const prevManpower = monthlyComparison.previous.sectionManpower[section] || 0;
                const percentage = getPercentage(manpower, monthlyComparison.current.totalManpower);
                const changePercentage = calculatePercentageChange(manpower, prevManpower);
                const indicator = getChangeIndicator(changePercentage);
                const IndicatorIcon = indicator.icon;
                
                return (
                  <div key={section} className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
                    <p className="text-sm text-gray-600 font-medium mb-2">
                      {formatSectionName(section)}
                    </p>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-lg font-bold text-gray-900">{formatNumber(manpower)}</p>
                        <p className="text-xs text-gray-500">Prev: {formatNumber(prevManpower)}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className={`flex items-center gap-1 ${indicator.color}`}>
                          <IndicatorIcon className="w-3 h-3" />
                          <span className="text-xs font-medium">
                            {changePercentage > 0 ? '+' : ''}{changePercentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{ width: `${Math.min(percentage * 3, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Column - Top Sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top 3 Performing Sections */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Top Performing Sections (Current Month)</h2>
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-500">By Production Value</span>
              </div>
            </div>
            
            {currentMonthStats.topSections.length > 0 ? (
              <div className="space-y-4">
                {currentMonthStats.topSections.map((section, idx) => {
                  const percentage = getPercentage(section.totalValue, monthlyComparison.current.totalValue);
                  const prevMonthSection = monthlyComparison.previous.sectionData.find(s => s.name === section.name);
                  const prevValue = prevMonthSection?.totalValue || 0;
                  const changePercentage = calculatePercentageChange(section.totalValue, prevValue);
                  const indicator = getChangeIndicator(changePercentage);
                  const IndicatorIcon = indicator.icon;
                  
                  // Get manpower for this section from new structure
                  const sectionManpower = getSectionManpower(section.name, monthlyComparison.current.sectionManpower);
                  const prevSectionManpower = getSectionManpower(section.name, monthlyComparison.previous.sectionManpower);
                  const manpowerChange = calculatePercentageChange(sectionManpower, prevSectionManpower);

                  return (
                    <div key={section.name} className="group">
                      <div className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            idx === 0 ? 'bg-yellow-100 text-yellow-600' :
                            idx === 1 ? 'bg-gray-100 text-gray-600' :
                            'bg-orange-100 text-orange-600'
                          }`}>
                            <span className="font-bold text-lg">{idx + 1}</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 capitalize">
                              {formatSectionName(section.name)}
                            </h4>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm text-gray-500">
                                {section.products.length} products
                              </span>
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-blue-500" />
                                <span className="text-xs text-blue-600">{formatNumber(sectionManpower)} manpower</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900 text-lg">
                            {formatCurrency(section.totalValue)}
                          </p>
                          <div className="flex items-center justify-end gap-2 mt-1">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-blue-600">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Section Details with Comparison */}
                      <div className="mt-2 pl-14 pr-4">
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div className="text-center p-2 bg-blue-50 rounded">
                            <p className="text-gray-600">Current Value</p>
                            <p className="font-bold text-gray-900">{formatCurrency(section.totalValue)}</p>
                            <div className={`flex items-center justify-center gap-1 mt-1 ${indicator.color}`}>
                              <IndicatorIcon className="w-2 h-2" />
                              <span className="text-xs">
                                {changePercentage > 0 ? '+' : ''}{changePercentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="text-center p-2 bg-orange-50 rounded">
                            <p className="text-gray-600">Manpower</p>
                            <p className="font-bold text-gray-900">{formatNumber(sectionManpower)}</p>
                            <div className={`flex items-center justify-center gap-1 mt-1 ${
                              manpowerChange > 0 ? 'text-green-600' : manpowerChange < 0 ? 'text-red-600' : 'text-yellow-600'
                            }`}>
                              {manpowerChange > 0 ? <ChevronUp className="w-2 h-2" /> : 
                               manpowerChange < 0 ? <ChevronDown className="w-2 h-2" /> : 
                               <Minus className="w-2 h-2" />}
                              <span className="text-xs">
                                {manpowerChange > 0 ? '+' : ''}{manpowerChange.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="text-center p-2 bg-green-50 rounded">
                            <p className="text-gray-600">Cartons</p>
                            <p className="font-bold text-gray-900">{formatNumber(section.totalCarton)}</p>
                          </div>
                          <div className="text-center p-2 bg-purple-50 rounded">
                            <p className="text-gray-600">Efficiency</p>
                            <p className="font-bold text-gray-900">
                              {sectionManpower > 0 ? formatCurrency(section.totalValue / sectionManpower) : '৳0'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No section data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Insights */}
        <div className="space-y-6">
          {/* Section Changes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Section Changes</h2>
            <div className="space-y-4">
              {/* New Sections */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-green-800">New Sections</h3>
                  <span className="text-lg font-bold text-green-600">
                    {currentMonthStats.sectionData.filter(s => 
                      !previousMonthStats.sectionData.find(ps => ps.name === s.name)
                    ).length}
                  </span>
                </div>
                <div className="space-y-1">
                  {currentMonthStats.sectionData
                    .filter(s => !previousMonthStats.sectionData.find(ps => ps.name === s.name))
                    .map(section => (
                      <div key={section.name} className="flex justify-between items-center text-sm">
                        <span className="text-green-700">{formatSectionName(section.name)}</span>
                        <span className="font-medium">{formatCurrency(section.totalValue)}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Inactive Sections */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-800">Inactive This Month</h3>
                  <span className="text-lg font-bold text-gray-600">
                    {previousMonthStats.sectionData.filter(s => 
                      !currentMonthStats.sectionData.find(cs => cs.name === s.name)
                    ).length}
                  </span>
                </div>
                <div className="space-y-1">
                  {previousMonthStats.sectionData
                    .filter(s => !currentMonthStats.sectionData.find(cs => cs.name === s.name))
                    .map(section => (
                      <div key={section.name} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">{formatSectionName(section.name)}</span>
                        <span className="text-gray-500">Was {formatCurrency(section.totalValue)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Key Insights */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Key Insights</h2>
            <div className="space-y-4">
              {currentMonthStats.topSections.length > 0 && monthlyComparison.current.totalValue > 0 && (
                <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-yellow-800">Top Performer</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      <span className="font-bold">{formatSectionName(currentMonthStats.topSections[0]?.name)}</span> leads with {
                        getPercentage(currentMonthStats.topSections[0].totalValue, monthlyComparison.current.totalValue).toFixed(1)
                      }% of total production
                    </p>
                  </div>
                </div>
              )}

              {monthlyComparison.current.totalValue > 0 && (
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-800">Overall Growth</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Production value {
                        monthlyComparison.current.totalValue >= monthlyComparison.previous.totalValue ? 'increased' : 'decreased'
                      } by {Math.abs(calculatePercentageChange(
                        monthlyComparison.current.totalValue,
                        monthlyComparison.previous.totalValue
                      )).toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}

              {Object.keys(monthlyComparison.current.sectionManpower).length > 0 && (
                (() => {
                  const sections = Object.entries(monthlyComparison.current.sectionManpower)
                    .filter(([key]) => key !== 'total_manpower');
                  if (sections.length === 0) return null;
                  
                  const highestManpower = sections.reduce((max, curr) => 
                    curr[1] > max[1] ? curr : max
                  );
                  
                  return (
                    <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                      <Users className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-purple-800">Highest Manpower</p>
                        <p className="text-sm text-purple-700 mt-1">
                          {formatSectionName(highestManpower[0])} has highest manpower: {formatNumber(highestManpower[1])} days
                        </p>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="bg-gray-900 text-white rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6">Monthly Comparison Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-300">Value Change</p>
            <p className={`text-xl font-bold mt-1 ${
              monthlyComparison.current.totalValue >= monthlyComparison.previous.totalValue ? 'text-green-400' : 'text-red-400'
            }`}>
              {monthlyComparison.current.totalValue >= monthlyComparison.previous.totalValue ? '+' : '-'}
              {formatCurrency(Math.abs(monthlyComparison.current.totalValue - monthlyComparison.previous.totalValue))}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-300">Manpower Change</p>
            <p className={`text-xl font-bold mt-1 ${
              monthlyComparison.current.totalManpower >= monthlyComparison.previous.totalManpower ? 'text-green-400' : 'text-red-400'
            }`}>
              {monthlyComparison.current.totalManpower >= monthlyComparison.previous.totalManpower ? '+' : '-'}
              {Math.abs(monthlyComparison.current.totalManpower - monthlyComparison.previous.totalManpower)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-300">Active Sections</p>
            <p className="text-xl font-bold mt-1">
              Current: {currentMonthStats.sectionData.length} | Previous: {previousMonthStats.sectionData.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-300">Working Days</p>
            <p className="text-xl font-bold mt-1">
              Current: {currentMonthStats.stats.uniqueWorkingDays.size} | Previous: {previousMonthStats.stats.uniqueWorkingDays.size}
            </p>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-300">Overall Status</p>
              <p className="text-lg font-medium mt-1">
                {monthlyComparison.current.totalValue > monthlyComparison.previous.totalValue 
                  ? '📈 Production Increasing' 
                  : monthlyComparison.current.totalValue < monthlyComparison.previous.totalValue 
                  ? '📉 Production Decreasing' 
                  : '📊 Production Stable'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-300">Total Sections</p>
                <p className="text-lg font-bold">
                  {allSections.length} unique sections
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-300">Products</p>
                <p className="text-lg font-bold">
                  {currentMonthStats.stats.totalProductsCount} total products
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}