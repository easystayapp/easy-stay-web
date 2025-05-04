import {
  Home,
  Settings,
  Package,
  ChevronRightIcon,
  ChevronLeftIcon,
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import SidebarItem from "./SidebarItem";
import SidebarSection from "./SidebarSection";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export interface MenuItem {
  label: string;
  icon: React.ElementType;
  url?: string;
  collapsed: boolean;
  items?: MenuItem[];
  onClick?: () => void;
}

export default function BusinessSidebar() {
  const { sidebarOpen, closeSidebar, sidebarCollapsed, toggleCollapse } =
    useUIStore();

  const [menus, setMenus] = useState<MenuItem[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    // Fetch menus from an API or any other source if needed
    const fetchedMenus: MenuItem[] = [
      {
        label: "Dashboard",
        icon: Home,
        url: "/",
        collapsed: sidebarCollapsed,
      },
      {
        label: "Customers",
        icon: Package,
        items: [
          {
            label: "All Customers",
            url: "/customers",
            icon: Package,
            collapsed: sidebarCollapsed,
          },
          {
            label: "Add Customer",
            url: "/customers/add",
            icon: Package,
            collapsed: sidebarCollapsed,
          },
        ],
        collapsed: sidebarCollapsed,
        onClick: toggleCollapse,
      },
      {
        label: "Properties",
        icon: Package,
        items: [
          {
            label: "All Properties",
            url: "/properties",
            icon: Package,
            collapsed: sidebarCollapsed,
          },
          {
            label: "Add Property",
            url: "/properties/add",
            icon: Package,
            collapsed: sidebarCollapsed,
          },
        ],
        collapsed: sidebarCollapsed,
        onClick: toggleCollapse,
      },
      {
        label: "Rooms",
        icon: Package,
        items: [
          {
            label: "All Rooms",
            url: "/rooms",
            icon: Package,
            collapsed: sidebarCollapsed,
          },
          {
            label: "Add Property",
            url: "/rooms/add",
            icon: Package,
            collapsed: sidebarCollapsed,
          },
        ],
        collapsed: sidebarCollapsed,
        onClick: toggleCollapse,
      },
      {
        label: "Settings",
        icon: Settings,
        url: "/settings",
        collapsed: sidebarCollapsed,
      },
    ];
    setMenus(fetchedMenus);
  }, [sidebarCollapsed, toggleCollapse]);

  return (
    <div
      className={`fixed inset-y-0 left-0 bg-gray-100 shadow-lg transform 
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:relative md:translate-x-0 transition-transform duration-300 z-40
        ${sidebarCollapsed ? "w-20" : "w-54"}`}
    >
      {/* Collapse Toggle */}
      <div className="flex justify-end p-2">
        <button onClick={toggleCollapse} aria-label="Toggle Collapse">
          {sidebarCollapsed ? (
            <ChevronRightIcon size={20} />
          ) : (
            <ChevronLeftIcon size={20} />
          )}
        </button>
      </div>

      {/* Sidebar Menu */}
      <ul className="menu">
        {menus.map((menu, index) => {
          const isActive = menu.url ? pathname === menu.url : false;

          if (menu.items) {
            return (
              <SidebarSection
                key={index}
                icon={menu.icon}
                label={menu.label}
                collapsed={sidebarCollapsed}
                items={menu.items.map((item) => ({
                  ...item,
                  onClick: closeSidebar,
                }))}
                url={menu.url}
                onClick={menu.onClick}
              />
            );
          } else {
            return (
              <SidebarItem
                key={index}
                icon={menu.icon}
                label={menu.label}
                url={menu.url || ""}
                collapsed={sidebarCollapsed}
                onClick={closeSidebar}
                isActive={isActive}
              />
            );
          }
        })}
      </ul>
    </div>
  );
}
