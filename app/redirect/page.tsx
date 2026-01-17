"use client";

import Firebase from "@/utils/firebase";
import {
  CheckCircle,
  Fingerprint,
  Key,
  Loader2,
  Lock,
  LogIn,
  Shield,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { KeyboardEvent, useEffect, useRef, useState } from "react";

interface PinDocument {
  id: string;
  name: string;
  pin: string;
}

export default function RedirectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pin, setPin] = useState<string[]>(["", "", "", ""]);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    checkStoredPin();
  }, []);

  const checkStoredPin = async () => {
    try {
      const storedPin = localStorage.getItem("pin_key");

      if (!storedPin) {
        setShowPinInput(true);
        setLoading(false);
        return;
      }

      const pins = await Firebase.getDocuments<PinDocument>("pins");
      const matchedPin = pins.find((pinDoc) => pinDoc.pin === storedPin);

      if (matchedPin) {
        setSuccess(true);
        setTimeout(() => {
          router.replace("/app");
        }, 1000);
      } else {
        localStorage.removeItem("pin_key");
        setShowPinInput(true);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error:", error);
      setShowPinInput(true);
      setLoading(false);
    }
  };

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError("");

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyPin = async () => {
    const pinString = pin.join("");

    if (pinString.length !== 4) {
      setError("দয়া করে ৪ ডিজিটের পিন দিন");
      return;
    }

    setVerifying(true);

    try {
      const pins = await Firebase.getDocuments<PinDocument>("pins");
      const matchedPin = pins.find((pinDoc) => pinDoc.pin === pinString);

      if (matchedPin) {
        localStorage.setItem("pin_key", pinString);
        setSuccess(true);
        setTimeout(() => {
          router.replace("/app");
        }, 1500);
      } else {
        setError("ভুল পিন। আবার চেষ্টা করুন");
        setPin(["", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      setError("পিন চেক করতে সমস্যা হয়েছে");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-gray-50 flex items-center justify-center p-4 font-(family-name:--font-tiro-bangla)">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 mx-auto rounded-full bg-linear-to-r from-blue-500 to-blue-600 animate-pulse flex items-center justify-center">
              <Shield className="h-10 w-10 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              চেক করা হচ্ছে
            </h2>
            <p className="text-gray-600">সেভ করা পিন যাচাই করা হচ্ছে...</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">লোড হচ্ছে</span>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-linear-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4 font-(family-name:--font-tiro-bangla)">
        <div className="text-center space-y-6 max-w-md">
          <div className="relative">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -top-1 -right-1">
              <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                ✓
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              সফলভাবে প্রবেশ!
            </h2>
            <p className="text-gray-600">
              পিন সঠিক। অ্যাপে রিডাইরেক্ট করা হচ্ছে...
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-green-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">রিডাইরেক্ট হচ্ছে</span>
          </div>
          <div className="text-xs text-green-500 bg-green-100 p-3 rounded-lg">
            ⓘ এই পিনটি আপনার ডিভাইসে সংরক্ষণ করা হয়েছে
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-gray-50 p-4 md:p-6 font-(family-name:--font-tiro-bangla)">
      <div className="max-w-md mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 rounded-xl">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                সুরক্ষা প্রবেশ
              </h1>
              <p className="text-gray-600">
                প্রোডাকশন সিস্টেমে প্রবেশ করতে পিন দিন
              </p>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <div className="space-y-8">
            {/* PIN Input Section */}
            <div className="space-y-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-gray-600 mb-4">
                  <Key className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">
                    ৪ ডিজিট সুরক্ষা পিন
                  </span>
                </div>

                {/* PIN Boxes */}
                <div className="flex justify-center gap-4 mb-6">
                  {pin.map((digit, index) => (
                    <div key={index} className="relative">
                      <input
                        ref={(el) => {
                          inputRefs.current[index] = el;
                        }}
                        type="password"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handlePinChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="w-16 h-16 text-center text-2xl font-bold bg-gray-50 border-2 border-gray-300 rounded-xl text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                        autoFocus={index === 0}
                        disabled={verifying}
                      />
                      {digit && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Fingerprint className="h-6 w-6 text-blue-500" />
                        </div>
                      )}
                      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center justify-center gap-2 text-red-500 bg-red-50 border border-red-200 rounded-lg p-3 mb-4 animate-pulse">
                    <Shield className="h-5 w-5" />
                    <span className="font-[family-name:var(--font-tiro-bangla)]">
                      {error}
                    </span>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                onClick={verifyPin}
                disabled={verifying || pin.some((d) => !d)}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-3 ${
                  verifying || pin.some((d) => !d)
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:shadow-lg"
                }`}
              >
                {verifying ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    যাচাই করা হচ্ছে...
                  </>
                ) : (
                  <>
                    <LogIn className="h-6 w-6" />
                    প্রবেশ করুন
                  </>
                )}
              </button>
            </div>

            {/* Information */}
            <div className="bg-gradient-to-r from-blue-50 to-gray-50 p-4 rounded-xl border border-blue-100">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-lg mt-0.5">
                  <Key className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">
                    পিন সম্পর্কে তথ্য
                  </h4>
                  <p className="text-gray-600 text-sm">
                    পিন একবার সঠিকভাবে দিলে এটি আপনার ডিভাইসে সংরক্ষণ হবে।
                    পরবর্তীতে অটোমেটিকভাবে লগইন হবে।
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-blue-50 to-white p-4 rounded-xl border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Lock className="h-4 w-4 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-800">সুরক্ষিত</h4>
            </div>
            <p className="text-gray-600 text-xs">
              পিন শুধু আপনার ডিভাইসে সংরক্ষণ হবে
            </p>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-white p-4 rounded-xl border border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-800">অটো লগইন</h4>
            </div>
            <p className="text-gray-600 text-xs">পরবর্তীতে অটোমেটিক প্রবেশ</p>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-white p-4 rounded-xl border border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Fingerprint className="h-4 w-4 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-800">ভেরিফাইড</h4>
            </div>
            <p className="text-gray-600 text-xs">
              ডাটাবেজের সাথে ম্যাচ করা হবে
            </p>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            ⓘ পিন ভুলে গেলে অ্যাডমিনের সাথে যোগাযোগ করুন
          </p>
        </div>
      </div>
    </div>
  );
}
