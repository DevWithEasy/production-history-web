"use client";

import { getPeriod, setPeriod } from "@/utils/storage";
import {
  Bell,
  Calendar,
  CalendarDays,
  ChevronRight,
  Clock,
  FileText,
  Home,
  Info,
  Package,
  Settings,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function HomePage() {
  const saved = getPeriod();
  const today = new Date();

  // বাংলা মাসের নাম
  const banglaMonths = [
    "জানুয়ারি",
    "ফেব্রুয়ারি",
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

  // বাংলা দিনের নাম
  const banglaDays = [
    "রবিবার",
    "সোমবার",
    "মঙ্গলবার",
    "বুধবার",
    "বৃহস্পতিবার",
    "শুক্রবার",
    "শনিবার",
  ];

  const years = Array.from({ length: 5 }, (_, i) => 2026 + i);

  const months = [
    { name: "January", value: 1 },
    { name: "February", value: 2 },
    { name: "March", value: 3 },
    { name: "April", value: 4 },
    { name: "May", value: 5 },
    { name: "June", value: 6 },
    { name: "July", value: 7 },
    { name: "August", value: 8 },
    { name: "September", value: 9 },
    { name: "October", value: 10 },
    { name: "November", value: 11 },
    { name: "December", value: 12 },
  ];

  const [year, setYear] = useState<number>(saved.year);
  const [month, setMonth] = useState<number>(saved.month);

  // save period
  useEffect(() => {
    setPeriod({ year, month });
  }, [year, month]);

  // বর্তমান বাংলা তারিখ
  const currentDate = today.toLocaleDateString("bn-BD", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // বর্তমান সময়
  const currentTime = today.toLocaleTimeString("bn-BD", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 p-4 md:p-6 font-[family-name:var(--font-tiro-bangla)]">
      <div className="max-w-6xl mx-auto">
        {/* হেডার সেকশন */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                <Home className="inline-block mr-2 text-blue-600" />
                এস এন্ড বি নাইস ফুড ভ্যালি লিঃ
              </h1>
              <p className="text-gray-600 font-[family-name:var(--font-tiro-bangla)]">
                প্রোডাকশন ম্যানেজমেন্ট সিস্টেম
              </p>
            </div>

            {/* তারিখ ও সময় */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <CalendarDays className="text-blue-600" />
                <div>
                  <p className="font-medium text-gray-800 font-[family-name:var(--font-tiro-bangla)]">
                    {currentDate}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{currentTime}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* মেইন কন্টেন্ট */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* বাম সাইড - পিরিয়ড সিলেকশন */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <Calendar className="text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-800">
                  কার্যকরী পিরিয়ড সিলেক্ট করুন
                </h2>
              </div>

              <div className="space-y-6">
                {/* Year Selection */}
                <div className="space-y-3">
                  <label className="block text-lg font-semibold text-gray-700">
                    সাল (Year)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {years.map((y) => (
                      <button
                        key={y}
                        onClick={() => setYear(y)}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                          year === y
                            ? "border-blue-600 bg-blue-50 text-blue-700 font-bold"
                            : "border-gray-200 hover:border-blue-400 hover:bg-blue-50"
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-2xl font-bold">{y}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            {y === 2026 ? "বর্তমান" : ""}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Month Selection */}
                <div className="space-y-3">
                  <label className="block text-lg font-semibold text-gray-700">
                    মাস (Month)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {months.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setMonth(m.value)}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                          month === m.value
                            ? "border-green-600 bg-green-50 text-green-700 font-bold"
                            : "border-gray-200 hover:border-green-400 hover:bg-green-50"
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-xl font-bold">{m.name}</div>
                          <div className="text-sm text-gray-500 mt-1 font-[family-name:var(--font-tiro-bangla)]">
                            {banglaMonths[m.value - 1]}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected Period Display */}
                <div className="bg-gradient-to-r from-blue-100 to-green-100 p-6 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 mb-2">বর্তমান পিরিয়ড</p>
                      <h3 className="text-3xl font-bold text-gray-800">
                        {months[month - 1]?.name} {year}
                      </h3>
                      <p className="text-gray-600 mt-2 font-[family-name:var(--font-tiro-bangla)]">
                        {banglaMonths[month - 1]} {year}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <Info className="text-blue-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          এই পিরিয়ডে কাজ করবেন
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-5 rounded-xl border border-purple-200">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Package className="text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">
                      প্রোডাক্ট এন্ট্রি
                    </h4>
                    <p className="text-sm text-gray-600">
                      প্রতিদিনের প্রোডাকশন ডাটা ইনপুট
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-5 rounded-xl border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Users className="text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">ম্যানপাওয়ার</h4>
                    <p className="text-sm text-gray-600">
                      দৈনিক শ্রমিক সংখ্যা ট্র্যাকিং
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ডান সাইড - তথ্য ও নির্দেশনা */}
          <div className="space-y-6">
            {/* App Info Card */}
            <div className="bg-gradient-to-b from-blue-50 to-white rounded-xl shadow-lg p-6 border border-blue-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Settings className="text-blue-600" />
                সিস্টেম তথ্য
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-gray-700">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>ভার্সন: 1.0.0</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>সর্বশেষ আপডেট: ডিসেম্বর ২০২৬</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>ডেভেলপার: আইটি ডিপার্টমেন্ট</span>
                </li>
              </ul>
            </div>

            {/* Instructions Card */}
            <div className="bg-gradient-to-b from-green-50 to-white rounded-xl shadow-lg p-6 border border-green-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Bell className="text-green-600" />
                নির্দেশাবলী
              </h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="bg-blue-100 text-blue-800 font-bold w-8 h-8 rounded-full flex items-center justify-center">
                    ১
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">
                      পিরিয়ড সিলেক্ট করুন
                    </h4>
                    <p className="text-sm text-gray-600">
                      উপরে থেকে সাল ও মাস সিলেক্ট করুন
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="bg-green-100 text-green-800 font-bold w-8 h-8 rounded-full flex items-center justify-center">
                    ২
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">
                      প্রোডাকশন এন্ট্রি
                    </h4>
                    <p className="text-sm text-gray-600">
                      প্রতিদিনের প্রোডাকশন ডাটা ইনপুট করুন
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="bg-purple-100 text-purple-800 font-bold w-8 h-8 rounded-full flex items-center justify-center">
                    ৩
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">
                      রিপোর্ট দেখা
                    </h4>
                    <p className="text-sm text-gray-600">
                      ডেইলি/মাসিক রিপোর্ট চেক করুন
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-b from-purple-50 to-white rounded-xl shadow-lg p-6 border border-purple-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                দ্রুত একশন
              </h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-3 rounded-lg bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg group-hover:bg-blue-200">
                      <Package className="text-blue-600 w-5 h-5" />
                    </div>
                    <span className="font-medium">প্রোডাকশন এন্ট্রি</span>
                  </div>
                  <ChevronRight className="text-gray-400 group-hover:text-blue-600" />
                </button>

                <button className="w-full flex items-center justify-between p-3 rounded-lg bg-white border border-gray-200 hover:border-green-400 hover:bg-green-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-lg group-hover:bg-green-200">
                      <FileText className="text-green-600 w-5 h-5" />
                    </div>
                    <span className="font-medium">রিপোর্ট দেখা</span>
                  </div>
                  <ChevronRight className="text-gray-400 group-hover:text-green-600" />
                </button>

                <button className="w-full flex items-center justify-between p-3 rounded-lg bg-white border border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg group-hover:bg-purple-200">
                      <Users className="text-purple-600 w-5 h-5" />
                    </div>
                    <span className="font-medium">বেতন বৃদ্ধি আবেদন</span>
                  </div>
                  <ChevronRight className="text-gray-400 group-hover:text-purple-600" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ফুটার */}
        <div className="mt-10 pt-6 border-t border-gray-200 text-center text-gray-500 text-sm">
          <p className="font-[family-name:var(--font-tiro-bangla)]">
            © ২০২৬ এস এন্ড বি নাইস ফুড ভ্যালি লিঃ | সমস্ত স্বত্ব সংরক্ষিত
          </p>
          <p className="mt-2">প্রোডাকশন ম্যানেজমেন্ট সিস্টেম | ভার্সন ১.০</p>
        </div>
      </div>
    </div>
  );
}
