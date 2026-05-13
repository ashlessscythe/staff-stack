"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Label } from "@/components/ui/label";
import type { AppTheme } from "@/lib/ui-theme";
import { APP_THEMES } from "@/lib/ui-theme";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={className}>
        <div className="h-10 w-[140px] rounded-md border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Label htmlFor="theme-select" className="sr-only">
        Theme
      </Label>
      <select
        id="theme-select"
        value={(theme as AppTheme) ?? "corporate"}
        onChange={(e) => setTheme(e.target.value)}
        className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
      >
        {APP_THEMES.map((t) => (
          <option key={t} value={t}>
            {t === "corporate" ? "Corporate" : t === "day" ? "Day" : "Night"}
          </option>
        ))}
      </select>
    </div>
  );
}
