import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import SidebarItem from "./SidebarItem";
import { MenuItem } from "./BusinessSidebar";
import { usePathname } from "next/navigation";

export default function SidebarSection({
  icon: Icon,
  label,
  collapsed,
  items,
  url,
  onClick,
}: MenuItem) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Determine if the section itself is active
  const isSelfActive = url ? pathname === url : false;

  // Determine if any child item is active
  const isChildActive = items?.some(
    (child) => child.url && pathname === child.url
  );

  const isActive = isSelfActive || isChildActive;

  // Automatically expand the section if a child is active
  useEffect(() => {
    if (isChildActive) {
      setOpen(true);
    }
  }, [isChildActive]);

  const baseClasses =
    "flex items-center gap-3 px-3 py-2 rounded-md transition-colors";
  const activeClasses = "bg-gray-300 text-blue-600 font-semibold";
  const inactiveClasses = "hover:bg-gray-200 text-gray-700";

  return (
    <li className="relative group">
      {/* Parent Button */}
      <button
        onClick={() => {
          if (items && items.length > 0) {
            setOpen(!open);
          } else if (onClick) {
            onClick();
          }
        }}
        className={`flex items-center justify-between w-full p-2 rounded-md focus:outline-none transition-colors ${
          isActive ? activeClasses : inactiveClasses
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5" />
          <span
            className={`transition-all duration-300 origin-left ${
              collapsed
                ? "opacity-0 scale-0 w-0"
                : "opacity-100 scale-100 w-auto"
            }`}
          >
            {label}
          </span>
        </div>
        {!collapsed &&
          items &&
          items.length > 0 &&
          (open ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          ))}
      </button>

      {/* Dropdown-style child list */}
      {items && items.length > 0 && (
        <ul
          className={`transition-all duration-300 ease-in-out ${
            collapsed
              ? `
              absolute left-full top-0 ml-2 z-50 w-48 bg-white shadow-xl rounded-lg py-2
              opacity-0 scale-95 pointer-events-none hidden
              group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto
              group-focus-within:opacity-100 group-focus-within:scale-100 group-focus-within:pointer-events-auto
            `
              : `
              mt-1 ml-6 space-y-1 ${
                open
                  ? "max-h-[500px] opacity-100"
                  : "max-h-0 opacity-0 overflow-hidden"
              }
            `
          }`}
        >
          {items.map((child, i) => {
            const isActiveChild = child.url ? pathname === child.url : false;
            return (
              <SidebarItem
                key={i}
                icon={child.icon}
                label={child.label}
                url={child.url}
                collapsed={false} // always show inside dropdown
                onClick={child.onClick}
                baseClasses={baseClasses}
                activeClasses={activeClasses}
                inactiveClasses={inactiveClasses}
                isActive={isActiveChild}
              />
            );
          })}
        </ul>
      )}
    </li>
  );
}
