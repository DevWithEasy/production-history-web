"use client";
import { ManPower } from "@/types/Manpower.Types";
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
type ManpowerData = Record<string, number> | undefined;

export default function Reports() {
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
    new Date(year, month - 1, 1)
  );
  const [products, setProducts] = useState<ProductWithId[]>([]);
  const [manpower, setManpower] = useState<ManPower | null>(null);
  const [data, setData] = useState<GroupedData>({});
  const [mp, setMp] = useState<ManpowerData>();

  // প্রিন্টের জন্য রেফ
  const contentRef = useRef<HTMLDivElement>(null);

  // প্রিন্ট ফাংশন
  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `Production_Report_${monthName}_${year}_${selectedDate.getDate()}`,
    pageStyle: `
      @media print {
        @page {
          size: A4;
          margin-top: 0.5in;
          margin-bottom: 0.2in;
          margin-right: 0.2in;
          margin-left: 0.5in;
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
          width: 6% !important;
          min-width: 35px !important;
          max-width: 40px !important;
        }
        .product-column {
          width: 31% !important;
          min-width: 100px !important;
          text-align: left !important;
        }
        .batch-column {
          width: 8% !important;
          min-width: 40px !important;
        }
        .carton-column {
          width: 8% !important;
          min-width: 40px !important;
        }
        .mo-order-column {
          width: 6% !important;
          min-width: 40px !important;
        }
        .total-batch-column {
          width: 8% !important;
          min-width: 40px !important;
        }
        .total-carton-column {
          width: 8% !important;
          min-width: 40px !important;
        }
        /* MP কলামের উইথ কমিয়ে দিয়েছি */
        .mp-column {
          width: 3% !important;
          min-width: 20px !important;
          max-width: 25px !important;
          padding: 1px 2px !important;
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
      }
    `,
  });

  const findFilter = (date: number) => {
    const filterData = products
      .map((product) => {
        const { name, sku, code, section, price, data: productData } = product;

        const findDayProduction = productData.find((d) => d.date === date);
        const totalProduction = productData.filter((d) => d.date <= date);

        const totalBatch = totalProduction.reduce(
          (acc, curr) => acc + curr.batch,
          0
        );
        const totalCarton = totalProduction.reduce(
          (acc, curr) => acc + curr.carton,
          0
        );

        return {
          name,
          sku,
          code,
          price,
          section,
          batch: findDayProduction?.batch ?? 0,
          carton: findDayProduction?.carton ?? 0,
          totalBatch,
          totalCarton,
          cartonValue: (findDayProduction?.carton ?? 0) * price,
          totalCartonValue: totalCarton * price,
        };
      })
      // ফিল্টার: যেসব প্রোডাক্টে batch এবং carton উভয়ই ০ (শূন্য) সেগুলো বাদ
      .filter(
        (product) =>
          product.batch > 0 ||
          product.carton > 0 ||
          product.totalBatch > 0 ||
          product.totalCarton > 0
      );

    // ✅ GROUP BY SECTION - শুধুমাত্র যেসব সেকশনে ফিল্টার করা প্রোডাক্ট আছে
    const groupedBySection = filterData.reduce<GroupedData>((acc, product) => {
      if (!acc[product.section]) {
        acc[product.section] = [];
      }
      acc[product.section].push(product);
      return acc;
    }, {});

    setData(groupedBySection);
    
    // সঠিকভাবে ম্যানপাওয়ার ডাটা পাওয়ার জন্য
    const findMP = manpower?.data?.find((m) => m.date === date);
    setMp(findMP);
    
    // ডিবাগ করার জন্য (শুধু ডেভেলপমেন্টে)
    console.log("Selected date:", date);
    console.log("Manpower data for date:", findMP);
    console.log("All manpower:", manpower);
  };

  useEffect(() => {
    const run = async () => {
      const p = await Firebase.getProductsByPeriod<Product>(year, monthName);
      setProducts(p);
      const mp = await Firebase.getManpowerByPeriod<ManPower>(year, monthName);
      setManpower(mp);
      
      // ডিবাগ লগ
      console.log("Loaded manpower data:", mp);
    };
    run();
  }, [year, monthName]);

  useEffect(() => {
    if (products.length > 0 && manpower) {
      findFilter(selectedDate.getDate());
    }
  }, [products, manpower, selectedDate]);

  const handleCalendarChange = (value: unknown) => {
    if (!(value instanceof Date)) return;

    setSelectedDate(value);
    findFilter(value.getDate());
  };

  const sections = Object.keys(data).filter(
    (section) => data[section].length > 0
  );

  // প্রতিটি সেকশনের ম্যানপাওয়ার পাওয়ার জন্য হেল্পার ফাংশন
  const getSectionManpower = (section: string): number => {
    if (!mp) return 0;
    
    // প্রোডাক্টের সেকশন এবং ম্যানপাওয়ার ডাটার কীগুলো ম্যাচ করানোর জন্য
    const sectionMap: Record<string, string> = {
      'bakery': 'bakery',
      'biscuit': 'biscuit', 
      'cake': 'cake',
      'dairy_milk': 'dairy_milk',
      'lachcha': 'lachcha',
      'noodles': 'noodles',
      'snacks': 'snacks',
      'vermicelli': 'vermicelli',
      'wafer': 'wafer',
      'water_and_beverage': 'water_and_beverage'
    };
    
    const manpowerKey = sectionMap[section];
    if (!manpowerKey) return 0;
    
    // mp অবজেক্ট থেকে মান পাওয়ার জন্য
    const manpowerValue = mp[manpowerKey as keyof typeof mp];
    
    // যদি undefined হয় তাহলে 0 রিটার্ন করুন
    return typeof manpowerValue === 'number' ? manpowerValue : 0;
  };

  // মোট ম্যানপাওয়ার
  const getTotalManpower = (): number => {
    if (!mp) return 0;
    return mp.total_manpower || 0;
  };

  // প্রতিটি সেকশনের মোট কার্টন ভ্যালু (প্রাইস * কার্টন)
  const getSectionCartonValue = (section: string): number => {
    if (!data[section]) return 0;
    return data[section].reduce(
      (sum, product) => sum + product.carton * product.price,
      0
    );
  };

  // প্রতিটি সেকশনের মোট টোটাল কার্টন ভ্যালু
  const getSectionTotalCartonValue = (section: string): number => {
    if (!data[section]) return 0;
    return data[section].reduce(
      (sum, product) => sum + product.totalCarton * product.price,
      0
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
      'bakery': 'Bakery',
      'biscuit': 'Biscuit',
      'cake': 'Cake',
      'dairy_milk': 'Dairy Milk',
      'lachcha': 'Lachcha',
      'noodles': 'Noodles',
      'snacks': 'Snacks',
      'vermicelli': 'Vermicelli',
      'wafer': 'Wafer',
      'water_and_beverage': 'WTP'
    };
    
    return sectionNames[section] || section;
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
            Production Report - {monthName} {year}
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

        {/* প্রিন্ট হেডার (শুধু প্রিন্টের সময় দেখা যাবে) */}
        <div className="hidden print:block mb-4">
          <div className="text-center">
            <h1 className="text-xl font-bold">Production Daily Report</h1>
            <p className="text-sm">
              1163, National Highway, Jerkachar, Muhammad Ali Bazar, Feni Sadar
              Feni
            </p>
            <p className="text-sm">
              Period: {monthName} {year} | Date: {formattedDate}
            </p>
          </div>
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
                <th className="border border-gray-300 p-1 font-semibold print:py-0 print:px-1 batch-column">
                  Daily Batch
                </th>
                <th className="border border-gray-300 p-1 font-semibold print:py-0 print:px-1 carton-column">
                  Daily Carton
                </th>
                <th className="border border-gray-300 p-1 font-semibold print:py-0 print:px-1 mo-order-column">
                  MO Order
                </th>
                <th className="border border-gray-300 p-1 font-semibold print:py-0 print:px-1 total-batch-column">
                  Total Batch
                </th>
                <th className="border border-gray-300 p-1 font-semibold print:py-0 print:px-1 total-carton-column">
                  Total Carton
                </th>
                <th className="border border-gray-300 p-1 font-semibold print:py-0 print:px-1 mp-column">
                  M.P
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
                            className="border w-8 border-gray-300 text-center align-middle print:py-0 print:px-1 section-column"
                            rowSpan={data[section].length}
                          >
                            <div className="section-content">
                              <p className="font-semibold text-xs print:text-[9px] leading-tight">
                                {getDisplaySectionName(section)}
                              </p>
                              <p className="text-xs print:text-[8px]">
                                (৳{getSectionCartonValue(section).toFixed(0)})
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
                        <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 batch-column">
                          <span className="font-medium">{product.batch > 0 ? product.batch : "-"}</span>
                        </td>
                        <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 carton-column">
                          <span className="font-medium">{product.carton > 0 ? product.carton : "-"}</span>
                        </td>
                        <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 mo-order-column">
                          {/* খালি কলাম - প্রিন্ট করার পর হাতে লিখবেন */}
                        </td>
                        <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 total-batch-column">
                          <span className="font-medium">
                            {product.totalBatch > 0 ? product.totalBatch : '-'}
                          </span>
                        </td>
                        <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 total-carton-column">
                          <span className="font-medium">
                            {product.totalCarton > 0 ? product.totalCarton : '-'}
                          </span>
                        </td>
                        {index === 0 ? (
                          <td
                            className="border border-gray-300 p-1 text-center font-semibold align-middle print:py-0 print:px-1 mp-column"
                            rowSpan={data[section].length}
                          >
                            <span className="print:text-xs">
                              {getSectionManpower(section) > 0 ? getSectionManpower(section) : '-'}
                            </span>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="border border-gray-300 p-4 text-center text-gray-500"
                  >
                    No production data available for selected date
                  </td>
                </tr>
              )}
            </tbody>
            {sections.length > 0 && (
              <tfoot>
                <tr className="bg-gray-200 font-bold">
                  <td
                    colSpan={2}
                    className="border border-gray-300 p-1 text-right print:py-0 print:px-1"
                  >
                    <span className="print:text-xs">Total:</span>
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 batch-column">
                    <span className="print:text-xs">
                      {sections.reduce(
                        (sum, section) =>
                          sum + data[section].reduce((s, p) => s + p.batch, 0),
                        0
                      )}
                    </span>
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 carton-column">
                    <span className="print:text-xs">
                      {sections.reduce(
                        (sum, section) =>
                          sum + data[section].reduce((s, p) => s + p.carton, 0),
                        0
                      )}
                    </span>
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 mo-order-column">
                    {/* MO Order এর টোটাল কলামও খালি রাখা হয়েছে */}
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 total-batch-column">
                    <span className="print:text-xs">
                      {sections.reduce(
                        (sum, section) =>
                          sum +
                          data[section].reduce((s, p) => s + p.totalBatch, 0),
                        0
                      )}
                    </span>
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 total-carton-column">
                    <span className="print:text-xs">
                      {sections.reduce(
                        (sum, section) =>
                          sum +
                          data[section].reduce((s, p) => s + p.totalCarton, 0),
                        0
                      )}
                    </span>
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 mp-column">
                    <span className="print:text-xs">
                      {getTotalManpower()}
                    </span>
                  </td>
                </tr>
                {/* মোট ভ্যালু সারি যোগ করুন */}
                <tr className="bg-blue-100 font-bold">
                  <td
                    colSpan={2}
                    className="border border-gray-300 p-1 text-right print:py-0 print:px-1"
                  >
                    <span className="print:text-xs">Total Value:</span>
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 batch-column">
                    <span className="print:text-xs">-</span>
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 carton-column">
                    <span className="print:text-xs text-blue-700">
                      ৳
                      {sections
                        .reduce(
                          (sum, section) =>
                            sum + getSectionCartonValue(section),
                          0
                        )
                        .toFixed(0)}
                    </span>
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 mo-order-column">
                    <span className="print:text-xs">-</span>
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 total-batch-column">
                    <span className="print:text-xs">-</span>
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 total-carton-column">
                    <span className="print:text-xs text-green-700">
                      ৳
                      {sections
                        .reduce(
                          (sum, section) =>
                            sum + getSectionTotalCartonValue(section),
                          0
                        )
                        .toFixed(0)}
                    </span>
                  </td>
                  <td className="border border-gray-300 p-1 text-center print:py-0 print:px-1 mp-column">
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

        /* প্রিন্ট স্টাইল */
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
            page-break-inside: avoid;
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
            width: 6% !important;
            max-width: 40px !important;
          }
          /* MP কলামের উইথ আরও কমিয়ে */
          .mp-column {
            width: 3% !important;
            min-width: 20px !important;
            max-width: 25px !important;
            font-size: 8px !important;
            padding: 1px 2px !important;
          }
        }
      `}</style>
    </div>
  );
}