"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Label } from "@/components/ui/label";
import type { AppTheme } from "@/lib/ui-theme";
import { APP_THEMES, APP_THEME_LABELS } from "@/lib/ui-theme";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={className}>
        <div className="h-10 w-[140px] rounded-md border border-[color:var(--ss-border)] bg-[color:var(--ss-muted)]/40" />
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
        className="h-10 rounded-md border border-[color:var(--ss-border)] bg-[color:var(--ss-surface)] px-3 text-sm text-[color:var(--ss-foreground)] shadow-sm transition-colors hover:border-[color:var(--ss-accent)]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ss-accent)]"
      >
        {APP_THEMES.map((t) => (
          <option key={t} value={t}>
            {APP_THEME_LABELS[t]}
          </option>
        ))}
      </select>
    </div>
  );
}
