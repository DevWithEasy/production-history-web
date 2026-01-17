"use client";

import { ManPower } from "@/types/Manpower.Types";
import Firebase from "@/utils/firebase";
import { getPeriod } from "@/utils/storage";
import { useCallback, useEffect, useState } from "react";
import { Users, TrendingUp, TrendingDown, Calendar, BarChart3, PieChart, Target, ArrowUpRight, ArrowDownRight, Minus, Loader2, Activity, Zap, UserCheck } from "lucide-react";

interface SectionData {
  id: string;
  name: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  color: string;
}

export default function Manpower() {
  const { year, month } = getPeriod();

  const monthBnNames = [
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
  ];
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

  // Current month name
  const monthName = monthNames[month - 1];

  // Get previous month + year
  const getPreviousMonth = useCallback(
    (monthIndex: number, year: number) => {
      if (monthIndex === 0) {
        return { month: 11, year: year - 1 };
      }
      return { month: monthIndex - 1, year };
    },
    []
  );

  // Previous month info
  const prevMonthInfo = getPreviousMonth(month - 1, year);
  const prevMonthName = monthNames[prevMonthInfo.month];

  const [manpower, setManpower] = useState<ManPower | null>(null);
  const [prevMonthManpower, setPrevMonthManpower] = useState<ManPower | null>(null);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [overview, setOverview] = useState({
    totalCurrent: 0,
    totalPrevious: 0,
    totalChange: 0,
    totalChangePercent: 0,
    averagePerDay: 0,
    highestSection: { name: "", value: 0 },
    lowestSection: { name: "", value: 0 }
  });

  const sectionConfigs = [
    { id: "bakery", name: "বেকারি", color: "bg-blue-500" },
    { id: "biscuit", name: "বিস্কুট", color: "bg-green-500" },
    { id: "cake", name: "কেক", color: "bg-purple-500" },
    { id: "dairy_milk", name: "ডেইরি মিল্ক", color: "bg-yellow-500" },
    { id: "lachcha", name: "লাচ্ছা", color: "bg-pink-500" },
    { id: "noodles", name: "নুডলস", color: "bg-indigo-500" },
    { id: "snacks", name: "স্ন্যাকস", color: "bg-red-500" },
    { id: "vermicelli", name: "ভার্মিসেলি", color: "bg-teal-500" },
    { id: "wafer", name: "ওয়েফার", color: "bg-orange-500" },
    { id: "water_and_beverage", name: "পানি ও পানীয়", color: "bg-cyan-500" },
  ];

  useEffect(() => {
    setLoading(true);
    
    // Load current month manpower
    Firebase.getManpowerByPeriod<ManPower>(year, monthName)
      .then((data) => {
        setManpower(data);
        
        // Load previous month manpower
        return Firebase.getManpowerByPeriod<ManPower>(
          prevMonthInfo.year,
          prevMonthName
        );
      })
      .then(setPrevMonthManpower)
      .catch((error) => {
        console.error("Error loading manpower data:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [year, monthName, prevMonthInfo.year, prevMonthName]);

  // Calculate section-wise data
  useEffect(() => {
    if (!manpower) return;

    const calculateSectionData = () => {
      const sectionData: SectionData[] = [];
      let totalCurrent = 0;
      let totalPrevious = 0;
      let highestValue = 0;
      let lowestValue = Infinity;
      let highestSection = { name: "", value: 0 };
      let lowestSection = { name: "", value: 0 };

      sectionConfigs.forEach((config) => {
        // Calculate current month total for this section
        const currentTotal = manpower.data?.reduce((sum, day) => {
          return sum + (day[config.id as keyof typeof day] as number || 0);
        }, 0) || 0;

        // Calculate previous month total for this section
        const previousTotal = prevMonthManpower?.data?.reduce((sum, day) => {
          return sum + (day[config.id as keyof typeof day] as number || 0);
        }, 0) || 0;

        const change = currentTotal - previousTotal;
        const changePercent = previousTotal > 0 
          ? (change / previousTotal) * 100 
          : (currentTotal > 0 ? 100 : 0);

        sectionData.push({
          ...config,
          current: currentTotal,
          previous: previousTotal,
          change,
          changePercent
        });

        totalCurrent += currentTotal;
        totalPrevious += previousTotal;

        // Track highest and lowest sections
        if (currentTotal > highestValue) {
          highestValue = currentTotal;
          highestSection = { name: config.name, value: currentTotal };
        }
        if (currentTotal < lowestValue && currentTotal > 0) {
          lowestValue = currentTotal;
          lowestSection = { name: config.name, value: currentTotal };
        }
      });

      // Calculate overall metrics
      const totalChange = totalCurrent - totalPrevious;
      const totalChangePercent = totalPrevious > 0 
        ? (totalChange / totalPrevious) * 100 
        : (totalCurrent > 0 ? 100 : 0);
      
      const averagePerDay = manpower.data?.length 
        ? totalCurrent / manpower.data.length 
        : 0;

      setSections(sectionData);
      setOverview({
        totalCurrent,
        totalPrevious,
        totalChange,
        totalChangePercent,
        averagePerDay,
        highestSection: highestSection.value > 0 ? highestSection : { name: "N/A", value: 0 },
        lowestSection: lowestValue < Infinity ? lowestSection : { name: "N/A", value: 0 }
      });
    };

    calculateSectionData();
  }, [manpower, prevMonthManpower]);

  // Calculate daily totals for chart
  const getDailyTotals = () => {
    if (!manpower?.data) return [];
    
    return manpower.data.map((day) => {
      const total = sectionConfigs.reduce((sum, config) => {
        return sum + (day[config.id as keyof typeof day] as number || 0);
      }, 0);
      
      return {
        date: day.date,
        total: total
      };
    });
  };

  // Get section percentage of total
  const getSectionPercentage = (sectionValue: number) => {
    return overview.totalCurrent > 0 
      ? ((sectionValue / overview.totalCurrent) * 100).toFixed(1)
      : "0";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-blue-500 to-blue-600 animate-pulse flex items-center justify-center">
              <Users className="h-10 w-10 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">ডাটা লোড হচ্ছে</h2>
            <p className="text-gray-600 font-[family-name:var(--font-tiro-bangla)]">
              ম্যানপাওয়ার ড্যাশবোর্ড প্রস্তুত করা হচ্ছে...
            </p>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 rounded-xl">
              <Users className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">ম্যানপাওয়ার ড্যাশবোর্ড</h1>
              <p className="text-gray-600 font-[family-name:var(--font-tiro-bangla)]">
                {monthName} {year} - সেকশনওয়াইজ বিশ্লেষণ
              </p>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Manpower Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                overview.totalChange >= 0 
                  ? "bg-green-100 text-green-800" 
                  : "bg-red-100 text-red-800"
              }`}>
                {overview.totalChange >= 0 ? (
                  <span className="flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    {overview.totalChangePercent.toFixed(1)}%
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <ArrowDownRight className="h-3 w-3" />
                    {Math.abs(overview.totalChangePercent).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">মোট ম্যানপাওয়ার</h3>
              <div className="text-2xl font-bold text-gray-800 mb-2">{overview.totalCurrent.toLocaleString()} জন</div>
              <div className="text-sm text-gray-600">
                পূর্ববর্তী মাস: {overview.totalPrevious.toLocaleString()} জন
              </div>
            </div>
          </div>

          {/* Average Per Day Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">দৈনিক গড়</h3>
              <div className="text-2xl font-bold text-gray-800 mb-2">
                {overview.averagePerDay.toFixed(0)} জন
              </div>
              <div className="text-sm text-gray-600">
                প্রতিদিনের গড় ম্যানপাওয়ার
              </div>
            </div>
          </div>

          {/* Highest Section Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">সর্বোচ্চ সেকশন</h3>
              <div className="text-2xl font-bold text-gray-800 mb-2">
                {overview.highestSection.name}
              </div>
              <div className="text-sm text-gray-600">
                {overview.highestSection.value.toLocaleString()} জন
              </div>
            </div>
          </div>

          {/* Lowest Section Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-orange-100">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <TrendingDown className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">সর্বনিম্ন সেকশন</h3>
              <div className="text-2xl font-bold text-gray-800 mb-2">
                {overview.lowestSection.name}
              </div>
              <div className="text-sm text-gray-600">
                {overview.lowestSection.value.toLocaleString()} জন
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Header */}
        <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-2xl border border-blue-200 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">মাসিক তুলনা</h3>
                <p className="text-gray-600 text-sm font-[family-name:var(--font-tiro-bangla)]">
                  {monthName} {year} বনাম {prevMonthName} {prevMonthInfo.year}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">পরিবর্তন</div>
              <div className={`text-lg font-bold ${
                overview.totalChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {overview.totalChange >= 0 ? '+' : ''}{overview.totalChange.toLocaleString()} জন
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Section-wise Comparison */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-800">সেকশনওয়াইজ বিশ্লেষণ</h3>
                </div>
                <div className="text-sm text-gray-500">
                  {sections.length} টি সেকশন
                </div>
              </div>

              <div className="space-y-4">
                {sections.map((section) => (
                  <div key={section.id} className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${section.color}`}></div>
                        <div>
                          <h4 className="font-medium text-gray-800">{section.name}</h4>
                          <div className="text-xs text-gray-500">
                            মোটের {getSectionPercentage(section.current)}%
                          </div>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        section.change >= 0 
                          ? "bg-green-100 text-green-800" 
                          : "bg-red-100 text-red-800"
                      }`}>
                        {section.change >= 0 ? '+' : ''}{section.change.toLocaleString()} জন
                      </div>
                    </div>

                    <div className="space-y-2">
                      {/* Current Month */}
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          {monthName} {year}
                        </div>
                        <div className="font-semibold text-gray-800">
                          {section.current.toLocaleString()} জন
                        </div>
                      </div>

                      {/* Previous Month */}
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                          {prevMonthName} {prevMonthInfo.year}
                        </div>
                        <div className="text-gray-600">
                          {section.previous.toLocaleString()} জন
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="pt-2">
                        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`absolute top-0 left-0 h-full rounded-full ${
                              section.change >= 0 ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{ 
                              width: `${Math.min(Math.abs(section.changePercent), 100)}%` 
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 pt-1">
                          <span>পূর্ববর্তী মাস</span>
                          <span>
                            {section.change >= 0 ? 'বৃদ্ধি' : 'হ্রাস'} 
                            : {Math.abs(section.changePercent).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary and Statistics */}
          <div className="space-y-8">
            {/* Distribution Pie */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-6">
                <Target className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-bold text-gray-800">বন্টন বিশ্লেষণ</h3>
              </div>

              <div className="space-y-4">
                {sections.map((section) => {
                  const percentage = getSectionPercentage(section.current);
                  return (
                    <div key={section.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${section.color}`}></div>
                        <span className="text-sm text-gray-700">{section.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-full rounded-full ${section.color}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-800 w-10">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Performers */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-6">
                <Activity className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-bold text-gray-800">সেরা পারফর্মার</h3>
              </div>

              <div className="space-y-4">
                {sections
                  .filter(s => s.change > 0)
                  .sort((a, b) => b.changePercent - a.changePercent)
                  .slice(0, 3)
                  .map((section, index) => (
                    <div key={section.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                          <span className="text-green-700 font-bold">{index + 1}</span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{section.name}</div>
                          <div className="text-xs text-gray-600">
                            {section.changePercent.toFixed(1)}% বৃদ্ধি
                          </div>
                        </div>
                      </div>
                      <div className="text-green-700 font-bold">
                        +{section.change} জন
                      </div>
                    </div>
                  ))}
                
                {sections.filter(s => s.change <= 0).length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600 mb-3">উন্নয়ন প্রয়োজন</div>
                    {sections
                      .filter(s => s.change < 0)
                      .sort((a, b) => a.changePercent - b.changePercent)
                      .slice(0, 2)
                      .map((section) => (
                        <div key={section.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg mb-2">
                          <div className="font-medium text-gray-800">{section.name}</div>
                          <div className="text-red-700 font-bold">
                            {section.change} জন
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-2xl border border-blue-200">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-gray-800">দ্রুত পরিসংখ্যান</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">মোট সেকশন</span>
                  <span className="font-medium text-gray-800">{sections.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">বৃদ্ধির হার</span>
                  <span className={`font-medium ${
                    overview.totalChangePercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {overview.totalChangePercent >= 0 ? '+' : ''}{overview.totalChangePercent.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">গড় বৃদ্ধি</span>
                  <span className="font-medium text-gray-800">
                    {sections.length > 0 
                      ? (sections.reduce((sum, s) => sum + s.changePercent, 0) / sections.length).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">সর্বোচ্চ বৃদ্ধি</span>
                  <span className="font-medium text-green-600">
                    {sections.length > 0 
                      ? Math.max(...sections.map(s => s.changePercent)).toFixed(1)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 text-gray-600 text-sm">
            <UserCheck className="h-4 w-4" />
            <span className="font-[family-name:var(--font-tiro-bangla)]">
              সর্বশেষ আপডেট: {new Date().toLocaleDateString('bn-BD')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}