"use client";

import { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import Firebase from "@/utils/firebase";
import { getPeriod } from "@/utils/storage";
import { Users, Save, Calculator, BarChart3, Calendar, Loader2, Plus, CheckCircle, AlertCircle } from "lucide-react";

interface SectionManpowerData {
  [date: string]: {
    [sectionId: string]: number;
    total_manpower: number;
  };
}

interface Section {
  id: string;
  name: string;
}

export default function ManpowerUpdate() {
  const { year, month } = getPeriod();
  const monthName = [
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
  ][month - 1];

  const sections = [
    { id: "bakery", name: "বেকারি" },
    { id: "biscuit", name: "বিস্কুট" },
    { id: "cake", name: "কেক" },
    { id: "dairy_milk", name: "ডেইরি মিল্ক" },
    { id: "lachcha", name: "লাচ্ছা" },
    { id: "noodles", name: "নুডলস" },
    { id: "snacks", name: "স্ন্যাকস" },
    { id: "vermicelli", name: "ভার্মিসেলি" },
    { id: "wafer", name: "ওয়েফার" },
    { id: "water_and_beverage", name: "পানি ও পানীয়" },
  ];

  const [manpowerData, setManpowerData] = useState<SectionManpowerData>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isSaving, setIsSaving] = useState<{[key: string]: boolean}>({});
  
  // Use refs for input values to prevent re-renders
  const inputRefs = useRef<{[key: string]: HTMLInputElement | null}>({});
  const manpowerDataRef = useRef<SectionManpowerData>({});

  const lastDay = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: lastDay }, (_, i) => i + 1);

  useEffect(() => {
    manpowerDataRef.current = manpowerData;
  }, [manpowerData]);

  const hideMessage = () => {
    setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await Firebase.getManpowerByPeriod(year, monthName);

      if (data && data.data) {
        const formattedData: SectionManpowerData = {};

        data.data.forEach((item: any) => {
          const dateStr = item.date.toString().padStart(2, "0");
          formattedData[dateStr] = {
            bakery: item.bakery || 0,
            biscuit: item.biscuit || 0,
            cake: item.cake || 0,
            dairy_milk: item.dairy_milk || 0,
            lachcha: item.lachcha || 0,
            noodles: item.noodles || 0,
            snacks: item.snacks || 0,
            vermicelli: item.vermicelli || 0,
            wafer: item.wafer || 0,
            water_and_beverage: item.water_and_beverage || 0,
            total_manpower: item.total_manpower || 0,
          };
        });

        // Fill missing days
        for (let day = 1; day <= lastDay; day++) {
          const dateStr = day.toString().padStart(2, "0");
          if (!formattedData[dateStr]) {
            formattedData[dateStr] = {
              bakery: 0, biscuit: 0, cake: 0, dairy_milk: 0,
              lachcha: 0, noodles: 0, snacks: 0, vermicelli: 0,
              wafer: 0, water_and_beverage: 0, total_manpower: 0,
            };
          }
        }

        setManpowerData(formattedData);
        manpowerDataRef.current = formattedData;
      } else {
        const emptyData: SectionManpowerData = {};
        for (let day = 1; day <= lastDay; day++) {
          const dateStr = day.toString().padStart(2, "0");
          emptyData[dateStr] = {
            bakery: 0, biscuit: 0, cake: 0, dairy_milk: 0,
            lachcha: 0, noodles: 0, snacks: 0, vermicelli: 0,
            wafer: 0, water_and_beverage: 0, total_manpower: 0,
          };
        }
        setManpowerData(emptyData);
        manpowerDataRef.current = emptyData;
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setMessage({ type: "error", text: "ডাটা লোড করতে সমস্যা হয়েছে" });
      hideMessage();
    } finally {
      setLoading(false);
    }
  };

  const updateSectionData = async (date: string, sectionId: string, value: string) => {
    const dateNum = parseInt(date);
    const numValue = value === "" ? 0 : parseInt(value) || 0;
    
    const currentData = manpowerDataRef.current[date] || {
      bakery: 0, biscuit: 0, cake: 0, dairy_milk: 0,
      lachcha: 0, noodles: 0, snacks: 0, vermicelli: 0,
      wafer: 0, water_and_beverage: 0, total_manpower: 0,
    };

    const firebaseData = {
      date: dateNum,
      [sectionId]: numValue,
      ...currentData
    };

    const fieldKey = `${sectionId}-${date}`;
    
    try {
      setIsSaving(prev => ({ ...prev, [fieldKey]: true }));

      // Update state
      setManpowerData(prev => ({
        ...prev,
        [date]: {
          ...prev[date],
          [sectionId]: numValue,
        }
      }));

      manpowerDataRef.current = {
        ...manpowerDataRef.current,
        [date]: {
          ...manpowerDataRef.current[date],
          [sectionId]: numValue,
        }
      };

      await Firebase.updateManpowerData(year, monthName, firebaseData);
      
      // Show success feedback on the input
      const inputElement = inputRefs.current[fieldKey];
      if (inputElement) {
        inputElement.classList.add('border-green-500', 'bg-green-50');
        setTimeout(() => {
          inputElement.classList.remove('border-green-500', 'bg-green-50');
        }, 1000);
      }

    } catch (error) {
      console.error("Error updating section:", error);
      // Revert on error
      setManpowerData(prev => ({
        ...prev,
        [date]: {
          ...prev[date],
          [sectionId]: manpowerDataRef.current[date]?.[sectionId] || 0,
        }
      }));
      
      // Show error feedback
      const inputElement = inputRefs.current[fieldKey];
      if (inputElement) {
        inputElement.classList.add('border-red-500', 'bg-red-50');
        setTimeout(() => {
          inputElement.classList.remove('border-red-500', 'bg-red-50');
        }, 1000);
      }
    } finally {
      setIsSaving(prev => ({ ...prev, [fieldKey]: false }));
    }
  };

  const updateTotalManpower = async (date: string, value: string) => {
    const dateNum = parseInt(date);
    const numValue = value === "" ? 0 : parseInt(value) || 0;
    
    const currentData = manpowerDataRef.current[date] || {
      bakery: 0, biscuit: 0, cake: 0, dairy_milk: 0,
      lachcha: 0, noodles: 0, snacks: 0, vermicelli: 0,
      wafer: 0, water_and_beverage: 0, total_manpower: 0,
    };

    const firebaseData = {
      date: dateNum,
      total_manpower: numValue,
      ...currentData
    };

    const fieldKey = `total-${date}`;
    
    try {
      setIsSaving(prev => ({ ...prev, [fieldKey]: true }));

      setManpowerData(prev => ({
        ...prev,
        [date]: {
          ...prev[date],
          total_manpower: numValue,
        }
      }));

      manpowerDataRef.current = {
        ...manpowerDataRef.current,
        [date]: {
          ...manpowerDataRef.current[date],
          total_manpower: numValue,
        }
      };

      await Firebase.updateManpowerData(year, monthName, firebaseData);
      
      // Show success feedback
      const inputElement = inputRefs.current[fieldKey];
      if (inputElement) {
        inputElement.classList.add('border-green-500', 'bg-green-50');
        setTimeout(() => {
          inputElement.classList.remove('border-green-500', 'bg-green-50');
        }, 1000);
      }

    } catch (error) {
      console.error("Error updating total:", error);
      setManpowerData(prev => ({
        ...prev,
        [date]: {
          ...prev[date],
          total_manpower: manpowerDataRef.current[date]?.total_manpower || 0,
        }
      }));
      
      // Show error feedback
      const inputElement = inputRefs.current[fieldKey];
      if (inputElement) {
        inputElement.classList.add('border-red-500', 'bg-red-50');
        setTimeout(() => {
          inputElement.classList.remove('border-red-500', 'bg-red-50');
        }, 1000);
      }
    } finally {
      setIsSaving(prev => ({ ...prev, [fieldKey]: false }));
    }
  };

  const handleSectionChange = (sectionId: string, date: string, value: string) => {
    // Update the input value directly
    const inputElement = inputRefs.current[`${sectionId}-${date}`];
    if (inputElement) {
      inputElement.value = value.replace(/[^0-9]/g, '');
    }
    
    // Update state for immediate UI feedback
    const numValue = value === "" ? 0 : parseInt(value) || 0;
    setManpowerData(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        [sectionId]: numValue,
      }
    }));
  };

  const handleTotalChange = (date: string, value: string) => {
    const inputElement = inputRefs.current[`total-${date}`];
    if (inputElement) {
      inputElement.value = value.replace(/[^0-9]/g, '');
    }
    
    const numValue = value === "" ? 0 : parseInt(value) || 0;
    setManpowerData(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        total_manpower: numValue,
      }
    }));
  };

  const handleSectionBlur = (sectionId: string, date: string) => {
    const fieldKey = `${sectionId}-${date}`;
    const inputElement = inputRefs.current[fieldKey];
    if (!inputElement) return;
    
    const value = inputElement.value || "0";
    updateSectionData(date, sectionId, value);
  };

  const handleTotalBlur = (date: string) => {
    const fieldKey = `total-${date}`;
    const inputElement = inputRefs.current[fieldKey];
    if (!inputElement) return;
    
    const value = inputElement.value || "0";
    updateTotalManpower(date, value);
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent, callback: () => void) => {
    if (e.key === 'Enter') {
      callback();
      // Move focus to next input
      const currentInput = e.target as HTMLInputElement;
      const nextInput = currentInput.nextElementSibling as HTMLInputElement;
      if (nextInput && nextInput.tagName === 'INPUT') {
        nextInput.focus();
      }
    }
  };

  const saveAll = async () => {
    setMessage({ type: "info", text: "সব পরিবর্তন রিয়েল-টাইমে সেভ করা হয়েছে!" });
    hideMessage();
  };

  useEffect(() => {
    loadData();
  }, [year, month]);

  const getDayName = (day: number) => {
    const date = new Date(year, month - 1, day);
    return format(date, "EEE");
  };

  const getColumnTotal = (day: number) => {
    const dateStr = day.toString().padStart(2, "0");
    const dayData = manpowerData[dateStr];
    if (!dayData) return 0;

    return sections.reduce((total, section) => {
      return total + (dayData[section.id] || 0);
    }, 0);
  };

  const getSectionTotal = (sectionId: string) => {
    return daysArray.reduce((total, day) => {
      const dateStr = day.toString().padStart(2, "0");
      const dayData = manpowerData[dateStr];
      return total + (dayData?.[sectionId] || 0);
    }, 0);
  };

  const getGrandTotal = () => {
    return sections.reduce((total, section) => {
      return total + getSectionTotal(section.id);
    }, 0);
  };

  const getTotalManpowerForDay = (day: number) => {
    const dateStr = day.toString().padStart(2, "0");
    return manpowerData[dateStr]?.total_manpower || 0;
  };

  const getMonthTotalManpower = () => {
    return daysArray.reduce((total, day) => {
      return total + getTotalManpowerForDay(day);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 p-4 md:p-6">
      <div className="max-w-full mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 rounded-xl">
              <Users className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">ম্যানপাওয়ার ম্যানেজমেন্ট</h1>
              <p className="text-gray-600 font-[family-name:var(--font-tiro-bangla)]">
                {monthName} {year} - দৈনিক ম্যানপাওয়ার আপডেট
              </p>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          {/* Top Info Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">{monthName} {year}</h3>
                <p className="text-sm text-gray-600 font-[family-name:var(--font-tiro-bangla)]">
                  {sections.length} টি সেকশন, {lastDay} দিন
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                <span>সেকশন ম্যানপাওয়ার</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded"></div>
                <span>টোটাল ম্যানপাওয়ার</span>
              </div>
              <button
                onClick={saveAll}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                সেভ করুন
              </button>
            </div>
          </div>

          {message.text && (
            <div className={`mb-6 p-4 rounded-xl ${
              message.type === "success" 
                ? "bg-green-50 border border-green-200 text-green-700" 
                : message.type === "error" 
                ? "bg-red-50 border border-red-200 text-red-700"
                : "bg-blue-50 border border-blue-200 text-blue-700"
            }`}>
              <div className="flex items-center gap-3">
                {message.type === "success" ? (
                  <CheckCircle className="h-5 w-5" />
                ) : message.type === "error" ? (
                  <AlertCircle className="h-5 w-5" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin" />
                )}
                <span className="font-[family-name:var(--font-tiro-bangla)]">{message.text}</span>
              </div>
            </div>
          )}

          {/* Manpower Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600 font-[family-name:var(--font-tiro-bangla)]">ম্যানপাওয়ার ডাটা লোড হচ্ছে...</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="sticky left-0 bg-gray-50 p-4 text-left min-w-48 z-10">
                        <div className="font-semibold text-gray-800">সেকশন সমূহ</div>
                      </th>
                      {daysArray.map((day) => (
                        <th key={day} className="p-4 text-center min-w-28 border-l border-gray-200">
                          <div className="space-y-1">
                            <div className="font-medium text-gray-800">{day}</div>
                            <div className="text-xs text-gray-500">{getDayName(day)}</div>
                          </div>
                        </th>
                      ))}
                      <th className="p-4 text-center min-w-32 bg-gray-100 border-l border-gray-300">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-800">মোট</div>
                          <div className="text-xs text-gray-500">পুরো মাস</div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  
                  <tbody>
                    {/* Section Rows */}
                    {sections.map((section) => {
                      const sectionTotal = getSectionTotal(section.id);
                      return (
                        <tr key={section.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="sticky left-0 bg-white p-4 min-w-48 z-10">
                            <div className="flex items-center gap-3">
                              <div className="bg-blue-100 p-2 rounded-lg">
                                <Users className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-800">{section.name}</div>
                                <div className="text-xs text-gray-500">মোট: {sectionTotal} জন</div>
                              </div>
                            </div>
                          </td>
                          
                          {daysArray.map((day) => {
                            const dateStr = day.toString().padStart(2, "0");
                            const fieldKey = `${section.id}-${dateStr}`;
                            const currentValue = manpowerData[dateStr]?.[section.id] || 0;
                            
                            return (
                              <td key={day} className="p-4 border-l border-gray-200">
                                <div className="relative">
                                  <input
                                    ref={el => inputRefs.current[fieldKey] = el}
                                    type="text"
                                    inputMode="numeric"
                                    defaultValue={currentValue}
                                    onChange={(e) => handleSectionChange(section.id, dateStr, e.target.value)}
                                    onBlur={() => handleSectionBlur(section.id, dateStr)}
                                    onKeyPress={(e) => handleKeyPress(e, () => handleSectionBlur(section.id, dateStr))}
                                    className="w-full h-10 px-3 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    disabled={isSaving[fieldKey]}
                                  />
                                  {isSaving[fieldKey] && (
                                    <div className="absolute -top-1 -right-1">
                                      <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          
                          <td className="p-4 text-center bg-gray-50 border-l border-gray-300">
                            <div className="font-semibold text-gray-800 text-lg">
                              {sectionTotal}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Total Manpower Row */}
                    <tr className="border-t-2 border-blue-300 bg-blue-50">
                      <td className="sticky left-0 bg-blue-50 p-4 min-w-48 z-10">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-200 p-2 rounded-lg">
                            <Calculator className="h-4 w-4 text-blue-700" />
                          </div>
                          <div>
                            <div className="font-semibold text-blue-900">মোট ম্যানপাওয়ার</div>
                            <div className="text-xs text-blue-700">স্বতন্ত্র টোটাল</div>
                          </div>
                        </div>
                      </td>
                      
                      {daysArray.map((day) => {
                        const dateStr = day.toString().padStart(2, "0");
                        const fieldKey = `total-${dateStr}`;
                        const currentValue = manpowerData[dateStr]?.total_manpower || 0;
                        
                        return (
                          <td key={day} className="p-4 border-l border-blue-200">
                            <div className="relative">
                              <input
                                ref={el => inputRefs.current[fieldKey] = el}
                                type="text"
                                inputMode="numeric"
                                defaultValue={currentValue}
                                onChange={(e) => handleTotalChange(dateStr, e.target.value)}
                                onBlur={() => handleTotalBlur(dateStr)}
                                onKeyPress={(e) => handleKeyPress(e, () => handleTotalBlur(dateStr))}
                                className="w-full h-10 px-3 text-center border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                                disabled={isSaving[fieldKey]}
                              />
                              {isSaving[fieldKey] && (
                                <div className="absolute -top-1 -right-1">
                                  <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      
                      <td className="p-4 text-center bg-blue-100 border-l border-blue-300">
                        <div className="font-semibold text-blue-900 text-lg">
                          {getMonthTotalManpower()}
                        </div>
                      </td>
                    </tr>

                    {/* Column Totals Row */}
                    <tr className="border-t-2 border-gray-800 bg-gray-100">
                      <td className="sticky left-0 bg-gray-100 p-4 min-w-48 z-10">
                        <div className="flex items-center gap-3">
                          <div className="bg-gray-200 p-2 rounded-lg">
                            <BarChart3 className="h-4 w-4 text-gray-700" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">সেকশন টোটাল</div>
                            <div className="text-xs text-gray-600">সকল সেকশনের যোগফল</div>
                          </div>
                        </div>
                      </td>
                      
                      {daysArray.map((day) => (
                        <td key={day} className="p-4 text-center border-l border-gray-300">
                          <div className="font-semibold text-gray-800">{getColumnTotal(day)}</div>
                        </td>
                      ))}
                      
                      <td className="p-4 text-center bg-gray-200 border-l border-gray-400">
                        <div className="font-bold text-gray-900 text-xl">
                          {getGrandTotal()}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Legend and Help Text */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                  <span className="font-medium text-gray-800">সেকশন ম্যানপাওয়ার</span>
                </div>
                <p className="text-sm text-gray-600 font-[family-name:var(--font-tiro-bangla)]">
                  প্রতিটি সেকশনের দৈনিক ম্যানপাওয়ার এন্ট্রি করুন
                </p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded"></div>
                  <span className="font-medium text-blue-800">টোটাল ম্যানপাওয়ার</span>
                </div>
                <p className="text-sm text-blue-600 font-[family-name:var(--font-tiro-bangla)]">
                  দৈনিক মোট ম্যানপাওয়ার (স্বতন্ত্রভাবে গণনা করা হয়)
                </p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                  <span className="font-medium text-green-800">রিয়েল-টাইম সেভ</span>
                </div>
                <p className="text-sm text-green-600 font-[family-name:var(--font-tiro-bangla)]">
                  প্রতিটি ইনপুট ব্লার/এন্টারে স্বয়ংক্রিয়ভাবে সেভ হয়
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl border border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-bold text-gray-800">রিয়েল-টাইম আপডেট</h4>
            </div>
            <p className="text-gray-600 text-sm font-[family-name:var(--font-tiro-bangla)]">
              প্রতিটি পরিবর্তন স্বয়ংক্রিয়ভাবে ডাটাবেজে সংরক্ষণ হয়
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-white p-6 rounded-xl border border-green-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <Calculator className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-bold text-gray-800">অটো ক্যালকুলেশন</h4>
            </div>
            <p className="text-gray-600 text-sm font-[family-name:var(--font-tiro-bangla)]">
              টোটাল ও গ্র্যান্ড টোটাল স্বয়ংক্রিয়ভাবে গণনা হয়
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-white p-6 rounded-xl border border-purple-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-bold text-gray-800">ডেটা ভিজ্যুয়ালাইজেশন</h4>
            </div>
            <p className="text-gray-600 text-sm font-[family-name:var(--font-tiro-bangla)]">
              দৈনিক ও মাসিক রিপোর্ট এক নজরে দেখা যাবে
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}