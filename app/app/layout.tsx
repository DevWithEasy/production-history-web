"use client";

import { getPeriod } from "@/utils/storage";
import {
  BarChart3,
  Briefcase,
  CalendarPlus,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Factory,
  Home,
  LogOut,
  Menu,
  Package,
  PlusCircle,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Firebase from "../../utils/firebase";

interface Section {
  id: string;
  name: string;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [expandedMenus, setExpandedMenus] = useState<{
    production: boolean;
    manpower: boolean;
    products: boolean;
  }>({
    production: false,
    manpower: false,
    products: false,
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { month, year } = getPeriod();
  const banglaMonthName = [
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
  ][month - 1];

  const formatNumber = (num: number) => {
    return num.toLocaleString("bn-BD");
  };

  useEffect(() => {
    Firebase.getDocuments<Section>("sections").then(setSections);
  }, []);

  const isProduction = pathname.startsWith("/app/production");
  const isManpower = pathname.startsWith("/app/manpower");
  const isProducts = pathname.startsWith("/app/products");
  const isReports = pathname.startsWith("/app/reports");
  const isIncrements = pathname.startsWith("/app/increaments");

  // Auto expand menus based on current path
  useEffect(() => {
    setExpandedMenus({
      production: isProduction,
      manpower: isManpower,
      products: isProducts,
    });
  }, [pathname]);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const toggleMenu = (menu: keyof typeof expandedMenus) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menu]: !prev[menu],
    }));
  };

  const isActive = (path: string) => {
    if (path === "/app" && pathname === "/app") return true;
    return pathname.startsWith(path);
  };

  const navItems = [
    {
      name: "হোম",
      icon: Home,
      href: "/app",
      exact: true,
    },
    {
      name: "প্রোডাকশন",
      icon: Factory,
      href: "/app/production", // এখানে লিঙ্ক যোগ করেছি
      hasSubmenu: true,
      subItems: [
        {
          name: "প্রোডাকশন ড্যাশবোর্ড",
          href: "/app/production",
          icon: Factory,
        },
        ...sections.map((section) => ({
          name: section.name,
          href: `/app/production/${section.id}`,
          icon: ChevronRight,
        })),
      ],
    },
    {
      name: "ম্যানপাওয়ার",
      icon: Users,
      href: "/app/manpower", // এখানে লিঙ্ক যোগ করেছি
      hasSubmenu: true,
      subItems: [
        {
          name: "ম্যানপাওয়ার ড্যাশবোর্ড",
          href: "/app/manpower",
          icon: Users,
        },
        {
          name: "ম্যানপাওয়ার এন্ট্রি",
          href: "/app/manpower/update",
          icon: UserPlus,
        },
      ],
    },
    {
      name: "ম্যানেজমেন্ট",
      icon: Package,
      href: "/app/managements",
      hasSubmenu: true,
      subItems: [
        {
          name: "সমস্ত প্রোডাক্ট",
          href: "/app/managements/products",
          icon: Package,
        },
        {
          name: "প্রোডাক্ট যোগ করুন",
          href: "/app/managements/products/add",
          icon: PlusCircle,
        },
        {
          name: "নতুন পিরিয়ড যোগ করুন",
          href: "/app/managements/add-period",
          icon: CalendarPlus,
        },
        {
          name: "ওপেনিং ও প্রাইস আপডেট",
          href: "/app/managements/opening-value-update",
          icon: CalendarPlus,
        },
        {
          name: "ডেইলি প্রোডাকশন কপি",
          href: "/app/managements/daily-production-copy",
          icon: CalendarPlus,
        },
      ],
    },
    {
      name: "রিপোর্টস",
      icon: BarChart3,
      href: "/app/reports",
    },
    {
      name: "বেতন বৃদ্ধি",
      icon: DollarSign,
      href: "/app/increaments",
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-(family-name:--font-tiro-bangla)">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-8 left-4 z-50 p-2 bg-blue-600 text-white rounded-lg shadow-lg"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-linear-to-b from-blue-700 to-blue-500 text-white flex flex-col transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Close button for mobile */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-1 text-blue-200 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Logo */}
        <div className="p-6 border-b border-blue-600">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg">
              <Factory className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold">এস এন্ড বি নাইস</h1>
              <p className="text-xs text-blue-200">প্রোডাকশন সিস্টেম</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isItemActive = isActive(item.href);

              return (
                <div key={item.name}>
                  {item.hasSubmenu ? (
                    <>
                      <div className="flex">
                        {/* Main Menu Item as Link */}
                        <Link
                          href={item.href}
                          onClick={() => {
                            // On mobile, clicking main menu item expands submenu
                            if (window.innerWidth < 1024) {
                              toggleMenu(item.name.toLowerCase() as any);
                            }
                          }}
                          className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                            isItemActive
                              ? "bg-blue-700 text-white"
                              : "hover:bg-blue-700/50 text-blue-100"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{item.name}</span>
                        </Link>

                        {/* Expand/Collapse Button */}
                        <button
                          onClick={() =>
                            toggleMenu(item.name.toLowerCase() as any)
                          }
                          className={`px-2 rounded-r-lg transition-all duration-200 ${
                            isItemActive
                              ? "bg-blue-700 text-white"
                              : "hover:bg-blue-700/50 text-blue-100"
                          }`}
                        >
                          {expandedMenus[
                            item.name.toLowerCase() as keyof typeof expandedMenus
                          ] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      {expandedMenus[
                        item.name.toLowerCase() as keyof typeof expandedMenus
                      ] && (
                        <div className="ml-8 mt-1 space-y-1">
                          {item.subItems?.map((subItem) => {
                            const SubIcon = subItem.icon;
                            const isSubActive = isActive(subItem.href);

                            return (
                              <Link
                                key={subItem.name}
                                href={subItem.href}
                                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 ${
                                  isSubActive
                                    ? "bg-blue-600 text-white"
                                    : "hover:bg-blue-700/30 text-blue-200"
                                }`}
                              >
                                <SubIcon className="h-4 w-4" />
                                <span className="text-sm">{subItem.name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                        isItemActive
                          ? "bg-blue-700 text-white"
                          : "hover:bg-blue-700/50 text-blue-100"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-blue-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <Briefcase className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">প্রশাসক</p>
              <p className="text-xs text-blue-200">Admin Panel</p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("pin_key");
                router.push("/");
              }}
              className="p-2 hover:bg-blue-600 rounded-lg transition-colors"
              title="লগআউট"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-100/50 bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Top Bar */}
        <div className="bg-white border-b pl-16 md:pl-4 lg:pl-4 px-4 lg:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                {pathname === "/app" && "ড্যাশবোর্ড"}
                {pathname === "/app/production" && "প্রোডাকশন ড্যাশবোর্ড"}
                {isProduction &&
                  pathname !== "/app/production" &&
                  "প্রোডাকশন ম্যানেজমেন্ট"}
                {isManpower && "ম্যানপাওয়ার ম্যানেজমেন্ট"}
                {isProducts && "প্রোডাক্ট ম্যানেজমেন্ট"}
                {isReports && "রিপোর্টস"}
                {isIncrements && "বেতন বৃদ্ধি ব্যবস্থাপনা"}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {pathname === "/app" && "প্রধান প্যানেল"}
                {pathname === "/app/production" &&
                  "সকল সেকশনের প্রোডাকশন সারসংক্ষেপ"}
                {isProduction &&
                  pathname !== "/app/production" &&
                  "দৈনিক প্রোডাকশন ডাটা এন্ট্রি ও ব্যবস্থাপনা"}
                {isManpower && "শ্রমিক সংখ্যা ও তথ্য ব্যবস্থাপনা"}
                {isProducts && "প্রোডাক্ট তালিকা ও ক্যাটাগরি ব্যবস্থাপনা"}
                {isReports && "প্রোডাকশন রিপোর্ট ও বিশ্লেষণ"}
                {isIncrements && "কর্মীদের বেতন বৃদ্ধির আবেদন ব্যবস্থাপনা"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-blue-50 px-3 py-2 rounded-lg">
                <p className="text-xs sm:text-sm text-gray-600">
                  বর্তমান পিরিয়ড
                </p>
                <p className="font-semibold text-blue-700 text-sm sm:text-base">
                  {banglaMonthName} {formatNumber(year)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
