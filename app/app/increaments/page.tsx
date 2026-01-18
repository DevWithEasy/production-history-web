"use client";
import Firebase from "@/utils/firebase";
import { db } from "@/utils/firebaseConfig";
import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FileText, PlusCircle, Calendar, Users, Eye, Trash2, Edit, Clock, ChevronRight } from "lucide-react";

type Increament = {
  name: string;
  header: string;
  person: {
    name: string;
    section: string;
    join_date: string;
    p_id: string;
    pre_salary: string;
    pro_salary: string;
  }[];
  footer: string;
  created_at: any;
};

type IncreamentWithId = Increament & { id: string };

export default function Increments() {
  const router = useRouter();
  const [data, setData] = useState<IncreamentWithId[]>([]);
  const [name, setName] = useState<string>("নতুন বেতন বৃদ্ধি আবেদন");
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await Firebase.getDocuments<Increament>("increaments");
      const filteredData = data.filter((d) => d.id !== "master");
      // Sort by creation date (newest first)
      const sortedData = filteredData.sort((a, b) => {
        const dateA = a.created_at?.toDate?.() || new Date(0);
        const dateB = b.created_at?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      setData(sortedData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const createIncreament = async () => {
    if (!name.trim()) {
      alert("দয়া করে আবেদনের নাম লিখুন");
      return;
    }

    try {
      setCreating(true);
      const docRef = doc(db, "increaments", "master");
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.error("Master document not found");
        alert("টেমপ্লেট ডকুমেন্ট পাওয়া যায়নি");
        return;
      }

      const data = docSnap.data() as Increament;
      const docCreateRef = await addDoc(collection(db, "increaments"), {
        ...data,
        name: name.trim(),
        created_at: new Date(),
        person: data.person || [],
      });
      
      router.push(`/app/increaments/${docCreateRef.id}`);
    } catch (error) {
      console.error("Error creating increment:", error);
      alert("আবেদন তৈরি করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "তারিখ নেই";
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("bn-BD", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return "অবৈধ তারিখ";
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString("bn-BD", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const deleteIncrement = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!confirm(`আপনি কি "${name}" আবেদনটি ডিলিট করতে চান?`)) {
      return;
    }

    try {
      // আপনার Firebase utils-এ deleteDocument ফাংশন ইমপ্লিমেন্ট করতে হবে
      await Firebase.deleteDocument("increaments", id);
      alert("আবেদন ডিলিট করা হয়েছে");
      fetchData(); // Refresh list
    } catch (error) {
      console.error("Error deleting increment:", error);
      alert("ডিলিট করতে সমস্যা হয়েছে");
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-3">
                <FileText className="text-blue-600" />
                বেতন বৃদ্ধি আবেদন ব্যবস্থাপনা
              </h1>
              <p className="text-gray-600">
                কর্মীদের বেতন বৃদ্ধির আবেদন তৈরি ও পরিচালনা করুন
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <Calendar className="text-blue-600" />
                <div>
                  <p className="font-medium text-gray-800">মোট আবেদন</p>
                  <p className="text-2xl font-bold text-blue-600">{data.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Create New Increment Section */}
        <div className="bg-linear-to-r from-blue-50 to-white rounded-xl shadow-lg p-6 mb-8 border border-blue-200">
          <div className="flex items-center gap-3 mb-6">
            <PlusCircle className="text-blue-600 h-7 w-7" />
            <h2 className="text-xl font-bold text-gray-800">নতুন আবেদন তৈরি করুন</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-2">
                আবেদনের নাম লিখুন
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="যেমন: ডিসেম্বর ২০২৬ বেতন বৃদ্ধি আবেদন"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="text-sm text-gray-600">
                <p className="">
                  ⓘ মাস্টার টেমপ্লেট থেকে একটি নতুন আবেদন তৈরি হবে
                </p>
              </div>
              <button
                onClick={createIncreament}
                disabled={creating || !name.trim()}
                className="px-8 py-3 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    তৈরি করা হচ্ছে...
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-5 w-5" />
                    নতুন আবেদন তৈরি করুন
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Increments List Section */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-linear-to-r from-gray-50 to-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="text-gray-700" />
                <h2 className="text-xl font-bold text-gray-800">সকল আবেদনসমূহ</h2>
              </div>
              <div className="mt-2 md:mt-0">
                <span className="text-sm text-gray-600">
                  মোট {data.length} টি আবেদন
                </span>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">আবেদন লোড হচ্ছে...</p>
            </div>
          ) : data.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {data.map((d) => (
                <Link
                  key={d.id}
                  href={`/app/increaments/${d.id}`}
                  className="block group hover:bg-blue-50 transition-all duration-200"
                >
                  <div className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left Side - Document Info */}
                    <div className="flex-1 text-sm">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>আবেদন</span>
                        </div>
                        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-semibold flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{d.person?.length || 0} জন কর্মী</span>
                        </div>
                      </div>
                      
                      <h3 className="text-base font-bold text-gray-800 mb-2 group-hover:text-blue-700 transition-colors">
                        {d.name || "নামবিহীন আবেদন"}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span className="">
                            তৈরি: {formatDate(d.created_at)}
                          </span>
                        </div>
                        {formatTime(d.created_at) && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{formatTime(d.created_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Right Side - Actions */}
                    <div className="flex items-center gap-3 text-sm">
                      <button
                        onClick={(e) => deleteIncrement(d.id, d.name, e)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                        title="ডিলিট করুন"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                      <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 group-hover:bg-blue-200 transition-colors">
                        <Eye className="h-5 w-5" />
                        <span>দেখুন</span>
                        <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="text-gray-300 mb-6">
                <FileText className="w-24 h-24 mx-auto" />
              </div>
              <h3 className="text-2xl font-bold text-gray-700 mb-3">
                কোন আবেদন পাওয়া যায়নি
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                এখনও কোন বেতন বৃদ্ধি আবেদন তৈরি করা হয়নি। উপরের ফর্ম থেকে প্রথম আবেদন তৈরি করুন।
              </p>
              <button
                onClick={() => {
                  setName("ডিসেম্বর ২০২৬ বেতন বৃদ্ধি আবেদন");
                  setTimeout(() => {
                    document.querySelector('input')?.focus();
                  }, 100);
                }}
                className="px-6 py-3 bg-blue-100 text-blue-700 font-semibold rounded-lg hover:bg-blue-200 transition-colors inline-flex items-center gap-2"
              >
                <Edit className="h-5 w-5" />
                প্রথম আবেদন তৈরি করুন
              </button>
            </div>
          )}
        </div>

        {/* Tips Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-linear-to-r from-green-50 to-white p-6 rounded-xl border border-green-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <FileText className="text-green-600 h-6 w-6" />
              </div>
              <h4 className="font-bold text-gray-800">আবেদন তৈরি</h4>
            </div>
            <p className="text-gray-600 text-sm">
              মাস্টার টেমপ্লেট থেকে নতুন আবেদন তৈরি করুন। কর্মীদের তথ্য যোগ করুন এবং প্রয়োজনীয় সম্পাদনা করুন।
            </p>
          </div>
          
          <div className="bg-linear-to-r from-purple-50 to-white p-6 rounded-xl border border-purple-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Users className="text-purple-600 h-6 w-6" />
              </div>
              <h4 className="font-bold text-gray-800">কর্মী যোগ করুন</h4>
            </div>
            <p className="text-gray-600 text-sm">
              প্রতিটি আবেদনে প্রয়োজনীয় সংখ্যক কর্মী যোগ করুন। তাদের বর্তমান ও প্রস্তাবিত বেতন নির্ধারণ করুন।
            </p>
          </div>
          
          <div className="bg-linear-to-r from-blue-50 to-white p-6 rounded-xl border border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Eye className="text-blue-600 h-6 w-6" />
              </div>
              <h4 className="font-bold text-gray-800">প্রিন্ট ও শেয়ার</h4>
            </div>
            <p className="text-gray-600 text-sm">
              তৈরি করা আবেদন প্রিন্ট করুন বা পিডিএফ হিসেবে ডাউনলোড করুন। প্রয়োজনমতো সংশোধন করুন।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}