import {
  CalendarDays,
  ChartColumn,
  CookingPot,
  House,
  Settings,
  ShoppingBasket,
  type LucideIcon,
} from "lucide-react";

export interface AppTab {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const APP_TABS: AppTab[] = [
  { href: "/", label: "Hôm nay", icon: House },
  { href: "/week", label: "Lịch tuần", icon: CalendarDays },
  { href: "/foods", label: "Món ăn", icon: CookingPot },
  { href: "/shopping", label: "Đi chợ", icon: ShoppingBasket },
  { href: "/analytics", label: "Thống kê", icon: ChartColumn },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

export function isTabActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
