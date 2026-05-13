"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useEffect } from "react";

import { APP_THEMES } from "@/lib/ui-theme";

function DarkClassSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;
    const root = document.documentElement;
    if (resolvedTheme === "night") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [resolvedTheme]);

  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="corporate"
      themes={[...APP_THEMES]}
      enableSystem={false}
      storageKey="staffstack-ui"
      disableTransitionOnChange
    >
      <DarkClassSync />
      {children}
    </NextThemesProvider>
  );
}
