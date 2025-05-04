"use client";
import { useState } from "react";

import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

export default function PropertiesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [selected, setSelected] = useState(pathname.split("/").pop() || "all");

  const handleSelect = (value: string) => {
    setSelected(value);
    router.push(`/properties?filter=${value}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Properties</h1>
      <div className="flex gap-4">
        <button
          onClick={() => handleSelect("all")}
          className={`${
            selected === "all" ? "bg-blue-500 text-white" : "bg-gray-200"
          } px-4 py-2 rounded`}
        >
          All
        </button>
        <button
          onClick={() => handleSelect("sold")}
          className={`${
            selected === "sold" ? "bg-blue-500 text-white" : "bg-gray-200"
          } px-4 py-2 rounded`}
        >
          Sold
        </button>
        <button
          onClick={() => handleSelect("rented")}
          className={`${
            selected === "rented" ? "bg-blue-500 text-white" : "bg-gray-200"
          } px-4 py-2 rounded`}
        >
          Rented
        </button>
      </div>
      <div className="flex flex-col gap-4">
        {selected === "all" && <div>All Properties</div>}
        {selected === "sold" && <div>Sold Properties</div>}
        {selected === "rented" && <div>Rented Properties</div>}
      </div>
    </div>
  );
}
