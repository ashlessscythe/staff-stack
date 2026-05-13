"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

import type { AppTheme } from "@/lib/ui-theme";

/**
 * Applies `Tenant.settings.theme` once per tab session when visiting a tenant slug,
 * so returning visitors keep a manual override from the header toggle.
 */
export function TenantThemeSync({ tenantSlug, hint }: { tenantSlug: string; hint: AppTheme }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    const k = `ss-theme-initial:${tenantSlug}`;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(k)) return;
    setTheme(hint);
    sessionStorage.setItem(k, "1");
  }, [tenantSlug, hint, setTheme]);

  return null;
}
