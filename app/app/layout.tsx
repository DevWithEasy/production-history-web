"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Firebase from "../../utils/firebase";
import { useEffect, useState } from "react";

interface Section {
  id: string;
  name: string;
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    Firebase.getDocuments<Section>("sections").then(setSections);
  }, []);

  const isProduction = pathname.startsWith("/app/production");
  const isManpower = pathname.startsWith("/app/manpower");

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 👉 LEFT SIDEBAR */}
      <div className="w-2/12 space-y-2 overflow-y-auto border-r p-3">
        <Link href="/app" className="block">Home</Link>
        <Link href="/app/production" className="block">Production</Link>

        {isProduction &&
          sections.map((section) => (
            <Link
              key={section.id}
              href={`/app/production/${section.id}`}
              className="block ml-4"
            >
              {section.name}
            </Link>
          ))}

        <Link href="/app/manpower" className="block">ManPower</Link>

        {isManpower && (
          <Link href="/app/manpower/update" className="block ml-4">
            Update
          </Link>
        )}
        <Link href="/app/products" className="block">Products</Link>
        <Link href="/app/products/add" className="block">Add Product</Link>
        <Link href="/app/products/add-period" className="block">Add Period</Link>
      </div>

      {/* 👉 RIGHT CONTENT */}
      <div className="w-10/12 overflow-y-auto p-4">
        {children}
      </div>
    </div>
  );
}
