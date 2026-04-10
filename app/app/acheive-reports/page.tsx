"use client";
import { Product } from "@/types/Product.Types";
import Firebase from "@/utils/firebase";
import { getPeriod } from "@/utils/storage";
import { Printer } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useReactToPrint } from "react-to-print";

type ProductWithId = Product & { id: string };
type GroupedData = Record<string, any[]>;

export default function AchievementReports() {
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

  const [selectedDate, setSelectedDate] = useState<Date>(
    new Date(year, month - 1, 1),
  );
  const [products, setProducts] = useState<ProductWithId[]>([]);
  const [data, setData] = useState<GroupedData>({});

  // প্রিন্টের জন্য রেফ
  const contentRef = useRef<HTMLDivElement>(null);

  // প্রিন্ট ফাংশন
  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `Achievement_Report_${selectedDate.getDate()}_${monthName}_${year}`,
    pageStyle: `
      @media print {
        @page {
          size: A4;
          margin-top: 0.5in;
          margin-bottom: 0.2in;
          margin-right: 0.2in;
          margin-left: 0.2in;
        }
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          font-size: 9px !important;
        }
        .no-print {
          display: none !important;
        }
        .print-table {
          width: 100% !important;
          border-collapse: collapse !important;
          font-size: 9px !important;
          table-layout: fixed !important;
        }
        .print-table th, .print-table td {
          border: 1px solid #000 !important;
          padding: 2px 3px !important;
          text-align: center !important;
          font-size: 9px !important;
          word-wrap: break-word !important;
        }
        .print-table th {
          background-color: #f0f0f0 !important;
          font-weight: bold !important;
        }
        .section-column {
          width: 8% !important;
          min-width: 40px !important;
          max-width: 45px !important;
        }
        .product-column {
          width: 30% !important;
          min-width: 100px !important;
          text-align: left !important;
        }
        .number-column {
          width: 10% !important;
          min-width: 55px !important;
        }
        .percentage-column {
          width: 8% !important;
          min-width: 60px !important;
        }
        .product-info {
          font-size: 8px !important;
          line-height: 1.2 !important;
        }
        .product-name {
          font-weight: bold !important;
          margin-bottom: 1px !important;
          font-size: 9px !important;
        }
        .product-sku {
          color: #666 !important;
          font-size: 7px !important;
        }
        .total-row td,
        .total-row span,
        .total-value-row td,
        .total-value-row span {
          font-size: 8px !important;
          padding: 1px 2px !important;
        }
      }
    `,
  });

  const findFilter = (date: number) => {
    // ফিল্টার করা ডাটা: যেসব প্রোডাক্টের sales_target > 0 এবং (opening বা totalCarton যেকোনো একটি > 0)
    const filterData = products
      .map((product) => {
        const {
          name,
          sku,
          code,
          section,
          price,
          opening,
          sales_target,
          data: productData,
        } = product;

        const totalProduction = productData.filter((d) => d.date <= date);
        const totalCarton = totalProduction.reduce(
          (acc, curr) => acc + curr.carton,
          0,
        );

        const achieved = opening + totalCarton;

        // পার্সেন্টেজ ক্যালকুলেশন - sales_target জিরো হলে এড়িয়ে যাওয়া হবে
        let achieved_percentage = 0;
        let due_of_production = 0;
        let due_percentage = 0;

        if (sales_target > 0) {
          achieved_percentage = (achieved / sales_target) * 100;
          due_of_production = sales_target - achieved;
          due_percentage = (due_of_production / sales_target) * 100;
        }

        return {
          name,
          sku,
          code,
          price,
          section,
          opening,
          sales_target,
          totalCarton,
          achieved,
          achieved_percentage,
          due_of_production: due_of_production < 0 ? 0 : due_of_production,
          due_percentage: due_percentage < 0 ? 0 : due_percentage,
          daily_carton: productData.find((d) => d.date === date)?.carton ?? 0,
          achieved_value: totalCarton * price,
        };
      })
      // শুধুমাত্র সেসব প্রোডাক্ট রাখুন যাদের sales_target > 0
      .filter(
        (product) =>
          product.sales_target !== 0 ||
          product.opening !== 0 ||
          product.totalCarton !== 0,
      );

    // GROUP BY SECTION
    const groupedBySection = filterData.reduce<GroupedData>((acc, product) => {
      if (!acc[product.section]) {
        acc[product.section] = [];
      }
      acc[product.section].push(product);
      return acc;
    }, {});

    setData(groupedBySection);
  };

  useEffect(() => {
    const run = async () => {
      const p = await Firebase.getProductsByPeriod<Product>(year, monthName);
      setProducts(p);
    };
    run();
  }, [year, monthName]);

  useEffect(() => {
    if (products.length > 0) {
      findFilter(selectedDate.getDate());
    }
  }, [products, selectedDate]);

  const handleCalendarChange = (value: unknown) => {
    if (!(value instanceof Date)) return;
    setSelectedDate(value);
    findFilter(value.getDate());
  };

  const sections = Object.keys(data).filter(
    (section) => data[section].length > 0,
  );

  // প্রতিটি সেকশনের মোট অ্যাচিভড ভ্যালু
  const getSectionAchievedValue = (section: string): number => {
    if (!data[section]) return 0;
    return data[section].reduce(
      (sum, product) => sum + product.achieved_value,
      0,
    );
  };

  // সেকশনের মোট সেলস টার্গেট
  const getSectionSalesTarget = (section: string): number => {
    if (!data[section]) return 0;
    return data[section].reduce(
      (sum, product) => sum + product.sales_target,
      0,
    );
  };

  // সেকশনের মোট অ্যাচিভড (কার্টন)
  const getSectionAchieved = (section: string): number => {
    if (!data[section]) return 0;
    return data[section].reduce((sum, product) => sum + product.achieved, 0);
  };

  // সেকশনের মোট ওপেনিং
  const getSectionOpening = (section: string): number => {
    if (!data[section]) return 0;
    return data[section].reduce((sum, product) => sum + product.opening, 0);
  };

  // সেকশনের মোট প্রোডাকশন
  const getSectionTotalProduction = (section: string): number => {
    if (!data[section]) return 0;
    return data[section].reduce((sum, product) => sum + product.totalCarton, 0);
  };

  // সেকশনের মোট ডিউ প্রোডাকশন
  const getSectionDueProduction = (section: string): number => {
    if (!data[section]) return 0;
    return data[section].reduce(
      (sum, product) =>
        sum + (product.due_of_production > 0 ? product.due_of_production : 0),
      0,
    );
  };

  // টোটাল সেলস টার্গেট
  const getTotalSalesTarget = (): number => {
    return sections.reduce(
      (sum, section) => sum + getSectionSalesTarget(section),
      0,
    );
  };

  // টোটাল অ্যাচিভড
  const getTotalAchieved = (): number => {
    return sections.reduce(
      (sum, section) => sum + getSectionAchieved(section),
      0,
    );
  };

  // টোটাল ওপেনিং
  const getTotalOpening = (): number => {
    return sections.reduce(
      (sum, section) => sum + getSectionOpening(section),
      0,
    );
  };

  // টোটাল প্রোডাকশন
  const getTotalProduction = (): number => {
    return sections.reduce(
      (sum, section) => sum + getSectionTotalProduction(section),
      0,
    );
  };

  // টোটাল ডিউ
  const getTotalDue = (): number => {
    return sections.reduce(
      (sum, section) => sum + getSectionDueProduction(section),
      0,
    );
  };

  // টোটাল টাগেট ভ্যালু
  const getTotalTargetValue = (): number => {
    return products.reduce(
      (sum, product) => sum + product.sales_target * product.price,
      0,
    );
  };

  // টোটাল অ্যাচিভড ভ্যালু
  const getTotalAchievedValue = (): number => {
    return sections.reduce(
      (sum, section) => sum + getSectionAchievedValue(section),
      0,
    );
  };

  // ফরম্যাটেড তারিখ
  const formattedDate = selectedDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // সেকশন নাম ডিসপ্লে করার জন্য
  const getDisplaySectionName = (section: string): string => {
    const sectionNames: Record<string, string> = {
      bakery: "Bakery",
      biscuit: "Biscuit",
      cake: "Cake",
      dairy_milk: "Dairy Milk",
      lachcha: "Lachcha",
      noodles: "Noodles",
      snacks: "Snacks",
      vermicelli: "Vermicelli",
      wafer: "Wafer",
      water_and_beverage: "WTP",
      bun_ruti: "Bun Ruti",
    };
    return sectionNames[section] || section;
  };

  // সংখ্যা ফরম্যাট করার ফাংশন
  const formatNumber = (num: number): string => {
    if (isNaN(num) || !isFinite(num)) return "0";
    return num.toFixed(0);
  };

  // পার্সেন্টেজ ফরম্যাট
  const formatPercentage = (num: number): string => {
    if (isNaN(num) || !isFinite(num)) return "0%";
    return `${Math.round(num)}%`;
  };

  return (
    <div className="bg-linear-to-br from-blue-50 to-gray-50 p-4 mb-16">
      {/* প্রিন্ট বাটন */}
      <div className="fixed bottom-4 right-4 z-50 no-print">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-lg transition-colors duration-200"
        >
          <Printer className="text-lg" />
        </button>
      </div>

      {/* প্রিন্টেবল কন্টেন্ট */}
      <div ref={contentRef} className="print-container">
        <div className="mb-8 no-print">
          <h1 className="text-2xl font-bold mb-4 text-center">
            Achievement Report - {monthName} {year}
          </h1>
          <Calendar
            value={selectedDate}
            onChange={handleCalendarChange}
            minDate={new Date(year, month - 1, 1)}
            maxDate={
              new Date(year, month - 1, new Date(year, month, 0).getDate())
            }
            next2Label={null}
            prev2Label={null}
            nextLabel={null}
            prevLabel={null}
            view="month"
            tileClassName={({ date }) => {
              if (
                date.getFullYear() !== year ||
                date.getMonth() + 1 !== month
              ) {
                return "disabled-tile";
              }
              return "";
            }}
          />
        </div>

        {/* প্রিন্ট হেডার */}
        <div className="hidden print:block mb-4">
          <div className="text-center">
            <h1 className="text-xl font-bold">S&B Nice Food Valley Ltd.</h1>
            <h1 className="text-sm">Achievement Report</h1>
            <p className="text-sm">
              1163, National Highway, Jerkachar, Muhammad Ali Bazar, Feni Sadar
              Feni
            </p>
            <p className="text-sm">
              Period: {monthName} {year} | Date: {formattedDate}
            </p>
          </div>
          <p className="note mt-4">
            Note : This report is generated automatically depending on the data
            of distribution department and sales department{" "}
            <b style={{ background: "#cccccc", color: "black" }}>
              from 1 to {selectedDate.getDate()} {monthName} {year}
            </b>{" "}
            | System Link https://snb-ph.vercel.app | Developed By
            CodeOrbitStudio | Developer Robiul Awal - +8801717642515
          </p>
          <hr className="my-2 border-t border-gray-600" />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300 print-table text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-1 font-semibold print:py-0 print:px-1 section-column">
                  Section
                </th>
                <th className="border border-gray-300 p-1 font-semibold print:py-0 print:px-1 product-column">
                  Product
                </th>
                <th className="border border-gray-300 p-1 font-semibold print:py-0 print:px-1 number-column">
                  Sales Target
                </th>
                <th className="border border-gray-300 p-1 font-semibold print:py-0 print:px-1 number-column">
                  Opening
                </th>
                <th className="border border-gray-300 p-1 font-semibold print:py-0 print:px-1 number-column">
                  Total Production
                </th>
                <th className="border border-gray-300 p-1 font-semibold print:py-0 print:px-1 number-column">
                  Total Achieved
                </th>
                <th className="border border-gray-300 p-1 font-semibold print:py-0 print:px-1 percentage-column">
                  Achieved (%)
                </th>
                <th className="border border-gray-300 p-1 font-semibold print:py-0 print:px-1 number-column">
                  Due Production
                </th>
                <th className="border border-gray-300 p-1 font-semibold print:py-0 print:px-1 percentage-column">
                  Due (%)
                </th>
              </tr>
            </thead>
            <tbody>
              {sections.length > 0 ? (
                sections.map((section) => (
                  <React.Fragment key={section}>
                    {data[section].map((product, index) => (
                      <tr
                        key={`${section}-${product.sku}-${index}`}
                        className={
                          index % 2 === 0
                            ? "bg-white"
                            : "bg-gray-50 print:bg-gray-100"
                        }
                      >
                        {index === 0 ? (
                          <td
                            className="border border-gray-300 text-center align-middle print:py-0 print:px-1 section-column"
                            rowSpan={data[section].length}
                          >
                            <div className="section-content">
                              <p className="font-semibold text-xs print:text-[9px] leading-tight">
                                {getDisplaySectionName(section)}
                              </p>
                              <p className="text-xs print:text-[8px] text-blue-600">
                                (৳
                                {formatNumber(getSectionAchievedValue(section))}
                                )
                              </p>
                            </div>
                          </td>
                        ) : null}
                        <td className="border border-gray-300 p-1 print:py-0 print:px-1 product-column">
                          <div className="product-info">
                            <div className="product-name text-sm print:text-xs text-left">
                              [{product.code}] {product.name}
                            </div>
                          </div>
                        </td>
                        <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 number-column">
                          <span className="font-medium">
                            {formatNumber(product.sales_target)}
                          </span>
                        </td>
                        <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 number-column">
                          <span className="font-medium">
                            {formatNumber(product.opening)}
                          </span>
                        </td>
                        <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 number-column">
                          {formatNumber(product.totalCarton)}
                        </td>
                        <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 number-column">
                          <span className="font-semibold text-green-600">
                            {formatNumber(product.achieved)}
                          </span>
                        </td>
                        <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 percentage-column">
                          <span
                            className={`font-semibold ${product.achieved_percentage >= 100 ? "text-green-600" : product.achieved_percentage >= 75 ? "text-yellow-600" : "text-red-500"}`}
                          >
                            {formatPercentage(product.achieved_percentage)}
                          </span>
                        </td>
                        <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 number-column">
                          <span className="font-medium text-orange-600">
                            {formatNumber(product.due_of_production)}
                          </span>
                        </td>
                        <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 percentage-column">
                          <span className="font-medium text-orange-600">
                            {formatPercentage(product.due_percentage)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={9}
                    className="border border-gray-300 p-4 text-center text-gray-500"
                  >
                    No achievement data available for selected date
                  </td>
                </tr>
              )}
            </tbody>
            {sections.length > 0 && (
              <tfoot>
                {/* টোটাল সারি */}
                <tr className="bg-gray-200 font-bold total-row">
                  <td
                    colSpan={2}
                    className="border border-gray-300 p-1 text-right print:py-0 print:px-1"
                  >
                    <span className="print:text-xs">Total:</span>
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 number-column">
                    <span className="print:text-xs">
                      {formatNumber(getTotalSalesTarget())}
                    </span>
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 number-column">
                    <span className="print:text-xs">
                      {formatNumber(getTotalOpening())}
                    </span>
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 number-column">
                    <span className="print:text-xs">
                      {formatNumber(getTotalProduction())}
                    </span>
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 number-column">
                    <span className="print:text-xs text-green-700 font-bold">
                      {formatNumber(getTotalAchieved())}
                    </span>
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 percentage-column">
                    <span className="print:text-xs font-bold">
                      {getTotalSalesTarget() > 0
                        ? formatPercentage(
                            (getTotalAchieved() / getTotalSalesTarget()) * 100,
                          )
                        : "0%"}
                    </span>
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 number-column">
                    <span className="print:text-xs text-orange-700 font-bold">
                      {formatNumber(getTotalDue())}
                    </span>
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 percentage-column">
                    <span className="print:text-xs text-orange-700 font-bold">
                      {getTotalSalesTarget() > 0
                        ? formatPercentage(
                            (getTotalDue() / getTotalSalesTarget()) * 100,
                          )
                        : "0%"}
                    </span>
                  </td>
                </tr>

                {/* টোটাল ভ্যালু সারি */}
                <tr className="bg-blue-100 font-bold total-value-row">
                  <td
                    colSpan={2}
                    className="border border-gray-300 p-1 text-right print:py-0 print:px-1"
                  >
                    <span className="print:text-xs">Total Value:</span>
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 number-column">
                    <span className="print:text-xs">
                      ৳{formatNumber(getTotalTargetValue())}
                    </span>
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 number-column">
                    <span className="print:text-xs">-</span>
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 number-column">
                    <span className="print:text-xs">-</span>
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 number-column">
                    <span className="print:text-xs text-blue-700 font-bold">
                      ৳{formatNumber(getTotalAchievedValue())}
                    </span>
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 percentage-column">
                    <span className="print:text-xs">-</span>
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 number-column">
                    <span className="print:text-xs">-</span>
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 percentage-column">
                    <span className="print:text-xs">-</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <style jsx global>{`
        .disabled-tile {
          pointer-events: none;
          opacity: 0.4;
        }
        .react-calendar__navigation button:disabled {
          background-color: transparent;
        }
        .react-calendar {
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1rem;
        }

        .section-content {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100%;
          padding: 2px 0;
        }

        @media print {
          .no-print {
            display: none !important;
          }
          .print-container {
            padding: 0 !important;
            margin: 0 !important;
          }
          body {
            font-size: 9px !important;
          }
          h1,
          h2,
          h3 {
            page-break-after: avoid;
            font-size: 16px !important;
          }
          table {
            font-size: 9px !important;
            table-layout: fixed !important;
          }
          tr {
            page-break-after: auto;
          }
          .product-info {
            min-width: 100px;
          }
          .product-name {
            font-size: 9px !important;
            font-weight: 600 !important;
          }
          .section-column {
            width: 8% !important;
            max-width: 45px !important;
          }
          .total-row td,
          .total-row span {
            font-size: 8px !important;
            padding: 1px 2px !important;
          }
          .total-value-row td,
          .total-value-row span {
            font-size: 8px !important;
            padding: 1px 2px !important;
          }
          .note {
            font-size: 10px !important;
            font-style: italic !important;
            color: red !important;
          }
        }
      `}</style>
    </div>
  );
}
