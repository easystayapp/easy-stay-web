import Link from "next/link";

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  url?: string;
  collapsed: boolean;
  onClick?: () => void;
  baseClasses?: string;
  activeClasses?: string;
  inactiveClasses?: string;
  isActive?: boolean;
}

export default function SidebarItem({
  icon: Icon,
  label,
  url,
  collapsed,
  onClick,
  baseClasses = "flex items-center gap-3 p-2 rounded-md",
  activeClasses = "transition-colors bg-gray-300 text-blue-600 font-semibold",
  inactiveClasses = "text-gray-700 hover:bg-gray-200",
  isActive = false,
}: SidebarItemProps) {
  console.log("SidebarItem", { label, url, collapsed, isActive });

  return (
    <li onClick={onClick}>
      <Link
        href={url ? url : "#"}
        className={`${baseClasses} ${
          isActive ? activeClasses : inactiveClasses
        }`}
      >
        <Icon className="w-5 h-5" />
        <span
          className={`transition-all duration-300 origin-left ${
            collapsed
              ? "opacity-0 scale-0 w-0 hidden"
              : "opacity-100 scale-100 w-auto"
          }`}
        >
          {label}
        </span>
      </Link>
    </li>
  );
}
