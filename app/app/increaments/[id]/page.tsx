"use client";
import Firebase from "@/utils/firebase";
import { db } from "@/utils/firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";
import {
  ArrowLeft,
  Calendar,
  Edit2,
  FileSignature,
  FileText,
  Plus,
  Printer,
  Save,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";

type Person = {
  name: string;
  section: string;
  join_date: string;
  p_id: string;
  pre_salary: string;
  pro_salary: string;
};

type Increament = {
  name: string;
  header: string;
  person: Person[];
  footer: string;
  created_at: any;
};

export default function Increment() {
  const params = useParams();
  const router = useRouter();
  const increamentId = params.id as string;
  const [increament, setIncreament] = useState<Increament | null>(null);
  const [originalIncreament, setOriginalIncreament] =
    useState<Increament | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [newPerson, setNewPerson] = useState<Person>({
    name: "",
    section: "বিস্কুট",
    join_date: "",
    p_id: "",
    pre_salary: "",
    pro_salary: "",
  });

  // প্রিন্টের জন্য রেফ
  const contentRef = useRef<HTMLDivElement>(null);

  // প্রিন্টের আগে ফন্ট লোড করার ফাংশন
  const loadPrintFonts = async (): Promise<void> => {
    // ফন্ট আগে থেকেই লোড করা থাকলে রিটার্ন
    if (document.querySelector('link[href*="Tiro+Bangla"]')) {
      return;
    }

    return new Promise((resolve) => {
      const link = document.createElement("link");
      link.href =
        "https://fonts.googleapis.com/css2?family=Tiro+Bangla:wght@400;700&display=swap";
      link.rel = "stylesheet";
      link.onload = () => resolve();
      link.onerror = () => resolve(); // ফন্ট লোড ব্যর্থ হলেও প্রিন্ট চালিয়ে যাবে
      document.head.appendChild(link);
    });
  };

  // বাংলা সংখ্যা কনভার্টার ফাংশন
  const toBanglaNumber = (num: number | string): string => {
    const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    const numStr = num.toString();
    return numStr.replace(/\d/g, (digit) => banglaDigits[parseInt(digit)]);
  };

  // টাকার ফরম্যাট বাংলা সংখ্যায়
  const formatCurrencyBangla = (amount: string | number): string => {
    const num = typeof amount === "string" ? parseInt(amount || "0") : amount;
    const formatted = num.toLocaleString("bn-BD");
    return `৳ ${formatted}`;
  };

  // তারিখ বাংলা ফরম্যাটে
  const formatDateBangla = (timestamp: any) => {
    if (!timestamp) return "";

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const day = toBanglaNumber(date.getDate());
      const month = date.toLocaleDateString("bn-BD", { month: "long" });
      const year = toBanglaNumber(date.getFullYear());
      return `${day} ${month} ${year}`;
    } catch {
      return "";
    }
  };

  // যোগদানের তারিখ বাংলা ফরম্যাটে
  const formatJoinDateBangla = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const day = toBanglaNumber(date.getDate());
      const month = date.toLocaleDateString("bn-BD", { month: "long" });
      const year = toBanglaNumber(date.getFullYear());
      return `${day} ${month} ${year}`;
    } catch {
      return dateStr;
    }
  };

  // প্রিন্ট ফাংশন
  const print = useReactToPrint({
    contentRef,
    documentTitle: `বেতন_বৃদ্ধি_আবেদন_${increament?.name || "Document"}_${
      new Date().toISOString().split("T")[0]
    }`,
    pageStyle: `
      @import url('https://fonts.googleapis.com/css2?family=Tiro+Bangla:wght@400;700&display=swap');
      
      @media print {
        @page {
          size: A4 portrait;
          margin: 5mm 5mm;
        }
        * {
          color: black !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-size: 14px !important;
          line-height: 1.6 !important;
          font-family: 'Tiro Bangla', 'Siyam Rupali', 'Kalpurush', 'Arial Unicode MS', sans-serif !important;
          color: black !important;
        }
        .no-print {
          display: none !important;
        }
        .print-container {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          font-family: 'Tiro Bangla', 'Siyam Rupali', 'Kalpurush', 'Arial Unicode MS', sans-serif !important;
        }
        .bangla-text {
          font-family: 'Tiro Bangla', 'Siyam Rupali', 'Kalpurush', 'Arial Unicode MS', sans-serif !important;
          line-height: 1.8 !important;
          text-align: justify !important;
          color: black !important;
        }
        .print-table {
          width: 100% !important;
          border-collapse: collapse !important;
          font-family: 'Tiro Bangla', 'Siyam Rupali', 'Kalpurush', 'Arial Unicode MS', sans-serif !important;
          color: black !important;
          margin: 20px 0 !important;
          table-layout: fixed !important;
        }
        .print-table th, .print-table td {
          border: 1px solid #000 !important;
          padding: 4px 6px !important;
          text-align: center;
          font-size: 14px;
          color: black !important;
          font-family: 'Tiro Bangla', 'Siyam Rupali', 'Kalpurush', 'Arial Unicode MS', sans-serif !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          white-space: nowrap !important;
        }
        .print-table th {
          background-color: #f0f0f0 !important;
          font-weight: bold !important;
          padding: 6px !important;
          color: black !important;
        }
        .print-table tfoot td {
          font-weight: bold !important;
          background-color: #f8f8f8 !important;
        }
        .name-column {
          width: 25% !important;
          min-width: 150px !important;
          max-width: 200px !important;
          text-align: left !important;
          padding-left: 8px !important;
          white-space: normal !important;
          line-height: 1.3 !important;
        }
        .serial-column {
          width: 5% !important;
          min-width: 40px !important;
        }
        .section-column {
          width: 10% !important;
          min-width: 80px !important;
        }
        .id-column {
          width: 9% !important;
          min-width: 70px !important;
        }
        .date-column {
          width: 15% !important;
          min-width: 100px !important;
        }
        .salary-column {
          width: 12% !important;
          min-width: 100px !important;
        }
        .signature-section {
          margin-top: 60px !important;
          page-break-inside: avoid !important;
        }
        .signature-section div {
          text-align: center !important;
          margin: 0 auto !important;
        }
        .signature-section .border-t {
          margin-left: auto !important;
          margin-right: auto !important;
        }
      }
    `,
  });

  // ফন্ট লোড সহ প্রিন্ট হ্যান্ডলার
  const handlePrintWithFonts = () => {
    loadPrintFonts().then(() => {
      print();
    });
  };

  useEffect(() => {
    fetchData();
  }, [increamentId]);

  // Track changes
  useEffect(() => {
    if (increament && originalIncreament) {
      const isChanged =
        JSON.stringify(increament) !== JSON.stringify(originalIncreament);
      setHasChanges(isChanged);
    }
  }, [increament, originalIncreament]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await Firebase.getDocument("increaments", increamentId);
      if (data.exists()) {
        const incrementData = data.data() as Increament;
        const processedData = {
          ...incrementData,
          header: incrementData.header.replace(/\\n/g, "\n"),
          footer: incrementData.footer.replace(/\\n/g, "\n"),
        };
        setIncreament(processedData);
        setOriginalIncreament(processedData);
      }
    } catch (error) {
      console.error("Error fetching increment:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof Increament, value: string) => {
    if (!increament) return;
    setIncreament({ ...increament, [field]: value });
  };

  const saveChanges = async () => {
    if (!increament || !hasChanges) return;

    try {
      setSaving(true);
      const dataToSave = {
        ...increament,
        header: increament.header.replace(/\n/g, "\\n"),
        footer: increament.footer.replace(/\n/g, "\\n"),
      };

      const docRef = doc(db, "increaments", increamentId);
      await updateDoc(docRef, dataToSave);

      setOriginalIncreament(increament);
      setHasChanges(false);
      setEditMode(false);
      alert("পরিবর্তন সফলভাবে সংরক্ষিত হয়েছে!");
    } catch (error) {
      console.error("Error saving changes:", error);
      alert("সংরক্ষণে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setSaving(false);
    }
  };

  const cancelChanges = () => {
    if (originalIncreament) {
      setIncreament(originalIncreament);
      setHasChanges(false);
    }
    setEditMode(false);
  };

  const addPerson = () => {
    if (!increament || !newPerson.name.trim()) {
      alert("কর্মীর নাম লিখুন");
      return;
    }

    const updatedPersons = [...(increament.person || []), newPerson];
    setIncreament({ ...increament, person: updatedPersons });

    setNewPerson({
      name: "",
      section: newPerson.section,
      join_date: "",
      p_id: "",
      pre_salary: "",
      pro_salary: "",
    });
  };

  const removePerson = (index: number) => {
    if (!increament || !confirm("আপনি কি এই কর্মীকে মুছতে চান?")) return;
    const updatedPersons = [...(increament.person || [])];
    updatedPersons.splice(index, 1);
    setIncreament({ ...increament, person: updatedPersons });
  };

  const updatePersonField = (
    index: number,
    field: keyof Person,
    value: string
  ) => {
    if (!increament) return;
    const updatedPersons = [...(increament.person || [])];
    updatedPersons[index] = { ...updatedPersons[index], [field]: value };
    setIncreament({ ...increament, person: updatedPersons });
  };

  const deleteDocument = async () => {
    if (
      !confirm(
        "আপনি কি এই আবেদনটি মুছতে চান? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।"
      )
    )
      return;
    try {
      alert("আবেদন সফলভাবে মুছে ফেলা হয়েছে!");
      router.push("/app/increaments");
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("মুছতে সমস্যা হয়েছে।");
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">আবেদন লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!increament) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            আবেদন পাওয়া যায়নি
          </h1>
          <p className="text-gray-600">অনুরোধকৃত আবেদনটি সিস্টেমে নেই।</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-gray-50 p-4 md:p-6 font-(family-name:--font-tiro-bangla)">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8 no-print">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/app/increaments")}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="পেছনে যান"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2">
                  <FileSignature className="text-blue-600" />
                  {editMode ? (
                    <input
                      type="text"
                      value={increament.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg w-full md:w-96 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                      placeholder="আবেদনের নাম লিখুন"
                    />
                  ) : (
                    <span className="">{increament.name}</span>
                  )}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="">
                      তৈরি হয়েছে: {formatDate(increament.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    <span>{increament.person?.length || 0} জন কর্মী</span>
                  </div>
                  {saving && (
                    <span className="text-blue-600 font-medium">
                      সংরক্ষণ হচ্ছে...
                    </span>
                  )}
                  {hasChanges && (
                    <span className="text-amber-600 font-medium">
                      • অসংরক্ষিত পরিবর্তন
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {editMode ? (
                <>
                  <button
                    onClick={saveChanges}
                    disabled={!hasChanges || saving}
                    className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                      hasChanges && !saving
                        ? "bg-linear-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                        সংরক্ষণ...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        সংরক্ষণ করুন
                      </>
                    )}
                  </button>
                  <button
                    onClick={cancelChanges}
                    className="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    বাতিল করুন
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-5 py-2.5 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center gap-2"
                  >
                    <Edit2 className="w-5 h-5" />
                    সম্পাদনা করুন
                  </button>
                  <button
                    onClick={handlePrintWithFonts}
                    className="px-5 py-2.5 bg-linear-to-r from-green-600 to-green-700 text-white rounded-lg font-medium hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center gap-2"
                  >
                    <Printer className="w-5 h-5" />
                    প্রিন্ট করুন
                  </button>
                  <button
                    onClick={deleteDocument}
                    className="px-5 py-2.5 bg-linear-to-r from-red-100 to-red-200 text-red-700 rounded-lg font-medium hover:from-red-200 hover:to-red-300 transition-all duration-200 flex items-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    মুছুন
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          {editMode ? (
            /* EDIT MODE UI */
            <div className="space-y-8">
              {/* Document Header Edit */}
              <div className="bg-linear-to-r from-blue-50 to-white p-6 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-3">
                    <FileText className="text-blue-600" />
                    আবেদনের শীর্ষভাগ
                  </h2>
                  <button
                    onClick={() =>
                      updateField(
                        "header",
                        `বরাবর\nব্যাস্থাপনা পরিচালক\nএস এন্ড বি নাইস ফুড ভ্যালি লিঃ\n১১৬৩, জেরকাছাড়, মোহাম্মদ আলী বাজার, ফেনী সদর, ফেনী।\n\nবিষয়ঃ- বেতন বৃদ্ধির জন্য আবেদন।\n\nজনাব,\n\nআপনার সদয় আবগতির জন্য জানাচ্ছি যে, নিন্ম লিখিত শ্রমিকদের কর্মদক্ষতার ভিত্তিতে বেতন বৃদ্ধির সুপারিশ করছি।\n\n`
                      )
                    }
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    টেমপ্লেট ব্যবহার করুন
                  </button>
                </div>
                <textarea
                  value={increament.header}
                  onChange={(e) => updateField("header", e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y text-base"
                  placeholder="আবেদনের শীর্ষভাগ লিখুন..."
                />
              </div>

              {/* Add New Person Section */}
              <div className="bg-linear-to-r from-green-50 to-white p-6 rounded-xl border border-green-200">
                <div className="flex items-center gap-3 mb-6">
                  <UserPlus className="text-green-600" />
                  <h2 className="text-xl font-semibold text-gray-800">
                    নতুন কর্মী যোগ করুন
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      কর্মীর নাম
                    </label>
                    <input
                      type="text"
                      value={newPerson.name}
                      onChange={(e) =>
                        setNewPerson({ ...newPerson, name: e.target.value })
                      }
                      placeholder="পূর্ণ নাম লিখুন"
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      সেকশন
                    </label>
                    <select
                      value={newPerson.section}
                      onChange={(e) =>
                        setNewPerson({ ...newPerson, section: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    >
                      {[
                        "বিস্কুট",
                        "ওয়েফার",
                        "কেক",
                        "বেকারি-০১",
                        "চানাচুর",
                        "পানি এবং বেভা.",
                        "ডেইরি মিল্ক",
                        "নুডুলস",
                        "ভারমিসলি",
                        "স্টোর",
                        "ডিস্ট্রিবিউশিন",
                        "এডমিন",
                      ].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      কর্মী আইডি
                    </label>
                    <input
                      type="text"
                      value={newPerson.p_id}
                      onChange={(e) =>
                        setNewPerson({ ...newPerson, p_id: e.target.value })
                      }
                      placeholder="আইডি নম্বর"
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      যোগদানের তারিখ
                    </label>
                    <input
                      type="date"
                      value={newPerson.join_date}
                      onChange={(e) =>
                        setNewPerson({
                          ...newPerson,
                          join_date: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      বর্তমান বেতন
                    </label>
                    <input
                      type="number"
                      value={newPerson.pre_salary}
                      onChange={(e) =>
                        setNewPerson({
                          ...newPerson,
                          pre_salary: e.target.value,
                        })
                      }
                      placeholder="টাকায়"
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      প্রস্তাবিত বেতন
                    </label>
                    <input
                      type="number"
                      value={newPerson.pro_salary}
                      onChange={(e) =>
                        setNewPerson({
                          ...newPerson,
                          pro_salary: e.target.value,
                        })
                      }
                      placeholder="টাকায়"
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={addPerson}
                  disabled={!newPerson.name.trim()}
                  className="px-6 py-3 bg-linear-to-r from-green-600 to-green-700 text-white font-medium rounded-lg hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  কর্মী যোগ করুন
                </button>
              </div>

              {/* Persons List Edit */}
              {increament.person && increament.person.length > 0 ? (
                <div className="bg-linear-to-r from-gray-50 to-white p-6 rounded-xl border border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-3">
                    <Users className="text-gray-600" />
                    কর্মীদের তালিকা ({increament.person.length} জন)
                  </h2>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            ক্রমিক
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            নাম
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            সেকশন
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            আইডি
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            যোগদানের তারিখ
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            বর্তমান বেতন
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            প্রস্তাবিত বেতন
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            অপশন
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {increament.person.map((p, i) => (
                          <tr
                            key={i}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {i + 1}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <input
                                type="text"
                                value={p.name}
                                onChange={(e) =>
                                  updatePersonField(i, "name", e.target.value)
                                }
                                className="px-2 py-1.5 border border-gray-300 rounded w-full focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <select
                                value={p.section}
                                onChange={(e) =>
                                  updatePersonField(
                                    i,
                                    "section",
                                    e.target.value
                                  )
                                }
                                className="px-2 py-1.5 border border-gray-300 rounded w-full focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              >
                                {["বিস্কুট", "ওয়েফার", "কেক"].map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <input
                                type="text"
                                value={p.p_id}
                                onChange={(e) =>
                                  updatePersonField(i, "p_id", e.target.value)
                                }
                                className="px-2 py-1.5 border border-gray-300 rounded w-full focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <input
                                type="date"
                                value={p.join_date}
                                onChange={(e) =>
                                  updatePersonField(
                                    i,
                                    "join_date",
                                    e.target.value
                                  )
                                }
                                className="px-2 py-1.5 border border-gray-300 rounded w-full focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <input
                                type="number"
                                value={p.pre_salary}
                                onChange={(e) =>
                                  updatePersonField(
                                    i,
                                    "pre_salary",
                                    e.target.value
                                  )
                                }
                                className="px-2 py-1.5 border border-gray-300 rounded w-full focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <input
                                type="number"
                                value={p.pro_salary}
                                onChange={(e) =>
                                  updatePersonField(
                                    i,
                                    "pro_salary",
                                    e.target.value
                                  )
                                }
                                className="px-2 py-1.5 border border-gray-300 rounded w-full focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <button
                                onClick={() => removePerson(i)}
                                className="text-red-600 hover:text-red-800 flex items-center gap-1 p-2 hover:bg-red-50 rounded"
                                title="মুছুন"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-xl">
                  <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">এখনও কোন কর্মী যোগ করা হয়নি</p>
                </div>
              )}

              {/* Document Footer Edit */}
              <div className="bg-linear-to-r from-purple-50 to-white p-6 rounded-xl border border-purple-200">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-3">
                    <FileText className="text-purple-600" />
                    আবেদনের সমাপনী
                  </h2>
                  <button
                    onClick={() =>
                      updateField(
                        "footer",
                        `উপরে উল্লেখিত শ্রমিকদের বেতন বৃদ্ধি করার অনুমতি দিয়ে শ্রমিকদের কাজে উৎসাহিত করার জন্য আপনার সদয় আনুমতি প্রার্থনা করছি।\n\nনিবেদক\n\n\nমোহাম্মদ হাবিবুর রহমান\nব্যাবস্থাপক কারখানা`
                      )
                    }
                    className="text-sm text-purple-600 hover:text-purple-800"
                  >
                    টেমপ্লেট ব্যবহার করুন
                  </button>
                </div>
                <textarea
                  value={increament.footer}
                  onChange={(e) => updateField("footer", e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all resize-y text-base"
                  placeholder="আবেদনের সমাপনী লিখুন..."
                />
              </div>
            </div>
          ) : (
            /* PREVIEW MODE UI (Print View) */
            <div ref={contentRef} className="print-container">
              {/* Tiro Bangla ফন্ট লোড করার জন্য লিংক */}

              {/* প্রিন্ট হেডার */}
              <div className="hidden print:block mb-8 print:mb-0">
                <div className="text-center">
                  {/* <h1 className="text-2xl font-bold mb-2">
                    বেতন বৃদ্ধির জন্য আবেদন
                  </h1> */}
                  <div className="flex justify-between items-start mt-6">
                    <div className="text-left">
                      <p className="text-sm">
                        {/* তারিখ: {formatDateBangla(increament.created_at)} */}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        নথি নং: {increamentId.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>
                <hr className="my-2 border-t-2 border-black" />
              </div>

              {/* Header Content */}
              <div className="mb-8 print:mb-4">
                <div className="whitespace-pre-line text-gray-800 text-base leading-relaxed">
                  <p>তারিখ: {formatDateBangla(new Date())}</p>
                  {increament.header}
                </div>
              </div>

              {/* Persons Table */}
              {increament.person && increament.person.length > 0 ? (
                <div className="mb-8 print:mb-0 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-300 print-table">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-center font-bold border border-gray-300 serial-column">
                          ক্র. নং
                        </th>
                        <th className="px-4 py-3 text-center font-bold border border-gray-300 name-column">
                          কর্মীর নাম
                        </th>
                        <th className="px-4 py-3 text-center font-bold border border-gray-300 section-column">
                          সেকশন
                        </th>
                        <th className="px-4 py-3 text-center font-bold border border-gray-300 id-column">
                          আইডি নং
                        </th>
                        <th className="px-4 py-3 text-center font-bold border border-gray-300 date-column">
                          যোগদানের তারিখ
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-bold border border-gray-300 salary-column">
                          বর্তমান বেতন
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-bold border border-gray-300 salary-column">
                          প্রস্তাবিত বেতন
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {increament.person.map((p, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3 text-center border border-gray-300 serial-column">
                            {toBanglaNumber(i + 1)}
                          </td>
                          <td className="px-4 py-3 border border-gray-300 font-medium name-column">
                            {p.name}
                          </td>
                          <td className="px-4 py-3 text-center border border-gray-300 section-column">
                            {p.section}
                          </td>
                          <td className="px-4 py-3 text-center border border-gray-300 id-column">
                            {p.p_id}
                          </td>
                          <td className="px-4 py-3 text-center border border-gray-300 date-column">
                            {formatJoinDateBangla(p.join_date)}
                          </td>
                          <td className="px-4 py-3 text-center border border-gray-300 salary-column">
                            {formatCurrencyBangla(p.pre_salary)}
                          </td>
                          <td className="px-4 py-3 text-center border border-gray-300 salary-column">
                            {formatCurrencyBangla(p.pro_salary)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100">
                        <td
                          colSpan={5}
                          className="px-4 py-3 text-sm text-right font-bold border border-gray-300"
                        >
                          মোট:
                        </td>
                        <td className="px-4 py-3 text-sm text-center font-bold border border-gray-300 salary-column">
                          {formatCurrencyBangla(
                            increament.person.reduce(
                              (sum, p) => sum + parseInt(p.pre_salary || "0"),
                              0
                            )
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-center font-bold border border-gray-300 salary-column">
                          {formatCurrencyBangla(
                            increament.person.reduce(
                              (sum, p) => sum + parseInt(p.pro_salary || "0"),
                              0
                            )
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="mb-8 p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">কোন কর্মী যোগ করা হয়নি</p>
                </div>
              )}

              {/* Footer Content */}
              <div className="mt-8 print:mt-4">
                <div className="whitespace-pre-line text-gray-800 text-base leading-relaxed">
                  {increament.footer}
                </div>
                {/* <div className="mt-6 text-right">
                  <p className="text-base">
                    তারিখ: {formatDateBangla(new Date())}
                  </p>
                </div> */}
              </div>

              {/* Signature Section */}
              <div className="mt-20 signature-section">
                <div className="flex justify-center">
                  <div className="text-center">
                    <div className="border-t border-black w-64 mt-16 pt-2 mx-auto"></div>
                    <p className="text-sm mt-2">(মোঃ সোলায়মান)</p>
                    <p className="text-xs">ব্যবস্থাপনা পরিচালক</p>
                    <p className="text-xs">এস এন্ড বি নাইস ফুড ভ্যালি লিঃ</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Changes Sticky Footer */}
          {editMode && hasChanges && (
            <div className="sticky bottom-6 mt-8 p-4 bg-linear-to-r from-blue-50 to-white border-2 border-blue-300 rounded-xl shadow-lg no-print">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                  <div>
                    <span className="font-semibold text-blue-800">
                      আপনার অসংরক্ষিত পরিবর্তন আছে
                    </span>
                    <p className="text-sm text-gray-600">
                      দয়া করে পরিবর্তনগুলি সংরক্ষণ করুন অথবা বাতিল করুন
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={cancelChanges}
                    className="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    বাতিল করুন
                  </button>
                  <button
                    onClick={saveChanges}
                    disabled={saving}
                    className="px-5 py-2.5 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* মোবাইল প্রিন্ট বাটন */}
      <div className="fixed bottom-4 right-4 z-50 md:hidden no-print">
        <button
          onClick={handlePrintWithFonts}
          className="flex items-center justify-center w-14 h-14 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full shadow-lg shadow-blue-500/50"
        >
          <Printer className="text-2xl" />
        </button>
      </div>
    </div>
  );
}
