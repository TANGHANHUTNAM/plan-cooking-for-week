"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const OPTIONS = [
  { value: "light", label: "Sáng", icon: Sun },
  { value: "dark", label: "Tối", icon: Moon },
  { value: "system", label: "Theo máy", icon: Monitor },
] as const;

const emptySubscribe = () => () => {};
/** false during SSR, true after mount — avoids hydration mismatch when reading the theme from localStorage. */
function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const current = mounted ? (theme ?? "system") : "system";

  return (
    <ToggleGroup
      type="single"
      value={current}
      onValueChange={(v) => v && setTheme(v)}
      variant="outline"
      spacing={0}
      aria-label="Chế độ giao diện"
      className="h-10 w-full"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <ToggleGroupItem
          key={value}
          value={value}
          size="lg"
          className="h-10 flex-1 gap-1.5 px-3 text-[13px] font-medium data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground"
        >
          <Icon />
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
