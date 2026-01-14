"use client";

import { db } from "@/utils/firebaseConfig";
import { getPeriod } from "@/utils/storage";
import { format } from "date-fns";
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { debounce } from "lodash";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Info,
  Loader2,
  Package,
  Save,
  TrendingUp,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

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

export default function SectionProductionPage() {
  const params = useParams();
  const sectionId = params.id as string;

  const [products, setProducts] = useState<ProductWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [edits, setEdits] = useState<Map<string, any>>(new Map());

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const fixedColumnRef = useRef<HTMLDivElement>(null);

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

  // Debounced save functions using Firebase built-in methods
  const debouncedSaveProduction = useCallback(
    debounce(
      async (
        productId: string,
        data: { batch: number; carton: number; date: number }[]
      ) => {
        try {
          const productRef = doc(
            db,
            `production/${year}/months/${monthName}/products/${productId}`
          );
          await updateDoc(productRef, {
            data: data,
          });
          console.log(
            `Auto-saved production: Day ${productId}, Product: ${productId}`
          );
        } catch (error) {
          console.error("Error auto-saving production:", error);
          setMessage({
            type: "error",
            text: `Failed to save production: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          });
          hideMessage();
        }
      },
      1000
    ),
    [year, monthName]
  );

  const debouncedSaveSummary = useCallback(
    debounce(
      async (productId: string, opening: number, sales_target: number) => {
        try {
          const production_target = Math.round(sales_target * 1.2); // 20% extra
          const productRef = doc(
            db,
            `production/${year}/months/${monthName}/products/${productId}`
          );
          await updateDoc(productRef, {
            opening,
            sales_target,
            production_target,
          });
          console.log(`Auto-saved summary for product: ${productId}`);
        } catch (error) {
          console.error("Error auto-saving summary:", error);
          setMessage({
            type: "error",
            text: `Failed to save summary: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          });
          hideMessage();
        }
      },
      1000
    ),
    [year, monthName]
  );

  const debouncedSavePrice = useCallback(
    debounce(async (productId: string, price: number) => {
      try {
        const productRef = doc(
          db,
          `production/${year}/months/${monthName}/products/${productId}`
        );
        await updateDoc(productRef, { price });
        console.log(`Auto-saved price for product: ${productId}`);
      } catch (error) {
        console.error("Error auto-saving price:", error);
        setMessage({
          type: "error",
          text: `Failed to save price: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
        hideMessage();
      }
    }, 1000),
    [year, monthName]
  );

  const hideMessage = () => {
    setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3000);
  };

  // Load products for the section using Firebase built-in methods
  const loadProducts = async () => {
    if (!sectionId) return;

    setLoading(true);
    try {
      // Reference to the products collection
      const productsRef = collection(
        db,
        `production/${year}/months/${monthName}/products`
      );

      // Create a query against the collection
      const q = query(productsRef, where("section", "==", sectionId));

      // Execute the query
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
    } catch (error) {
      console.error("Error loading products:", error);
      setMessage({
        type: "error",
        text: `Failed to load products: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
      hideMessage();
    } finally {
      setLoading(false);
    }
  };

  // Handle production input change
  const handleProductionChange = (
    productId: string,
    date: number,
    field: keyof ProductionData,
    value: string
  ) => {
    const numValue = parseInt(value) || 0;

    // Update the state immediately for UI
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

    // Save to Firebase
    const product = products.find((p) => p.id === productId);

    if (product) {
      const production = product.data[date - 1];
      const batchValue = field === "batch" ? numValue : production?.batch || 0;
      const cartonValue =
        field === "carton" ? numValue : production?.carton || 0;
      const data = product.data.map((d) => {
        return d.date === date
          ? { ...d, batch: batchValue, carton: cartonValue }
          : d;
      });
      debouncedSaveProduction(productId, data);
    }

    // Update edits tracking
    const key = `production-${productId}-${date}`;
    const currentEdits = edits.get(key) || { batch: 0, carton: 0 };
    const newEdits = { ...currentEdits, [field]: numValue };

    setEdits((prev) => new Map(prev.set(key, newEdits)));

    // Remove from edits after 2 seconds
    setTimeout(() => {
      setEdits((prev) => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
    }, 2000);
  };

  // Handle summary input change
  const handleSummaryChange = (
    productId: string,
    field: "opening" | "sales_target",
    value: string
  ) => {
    const numValue = parseInt(value) || 0;

    setProducts((prev) =>
      prev.map((item) => {
        if (item.id === productId) {
          let updatedProduct: Product;

          if (field === "opening") {
            updatedProduct = {
              ...item,
              opening: numValue,
            };
          } else {
            const production_target = Math.round(numValue * 1.2); // 20% extra
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

    // Save to Firebase
    const product = products.find((p) => p.id === productId);
    if (product) {
      const opening = field === "opening" ? numValue : product.opening;
      const sales_target =
        field === "sales_target" ? numValue : product.sales_target;

      debouncedSaveSummary(productId, opening, sales_target);
    }

    const key = `summary-${productId}-${field}`;
    setEdits(
      (prev) =>
        new Map(
          prev.set(key, {
            type: "summary",
            productId,
            field,
            value: numValue,
          })
        )
    );

    setTimeout(() => {
      setEdits((prev) => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
    }, 1500);
  };

  // Handle price change
  const handlePriceChange = (productId: string, value: string) => {
    const numValue = parseInt(value) || 0;

    setProducts((prev) =>
      prev.map((item) => {
        if (item.id === productId) {
          return {
            ...item,
            price: numValue,
          };
        }
        return item;
      })
    );

    const key = `price-${productId}`;
    setEdits(
      (prev) =>
        new Map(
          prev.set(key, {
            type: "price",
            productId,
            value: numValue,
          })
        )
    );

    debouncedSavePrice(productId, numValue);

    setTimeout(() => {
      setEdits((prev) => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
    }, 1500);
  };

  // Save all pending changes using Firebase built-in methods
  const saveAll = async () => {
    if (edits.size === 0) {
      setMessage({ type: "info", text: "No changes to save" });
      hideMessage();
      return;
    }

    setSaving(true);
    const savePromises: Promise<void>[] = [];

    edits.forEach((edit, key) => {
      if (key.startsWith("production-")) {
        const [, productId, date] = key.split("-");
        const productionEdit = edit;
        const productRef = doc(
          db,
          `production/${year}/months/${monthName}/products/${productId}`
        );

        savePromises.push(
          updateDoc(productRef, {
            [`data.${parseInt(date) - 1}.batch`]: productionEdit.batch || 0,
            [`data.${parseInt(date) - 1}.carton`]: productionEdit.carton || 0,
          })
        );
      } else if (key.startsWith("summary-")) {
        const product = products.find((p) => p.id === edit.productId);
        if (product) {
          const productRef = doc(
            db,
            `production/${year}/months/${monthName}/products/${edit.productId}`
          );

          savePromises.push(
            updateDoc(productRef, {
              opening: product.opening,
              sales_target: product.sales_target,
              production_target: Math.round(product.sales_target * 1.2),
            })
          );
        }
      } else if (key.startsWith("price-")) {
        const productRef = doc(
          db,
          `production/${year}/months/${monthName}/products/${edit.productId}`
        );

        savePromises.push(updateDoc(productRef, { price: edit.value }));
      }
    });

    try {
      await Promise.all(savePromises);
      setMessage({
        type: "success",
        text: `Successfully saved ${edits.size} records`,
      });
      setEdits(new Map());
      // Reload products to get fresh data
      await loadProducts();
    } catch (error) {
      console.error("Error saving all:", error);
      setMessage({
        type: "error",
        text: `Failed to save some records: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    } finally {
      setSaving(false);
      hideMessage();
    }
  };

  // Get day name
  const getDayName = (day: number) => {
    const date = new Date(year, month - 1, day);
    return format(date, "EEE");
  };

  // Check if day is weekend (Friday or Saturday)
  const isWeekend = (day: number) => {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 5;
  };

  // Check if day is today
  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() + 1 === month &&
      today.getFullYear() === year
    );
  };

  // Calculate column totals
  const getColumnTotal = (dayIndex: number, field: keyof ProductionData) => {
    return products.reduce((total, product) => {
      const prod = product.data[dayIndex];
      return total + (prod?.[field] || 0);
    }, 0);
  };

  // Calculate section totals
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
  const sectionName = sectionId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Load products on mount and when sectionId changes
  useEffect(() => {
    loadProducts();
  }, [sectionId]);

  // Cleanup debounced functions on unmount
  useEffect(() => {
    return () => {
      debouncedSaveProduction.cancel();
      debouncedSaveSummary.cancel();
      debouncedSavePrice.cancel();
    };
  }, [debouncedSaveProduction, debouncedSaveSummary, debouncedSavePrice]);

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

  // Sync vertical scroll between fixed column and content
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
  const ROW_HEIGHT = 130;
  const HEADER_HEIGHT = 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading production data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-gray-50">
      {/* Fixed Header */}
      <div className="shrink-0 bg-white border-b shadow-sm">
        <div className="flex justify-between items-center p-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{sectionName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4 text-gray-500" />
              <p className="text-gray-600">
                {monthName} {year} | {products.length} product(s) | {lastDay}{" "}
                days
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">
                  ৳{sectionTotals.total_value.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg">
                <Package className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {sectionTotals.total_carton} Cartons
                </span>
              </div>
            </div>

            <button
              onClick={saveAll}
              disabled={saving || edits.size === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg shadow"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "Saving..." : `Save All (${edits.size})`}
            </button>
          </div>
        </div>

        {/* Message Display */}
        {message.text && (
          <div
            className={`px-4 pb-4 ${
              message.type === "success"
                ? "text-green-700"
                : message.type === "error"
                ? "text-red-700"
                : "text-blue-700"
            }`}
          >
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${
                message.type === "success"
                  ? "bg-green-50 border border-green-200"
                  : message.type === "error"
                  ? "bg-red-50 border border-red-200"
                  : "bg-blue-50 border border-blue-200"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle className="w-5 h-5" />
              ) : message.type === "error" ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <Info className="w-5 h-5" />
              )}
              <span className="text-sm">{message.text}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-hidden flex bg-white m-4 rounded-lg border">
        {/* Fixed Product Column */}
        <div className="w-96 flex flex-col border-r">
          {/* Fixed Column Header */}
          <div
            className="shrink-0 border-b bg-gray-50"
            style={{ height: `${HEADER_HEIGHT}px` }}
          >
            <div className="h-full flex items-center justify-center">
              <div className="font-medium text-gray-700 text-center p-2">
                <div className="text-lg">Products & Targets</div>
                <div className="text-xs text-gray-500 font-normal mt-1">
                  Price | Opening | Sales Target | Production Target
                </div>
              </div>
            </div>
          </div>

          {/* Product List - Scrollable vertically */}
          <div className="flex-1" ref={fixedColumnRef}>
            {products.map((product) => {
              const stats = calculateProductStats(product);

              return (
                <div
                  key={product.id}
                  className="border-b hover:bg-gray-50 transition-colors"
                  style={{ height: `${ROW_HEIGHT}px` }}
                >
                  <div className="h-full p-3">
                    {/* Product Name */}
                    <div className="font-medium text-gray-900 text-sm truncate mb-2 flex items-center justify-between">
                      <span>{product.name}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {product.sku}
                      </span>
                    </div>

                    {/* Summary Inputs */}
                    <div className="grid grid-cols-4 gap-1 mb-2">
                      <div>
                        <input
                          type="number"
                          value={product.price || 0}
                          onChange={(e) =>
                            handlePriceChange(product.id, e.target.value)
                          }
                          className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          min="0"
                          placeholder="Price"
                        />
                        <div className="text-[10px] text-gray-500 text-center">
                          Price
                        </div>
                      </div>
                      <div>
                        <input
                          type="number"
                          value={product.opening || 0}
                          onChange={(e) =>
                            handleSummaryChange(
                              product.id,
                              "opening",
                              e.target.value
                            )
                          }
                          className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          min="0"
                          placeholder="Opening"
                        />
                        <div className="text-[10px] text-gray-500 text-center">
                          Opening
                        </div>
                      </div>
                      <div>
                        <input
                          type="number"
                          value={product.sales_target || 0}
                          onChange={(e) =>
                            handleSummaryChange(
                              product.id,
                              "sales_target",
                              e.target.value
                            )
                          }
                          className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          min="0"
                          placeholder="Sales Target"
                        />
                        <div className="text-[10px] text-gray-500 text-center">
                          Sales Target
                        </div>
                      </div>
                      <div>
                        <div className="w-full px-1 py-1 text-xs border border-gray-300 rounded bg-gray-100 text-center">
                          {product.production_target || 0}
                        </div>
                        <div className="text-[10px] text-gray-500 text-center">
                          P. Target (20%+)
                        </div>
                      </div>
                    </div>

                    {/* Status Bar */}
                    <div className="mt-1">
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-gray-600">
                          Daily: {stats.total_production}/
                          {stats.floor_production_target}
                        </span>
                        <span
                          className={`font-medium ${
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
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-green-500 transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              stats.completion_percentage,
                              100
                            )}%`,
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[9px] text-gray-500 mt-0.5">
                        <span>Production: {stats.total_production}</span>
                        <span>Remaining: {stats.remaining_production}</span>
                        <span>Total: {stats.current_total}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Section Summary Row */}
            <div
              className="border-t-2 border-gray-800 bg-gray-50 font-medium sticky bottom-0"
              style={{ height: `${ROW_HEIGHT + 60}px` }}
            >
              <div className="h-full flex flex-col justify-center p-3">
                <div className="font-medium text-gray-900 border-b border-gray-500 mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Section Summary
                </div>
                <table className="font-normal text-xs w-full">
                  <tbody>
                    <tr>
                      <td className="border-b border-gray-300 py-1">
                        Production Target (20%+)
                      </td>
                      <td className="text-right border-b border-gray-300 py-1 pr-1 font-bold">
                        {sectionTotals.production_target}
                      </td>
                    </tr>
                    <tr>
                      <td className="border-b border-gray-300 py-1">
                        Floor production Target
                      </td>
                      <td className="text-right border-b border-gray-300 py-1 pr-1 font-bold">
                        {sectionTotals.floor_target}
                      </td>
                    </tr>
                    <tr>
                      <td className="border-b border-gray-300 py-1">
                        Total Production
                      </td>
                      <td className="text-right border-b border-gray-300 py-1 pr-1 font-bold">
                        {sectionTotals.total_carton}
                      </td>
                    </tr>
                    <tr>
                      <td className="border-b border-gray-300 py-1">
                        Remaining Quantity
                      </td>
                      <td className="text-right border-b border-gray-300 py-1 pr-1 font-bold">
                        {sectionTotals.remaining_production}
                      </td>
                    </tr>
                    <tr>
                      <td className="border-b border-gray-300 py-1">
                        Total Value
                      </td>
                      <td className="text-right border-b border-gray-300 py-1 pr-1 font-bold text-blue-600">
                        ৳{sectionTotals.total_value.toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1">Total Batch</td>
                      <td className="text-right py-1 pr-1 font-bold">
                        {sectionTotals.total_batch}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-hidden">
          {products.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">No products found in this section</p>
                <p className="text-sm mt-2">
                  Add products to this section first
                </p>
              </div>
            </div>
          ) : (
            <div
              className="overflow-x-auto overflow-y-hidden h-full"
              ref={scrollContainerRef}
            >
              {/* Fixed Header Row */}
              <div
                className="sticky top-0 z-20 bg-gray-50 border-b"
                style={{ height: `${HEADER_HEIGHT}px` }}
                ref={headerRef}
              >
                <div className="flex h-full">
                  {daysArray.map((day) => {
                    const isWeekendDay = isWeekend(day);
                    const isTodayDay = isToday(day);

                    return (
                      <div
                        key={day}
                        className={`w-44 shrink-0 border-r ${
                          isWeekendDay
                            ? "bg-red-50"
                            : isTodayDay
                            ? "bg-green-50"
                            : "bg-gray-50"
                        }`}
                        style={{ height: `${HEADER_HEIGHT}px` }}
                      >
                        <div className="h-full flex flex-col items-center justify-between">
                          <div className="flex flex-col items-center justify-between p-2">
                            <div
                              className={`font-medium ${
                                isTodayDay
                                  ? "text-green-700 font-bold"
                                  : "text-gray-800"
                              }`}
                            >
                              {day}
                              {isTodayDay && (
                                <span className="ml-1 text-xs">(Today)</span>
                              )}
                            </div>
                            <div
                              className={`text-xs mt-1 ${
                                isWeekendDay
                                  ? "text-red-600 font-medium"
                                  : "text-gray-500"
                              }`}
                            >
                              {getDayName(day)}
                              {isWeekendDay && (
                                <span className="ml-1">(Weekend)</span>
                              )}
                            </div>
                          </div>

                          <div className="flex w-full mt-2 border-b">
                            <div
                              className={`flex-1 text-center p-1 border-r ${
                                isWeekendDay
                                  ? "bg-red-100"
                                  : isTodayDay
                                  ? "bg-green-100"
                                  : "bg-gray-100"
                              }`}
                            >
                              Batch
                            </div>
                            <div
                              className={`flex-1 text-center p-1 ${
                                isWeekendDay
                                  ? "bg-red-100"
                                  : isTodayDay
                                  ? "bg-green-100"
                                  : "bg-gray-100"
                              }`}
                            >
                              Carton
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
                    className="flex border-b hover:bg-gray-50 transition-colors"
                    style={{ height: `${ROW_HEIGHT}px` }}
                  >
                    {product.data.map((prod, index) => {
                      const day = index + 1;
                      const isWeekendDay = isWeekend(day);
                      const isTodayDay = isToday(day);

                      return (
                        <div
                          key={`${product.id}-${day}`}
                          className={`w-44 shrink-0 border-r ${
                            isWeekendDay
                              ? "bg-red-50"
                              : isTodayDay
                              ? "bg-green-50"
                              : ""
                          }`}
                          style={{ height: `${ROW_HEIGHT}px` }}
                        >
                          <div className="h-full flex items-center">
                            <div className="flex w-full">
                              <div
                                className={`flex-1 border-r ${
                                  isWeekendDay
                                    ? "bg-red-50"
                                    : isTodayDay
                                    ? "bg-green-50"
                                    : ""
                                }`}
                              >
                                <input
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
                                  className={`text-sm w-full h-full text-center border-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent px-2 ${
                                    isWeekendDay
                                      ? "placeholder-red-300"
                                      : isTodayDay
                                      ? "placeholder-green-300"
                                      : ""
                                  }`}
                                  min="0"
                                  placeholder="0"
                                />
                              </div>
                              <div
                                className={`flex-1 ${
                                  isWeekendDay
                                    ? "bg-red-50"
                                    : isTodayDay
                                    ? "bg-green-50"
                                    : ""
                                }`}
                              >
                                <input
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
                                  className={`text-sm w-full h-full text-center border-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent px-4 ${
                                    isWeekendDay
                                      ? "placeholder-red-300"
                                      : isTodayDay
                                      ? "placeholder-green-300"
                                      : ""
                                  }`}
                                  min="0"
                                  placeholder="0"
                                />
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
                  className="flex border-t-2 border-gray-800 bg-gray-100"
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
                        className={`w-44 shrink-0 border-r ${
                          isWeekendDay
                            ? "bg-red-100"
                            : isTodayDay
                            ? "bg-green-100"
                            : "bg-gray-200"
                        }`}
                        style={{ height: `${ROW_HEIGHT}px` }}
                      >
                        <div className="h-full flex items-center">
                          <div className="flex w-full">
                            <div
                              className={`flex-1 border-r ${
                                isWeekendDay
                                  ? "bg-red-100"
                                  : isTodayDay
                                  ? "bg-green-100"
                                  : "bg-gray-200"
                              }`}
                            >
                              <div
                                className={`h-full flex items-center justify-center font-bold ${
                                  isTodayDay ? "text-green-700" : ""
                                }`}
                              >
                                {batchTotal}
                              </div>
                            </div>
                            <div
                              className={`flex-1 ${
                                isWeekendDay
                                  ? "bg-red-100"
                                  : isTodayDay
                                  ? "bg-green-100"
                                  : "bg-gray-200"
                              }`}
                            >
                              <div
                                className={`h-full flex items-center justify-center font-bold ${
                                  isTodayDay ? "text-green-700" : ""
                                }`}
                              >
                                {cartonTotal}
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
          )}
        </div>
      </div>
    </div>
  );
}
